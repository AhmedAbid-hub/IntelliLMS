"""Private profile images: decode and normalize uploads, never serve source bytes."""
from io import BytesIO
import logging
import uuid
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from django.core.files.base import ContentFile
from django.db import transaction
from django.http import HttpResponse, Http404
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import User
from .contracts import IdentityResult
from .auth import identity

logger = logging.getLogger(__name__)


class AvatarInput(serializers.Serializer):
    image = serializers.FileField()


def normalized_image(upload):
    if upload.size > 4 * 1024 * 1024:
        raise ValidationError({'image': 'Choose an image no larger than 4 MB.'})
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(upload) as source:
                if source.format not in ['JPEG', 'PNG', 'WEBP'] or getattr(source, 'is_animated', False):
                    raise ValueError('Unsupported image')
                if source.width * source.height > 4_000_000:
                    raise ValueError('Image too large')
                source.load()
                picture = ImageOps.exif_transpose(source).convert('RGB')
                picture = ImageOps.fit(picture, (256, 256), method=Image.Resampling.LANCZOS)
                output = BytesIO()
                # Re-encoding discards filenames, EXIF/GPS and embedded source payloads.
                picture.save(output, format='JPEG', quality=85)
                return ContentFile(output.getvalue())
    except (OSError, ValueError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValidationError({'image': 'Use a valid, non-animated JPEG, PNG or WebP image of at most 4 million pixels.'})


def avatar_response(user):
    if not user.avatar:
        raise Http404('No profile picture.')
    try:
        # Normalized 256px images are small. Close before returning so concurrent
        # replacement can remove the previous file on Windows as well as POSIX.
        with user.avatar.open('rb') as stored:
            response = HttpResponse(stored.read(), content_type='image/jpeg')
    except FileNotFoundError:
        raise Http404('No profile picture.')
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    response['Vary'] = 'Cookie'
    return response


def remove_file(storage, name):
    if name:
        try:
            storage.delete(name)
        except OSError:
            logger.warning('A replaced profile picture could not be removed from storage.')


@extend_schema(methods=['GET'], responses={(200, 'image/jpeg'): OpenApiTypes.BINARY})
@extend_schema(methods=['PUT'], request=AvatarInput, responses=IdentityResult)
@extend_schema(methods=['DELETE'], request=None, responses=IdentityResult)
@api_view(['GET', 'PUT', 'DELETE'])
@parser_classes([MultiPartParser, FormParser])
def avatar(request):
    if request.method == 'GET':
        return avatar_response(request.user)
    content = None
    if request.method == 'PUT':
        payload = AvatarInput(data=request.data)
        payload.is_valid(raise_exception=True)
        content = normalized_image(payload.validated_data['image'])
    saved_name = None
    storage = User._meta.get_field('avatar').storage
    try:
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            old_name = user.avatar.name
            if content is not None:
                saved_name = storage.save(f'avatars/{uuid.uuid4().hex}.jpg', content)
            user.avatar = saved_name or ''
            user.save(update_fields=['avatar'])
            transaction.on_commit(lambda: remove_file(storage, old_name))
            request.user = user
    except Exception:
        remove_file(storage, saved_name)
        raise
    return Response(identity(request))
