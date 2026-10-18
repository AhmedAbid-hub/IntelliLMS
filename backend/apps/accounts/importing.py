"""Validate bounded account imports before any account or invitation is created."""
import csv
import io
import secrets
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from apps.academics.models import Unit
from apps.insights.models import Audit
from .invitations import send_invitation
from .contracts import CsvImportInput, payload
from .models import Institute, Membership, User
from .scope import Scope


def import_people(request, serializer_class):
    scope = Scope(request)
    scope.require('admin')
    if scope.role == 'superadmin':
        raise PermissionDenied('Student and teacher provisioning belongs to Institute Admin.')
    Institute.objects.select_for_update().get(pk=scope.institute.pk)
    values = payload(CsvImportInput, request.data)
    upload = values['file']
    if not upload.name.lower().endswith('.csv') or upload.size > 1024 * 1024:
        raise ValidationError('Upload a UTF-8 CSV file up to 1 MB.')
    try:
        reader = csv.DictReader(io.StringIO(upload.read().decode('utf-8-sig')))
        if not {'username', 'email', 'role'}.issubset(reader.fieldnames or []):
            raise ValidationError('CSV requires username,email,role headers. Optional: first_name,unit,display_name,student_identifier,section.')
        rows = list(reader)
    except (UnicodeDecodeError, csv.Error):
        raise ValidationError('Invalid UTF-8 CSV.')
    if not 1 <= len(rows) <= 500:
        raise ValidationError('CSV must contain 1–500 rows.')
    unit_names = {(row.get('unit') or '').strip() for row in rows}
    units = {unit.name: unit for unit in Unit.objects.filter(institute=scope.institute, name__in=unit_names)}
    seen_users, seen_emails, seen_ids = set(), set(), set()
    errors, validated, preview = [], [], []
    for number, row in enumerate(rows, 2):
        text = lambda key: (row.get(key) or '').strip()
        username, email, role = text('username'), text('email').lower(), text('role')
        reasons = []
        try:
            User.username_validator(username)
            if not username or len(username) > 150:
                raise DjangoValidationError('Invalid username')
        except DjangoValidationError:
            reasons.append('Invalid username (1–150 letters, digits or @/./+/-/_).')
        if username in seen_users or User.objects.filter(username=username).exists():
            reasons.append('Duplicate or existing username.')
        try:
            validate_email(email)
            if len(email) > 254:
                raise DjangoValidationError('Email too long')
        except DjangoValidationError:
            reasons.append('Invalid email.')
        if email in seen_emails or User.objects.filter(email__iexact=email).exists():
            reasons.append('Duplicate or existing email.')
        if role not in ['teacher', 'student']:
            reasons.append('Role must be teacher or student.')
        unit_name, first_name, identifier = text('unit'), text('first_name'), text('student_identifier')
        unit = units.get(unit_name)
        if unit_name and not unit:
            reasons.append('Unknown academic unit in this institute.')
        if len(first_name) > 150:
            reasons.append('First name exceeds 150 characters.')
        if identifier and identifier in seen_ids:
            reasons.append('Duplicate student ID in this CSV.')
        data = {'role': role, 'unit': str(unit.pk) if unit else None, 'display_name': text('display_name'), 'student_identifier': identifier, 'section': text('section') or None}
        serializer = serializer_class(data=data, context={'request': request})
        if role in ['teacher', 'student'] and not serializer.is_valid():
            reasons.extend(f'{key}: {" ".join(str(item) for item in detail)}' for key, detail in serializer.errors.items())
        if reasons:
            errors.append({'line': number, 'username': username, 'detail': ' '.join(reasons)})
        else:
            validated.append((username, email, first_name, serializer.validated_data))
        seen_users.add(username); seen_emails.add(email)
        if identifier:
            seen_ids.add(identifier)
        preview.append({'line': number, 'username': username, 'email': email, 'first_name': first_name, **data})
    if errors:
        return Response({'created': 0, 'errors': errors, 'preview': [], 'would_create': 0}, status=400)
    if values['preview']:
        return Response({'created': 0, 'errors': [], 'preview': preview, 'would_create': len(validated)})
    for username, email, first_name, metadata in validated:
        user = User.objects.create_user(username=username, email=email, first_name=first_name, password=None)
        Membership.objects.create(user=user, institute=scope.institute, **metadata)
        send_invitation(user)
    Audit.objects.create(institute=scope.institute, actor=request.user, action='Membership.import', object_id=str(scope.institute.pk), detail={'count': len(validated)})
    return Response({'created': len(validated), 'errors': [], 'preview': [], 'would_create': len(validated)}, status=201)
