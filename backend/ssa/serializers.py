from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Store, Supervisor, Member, AllocationResult, StoreAssignment, MemberAssignment, UserEmailSettings


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ['id', 'name', 'latitude', 'longitude', 'weekly_delivery_value', 'created_at', 'updated_at']


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
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'name', 'role', 'is_staff', 'is_superuser']

    def get_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username

    def get_role(self, obj):
        if obj.is_superuser:
            return 'Super Admin'
        if obj.is_staff:
            return 'Staff'
        return 'User'


class UserEmailSettingsSerializer(serializers.ModelSerializer):
    email_app_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_app_password = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserEmailSettings
        fields = [
            'email_host',
            'email_port',
            'email_host_user',
            'email_app_password',
            'from_name',
            'has_app_password',
        ]

    def get_has_app_password(self, obj):
        return obj.has_app_password()

    def validate(self, attrs):
        host = attrs.get('email_host')
        if host is None and self.instance is not None:
            host = self.instance.email_host
        host = (host or '').strip().lower()

        raw_password = attrs.get('email_app_password', None)
        if raw_password:
            normalized = raw_password.strip().replace(' ', '')
            if 'gmail.com' in host and len(normalized) != 16:
                raise serializers.ValidationError({
                    'email_app_password': 'For Gmail SMTP, use a 16-character App Password (spaces optional).'
                })
            attrs['email_app_password'] = normalized

        return attrs

    def create(self, validated_data):
        raw_password = validated_data.pop('email_app_password', '')
        instance = UserEmailSettings(**validated_data)
        if raw_password:
            instance.set_app_password(raw_password)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        if 'email_app_password' in validated_data:
            raw_password = validated_data.pop('email_app_password')
            if raw_password:
                instance.set_app_password(raw_password)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance
