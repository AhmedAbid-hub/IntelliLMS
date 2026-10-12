from io import BytesIO
from PIL import Image
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from apps.accounts.models import Membership
from apps.learning.models import Notification
from apps.learning.views import notify


def picture(color='green'):
    stream=BytesIO(); Image.new('RGB',(48,32),color).save(stream,format='PNG')
    return SimpleUploadedFile('untrusted.png',stream.getvalue(),content_type='image/png')


@pytest.mark.django_db
def test_private_profile_upload_replace_remove_and_scope(world, client_for, settings, tmp_path, django_capture_on_commit_callbacks):
    settings.MEDIA_ROOT=tmp_path
    a=world['a']; student=client_for(a,'student')
    with django_capture_on_commit_callbacks(execute=True):
        response=student.put('/api/v1/auth/avatar/',{'image':picture()},format='multipart')
    assert response.status_code==200
    assert response.data['avatar_url'].startswith('/api/v1/auth/avatar/?v=')
    image=student.get(response.data['avatar_url'])
    assert image.status_code==200 and image['Content-Type']=='image/jpeg'
    assert image['Cache-Control']=='private, no-store'
    normalized=Image.open(BytesIO(image.content))
    assert normalized.size==(256,256) and not normalized.getexif()
    membership=Membership.objects.get(user=a['student'],institute=a['institute'])
    url=f'/api/v1/memberships/{membership.pk}/avatar/'
    assert client_for(a,'teacher').get(url).status_code==200
    assert client_for(world['b'],'admin').get(url).status_code==404
    assert APIClient().get(response.data['avatar_url']).status_code==403
    csrf_client=APIClient(enforce_csrf_checks=True)
    csrf_client.force_login(a['student'])
    assert csrf_client.put('/api/v1/auth/avatar/',{'image':picture()},format='multipart').status_code==403
    with django_capture_on_commit_callbacks(execute=True):
        replaced=student.put('/api/v1/auth/avatar/',{'image':picture('blue')},format='multipart')
    assert replaced.data['avatar_url']!=response.data['avatar_url']
    assert len(list((tmp_path/'avatars').iterdir()))==1
    with django_capture_on_commit_callbacks(execute=True):
        removed=student.delete('/api/v1/auth/avatar/')
    assert removed.data['avatar_url'] is None and student.get('/api/v1/auth/avatar/').status_code==404
    assert not list((tmp_path/'avatars').iterdir())


@pytest.mark.django_db
def test_avatar_rejects_disguised_oversized_and_role_changes(world,client_for,settings,tmp_path):
    settings.MEDIA_ROOT=tmp_path
    client=client_for(world['a'],'student')
    for upload in [SimpleUploadedFile('bad.jpg',b'<svg onload="alert(1)"/>',content_type='image/jpeg'), SimpleUploadedFile('big.jpg',b'x'*(4*1024*1024+1),content_type='image/jpeg')]:
        assert client.put('/api/v1/auth/avatar/',{'image':upload},format='multipart').status_code==400
    response=client.patch('/api/v1/auth/me/',{'notify_academic':False,'is_superuser':True,'role':'admin'},format='json')
    assert response.status_code==200 and response.data['notify_academic'] is False and response.data['is_superuser'] is False
    assert Membership.objects.get(user=world['a']['student']).role=='student'
    notify(world['a']['institute'],[world['a']['student'].pk,world['a']['teacher'].pk],'Academic update')
    assert not Notification.objects.filter(user=world['a']['student']).exists()
    assert Notification.objects.filter(user=world['a']['teacher']).count()==1
