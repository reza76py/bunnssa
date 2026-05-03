import logging
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Store, Supervisor, Member, AllocationResult
from .serializers import (
    StoreSerializer, SupervisorSerializer, MemberSerializer, AllocationResultSerializer,
    UserRegistrationSerializer, UserProfileSerializer, UserProfileUpdateSerializer
)
from .allocation import run_allocation

logger = logging.getLogger(__name__)


class VerifiedEmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        user = User.objects.filter(username=username).first()
        if user and not user.is_active and user.check_password(password):
            raise AuthenticationFailed('Please verify your email before logging in.')

        return super().validate(attrs)


class VerifiedEmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = VerifiedEmailTokenObtainPairSerializer


class OwnedModelViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return self.queryset.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StoreViewSet(OwnedModelViewSet):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer


class SupervisorViewSet(OwnedModelViewSet):
    queryset = Supervisor.objects.all()
    serializer_class = SupervisorSerializer


class MemberViewSet(OwnedModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer


class AllocationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AllocationResult.objects.all().order_by('-created_at')
    serializer_class = AllocationResultSerializer

    def get_queryset(self):
        return self.queryset.filter(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def run(self, request):
        logger.critical("=== RUN ALLOCATION CALLED ===")
        print("=== RUN ALLOCATION CALLED ===", flush=True)
        print("=== ALLOCATION RUN STARTED ===")
        notes = request.data.get('notes', '')
        try:
            result = run_allocation(notes=notes, user=request.user)
            serializer = AllocationResultSerializer(result)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        email_sent = getattr(serializer, '_verification_email_sent', False)
        message = (
            'Please check your email to verify your account.'
            if email_sent
            else 'Account created. Verification email will be sent shortly.'
        )
        response_data = dict(serializer.data)
        response_data['detail'] = message
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'detail': 'Invalid verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({'detail': 'Email already verified.'}, status=status.HTTP_200_OK)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'detail': 'Email verified successfully. You can now log in.'}, status=status.HTTP_200_OK)


class ProfileView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer
