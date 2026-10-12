"""Keep existing authorized teaching operational when introducing appointments."""
from django.db import migrations


def preserve_appointments(apps, schema_editor):
    Membership=apps.get_model('accounts','Membership')
    Appointment=apps.get_model('accounts','TeacherAppointment')
    Offering=apps.get_model('academics','Offering')
    for membership in Membership.objects.filter(active=True,role__in=['teacher','head']).iterator():
        units=set(Offering.objects.filter(institute_id=membership.institute_id, teachers=membership.user_id, archived=False).exclude(course__unit_id=None).values_list('course__unit_id',flat=True))
        if membership.role=='teacher' and membership.unit_id:
            units.add(membership.unit_id)
        for unit in units:
            membership.eligible_units.add(unit)
            Appointment.objects.get_or_create(institute_id=membership.institute_id, membership_id=membership.pk, unit_id=unit, defaults={'reason':'Existing teaching appointment preserved during additive migration.'})


class Migration(migrations.Migration):
    dependencies=[('accounts','0006_membership_eligible_units_teacherappointment')]
    operations=[migrations.RunPython(preserve_appointments,migrations.RunPython.noop)]
