import logging

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import serializers
from .models import Store, Supervisor, Member, AllocationResult, StoreAssignment, MemberAssignment

logger = logging.getLogger(__name__)


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ['id', 'name', 'latitude', 'longitude', 'weekly_delivery_value', 'start_date', 'end_date', 'created_at', 'updated_at']


class SupervisorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supervisor
        fields = ['id', 'name', 'email', 'latitude', 'longitude', 'created_at']


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = ['id', 'name', 'email', 'latitude', 'longitude', 'created_at']


class MemberAssignmentSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)

    class Meta:
        model = MemberAssignment
        fields = ['id', 'member', 'distance_km']


class StoreAssignmentSerializer(serializers.ModelSerializer):
    store = StoreSerializer(read_only=True)
    supervisor = SupervisorSerializer(read_only=True)
    member_assignments = MemberAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = StoreAssignment
        fields = ['id', 'store', 'supervisor', 'supervisor_distance_km', 'member_assignments']


class AllocationResultSerializer(serializers.ModelSerializer):
    assignments = StoreAssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = AllocationResult
        fields = ['id', 'created_at', 'notes', 'assignments']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'password', 'email']
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_email(self, email):
        email = email.strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        user.is_active = False
        user.save(update_fields=['is_active'])

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email/{uid}/{token}"

        self._verification_email_sent = False

        try:
            send_mail(
                subject='Verify your email - rezteche',
                message=(
                    f'Hi {user.username},\n\n'
                    'Thanks for registering with rezteche.\n'
                    'Please verify your email by clicking the link below:\n\n'
                    f'{verify_url}\n\n'
                    'If you did not create this account, you can ignore this email.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            self._verification_email_sent = True
        except Exception as exc:
            logger.exception(
                'Failed to send verification email for user=%s email=%s: %s',
                user.username,
                user.email,
                exc,
            )

        return user


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'role', 'is_staff', 'is_superuser']

    def get_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username

    def get_role(self, obj):
        if obj.is_superuser:
            return 'Super Admin'
        if obj.is_staff:
            return 'Staff'
        return 'User'


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email']
