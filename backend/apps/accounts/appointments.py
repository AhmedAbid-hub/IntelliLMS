"""Department Heads appoint provisioned, institutionally eligible teaching members."""
from django.db import transaction
from django.db.models import Q, Exists, OuterRef
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.academics.models import Unit, Offering
from apps.insights.models import Audit
from apps.insights.filters import ReportPagination
from .models import Membership, TeacherAppointment, Institute
from .scope import Scope


class AppointmentInput(serializers.Serializer):
    membership = serializers.UUIDField()
    unit = serializers.UUIDField()
    reason = serializers.CharField(min_length=5, max_length=1000)


class WithdrawalInput(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=1000)


class AppointmentSerializer(serializers.ModelSerializer):
    teacher = serializers.CharField(source='membership.user.username', read_only=True)
    unit_label = serializers.CharField(source='unit.name', read_only=True)
    class Meta:
        model=TeacherAppointment
        fields=['id','membership','unit','unit_label','teacher','active','reason','created_at','updated_at']
        read_only_fields=fields


class TeachingCandidateSerializer(serializers.Serializer):
    id=serializers.UUIDField()
    username=serializers.CharField()
    first_name=serializers.CharField()
    appointed=serializers.BooleanField()


class TeacherAppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=AppointmentSerializer
    pagination_class=ReportPagination
    filterset_fields=['unit','active']
    search_fields=['membership__user__username','membership__user__first_name']

    def scope(self, write=False):
        scope=Scope(self.request)
        if scope.role not in (['head'] if write else ['admin','head']):
            raise PermissionDenied('Department Heads appoint teachers; Institute Admin can review appointments and provision eligibility.')
        return scope

    def get_queryset(self):
        if getattr(self,'swagger_fake_view',False): return TeacherAppointment.objects.none()
        scope=self.scope()
        query=TeacherAppointment.objects.filter(institute=scope.institute).select_related('membership__user','unit')
        if scope.role=='head': query=query.filter(unit_id=scope.membership.unit_id)
        return query.order_by('membership__user__username','pk')

    @extend_schema(responses=TeachingCandidateSerializer(many=True))
    @action(detail=False,methods=['get'])
    def candidates(self,request):
        scope=self.scope(write=True)
        unit=scope.membership.unit
        if not unit: raise PermissionDenied('A department appointment is required.')
        query=Membership.objects.filter(institute=scope.institute,active=True,user__is_active=True).filter(Q(role='teacher')|Q(role='head',can_teach=True)).filter(Q(unit=unit)|Q(eligible_units=unit)).distinct().select_related('user').annotate(appointed=Exists(TeacherAppointment.objects.filter(membership_id=OuterRef('pk'),unit=unit,active=True))).order_by('user__username','pk')
        search=request.query_params.get('search','')[:120]
        if search: query=query.filter(Q(user__username__icontains=search)|Q(user__first_name__icontains=search))
        page=self.paginate_queryset(query)
        return self.get_paginated_response([dict(id=member.pk,username=member.user.username,first_name=member.user.first_name,appointed=member.appointed) for member in page])

    @extend_schema(request=AppointmentInput,responses={201:AppointmentSerializer,200:AppointmentSerializer})
    @transaction.atomic
    def create(self,request):
        scope=self.scope(write=True)
        Institute.objects.select_for_update().get(pk=scope.institute.pk)
        data=AppointmentInput(data=request.data); data.is_valid(raise_exception=True); values=data.validated_data
        if values['unit']!=scope.membership.unit_id: raise PermissionDenied('Choose your own department.')
        unit=get_object_or_404(Unit,institute=scope.institute,pk=values['unit'])
        member=get_object_or_404(Membership.objects.select_related('user'),institute=scope.institute,pk=values['membership'],active=True,user__is_active=True)
        if not (member.role=='teacher' or member.role=='head' and member.can_teach): raise ValidationError('Select an eligible teaching account.')
        if member.unit_id!=unit.pk and not member.eligible_units.filter(pk=unit.pk).exists(): raise PermissionDenied('Institute Admin must authorize this teacher for the department first.')
        appointment,created=TeacherAppointment.objects.get_or_create(institute=scope.institute,membership=member,unit=unit,defaults={'reason':values['reason']})
        previous=appointment.active if not created else False
        if not created and not appointment.active:
            appointment.active=True; appointment.reason=values['reason']; appointment.save()
        if created or not previous:
            Audit.objects.create(institute=scope.institute,actor=request.user,action='TeacherAppointment.appoint',object_id=str(appointment.pk),detail={'membership':str(member.pk),'unit':str(unit.pk),'previous':previous,'current':True,'reason':values['reason']})
        if created or not previous:
            from apps.learning.notifications import notify_event
            notify_event(scope.institute,[member.user_id],"Department appointment: "+unit.name, "You can see courses after your Department Head assigns them.",event_key=f"appointment:{appointment.pk}:{appointment.updated_at.isoformat()}",destination="/offerings")
        return Response(self.get_serializer(appointment).data,status=201 if created else 200)

    @extend_schema(request=WithdrawalInput,responses=AppointmentSerializer)
    @action(detail=True,methods=['post'])
    @transaction.atomic
    def withdraw(self,request,pk=None):
        scope=self.scope(write=True)
        Institute.objects.select_for_update().get(pk=scope.institute.pk)
        appointment=self.get_object()
        data=WithdrawalInput(data=request.data); data.is_valid(raise_exception=True)
        if Offering.objects.filter(institute=scope.institute,course__unit=appointment.unit,archived=False,teachers=appointment.membership.user).exists():
            raise ValidationError('Reassign or unassign active departmental courses before ending the appointment. Historical assignments are retained.')
        if appointment.active:
            appointment.active=False; appointment.reason=data.validated_data['reason']; appointment.save()
            Audit.objects.create(institute=scope.institute,actor=request.user,action='TeacherAppointment.withdraw',object_id=str(appointment.pk),detail={'previous':True,'current':False,'reason':data.validated_data['reason']})
        return Response(self.get_serializer(appointment).data)
