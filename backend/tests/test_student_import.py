import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.models import User, Membership
from apps.academics.models import Program, Section


@pytest.mark.django_db
def test_student_import_preview_metadata_duplicates_and_scope(world, client_for):
    a = world['a']; admin = client_for(a, 'admin')
    program = Program.objects.create(institute=a['institute'], unit=a['unit'], name='Computing degree')
    section = Section.objects.create(institute=a['institute'], program=program, name='A')
    header = 'username,email,role,first_name,unit,display_name,student_identifier,section\n'
    csv = header + f'imported,imported@example.test,student,New,Computing,New Learner,ST100,{section.pk}\n'
    def upload(text=csv, preview='true', client=admin):
        return client.post('/api/v1/memberships/import-csv/', {'file': SimpleUploadedFile('students.csv', text.encode()), 'preview': preview}, format='multipart')
    result = upload()
    assert result.status_code == 200, result.data
    assert result.data['would_create'] == 1 and result.data['preview'][0]['student_identifier'] == 'ST100'
    assert not User.objects.filter(username='imported').exists()
    assert upload(client=client_for(a, 'teacher')).status_code == 403
    assert client_for(a, 'student').get('/api/v1/memberships/import-template/').status_code == 403
    assert admin.get('/api/v1/memberships/import-template/').status_code == 200
    result = upload(preview='false')
    assert result.status_code == 201, result.data
    member = Membership.objects.get(user__username='imported')
    assert member.section == section and member.unit == a['unit'] and member.display_name == 'New Learner'
    assert member.student_identifier == 'ST100'
    assert upload().status_code == 400
    duplicates = header + 'one,one@example.test,student,One,Computing,,ST200,\ntwo,two@example.test,student,Two,Computing,,ST200,\n'
    result = upload(duplicates, 'false')
    assert result.status_code == 400 and result.data['errors'][0]['line'] == 3
    assert not User.objects.filter(username='one').exists()
    foreign = client_for(world['b'], 'admin')
    result = upload(csv.replace('imported', 'foreign-import').replace('ST100', 'ST300'), client=foreign)
    assert result.status_code == 400
    assert not User.objects.filter(username='foreign-import').exists()
