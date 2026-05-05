import logging
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator, PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_str, force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
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

_password_reset_token_generator = PasswordResetTokenGenerator()

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


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        # Always return the same response to avoid user enumeration.
        generic = {'detail': 'If that email exists, a reset link has been sent.'}
        if not email:
            return Response(generic, status=status.HTTP_200_OK)

        user = User.objects.filter(email=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = _password_reset_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
            reset_url = f'{frontend_url}/reset-password/{uid}/{token}/'
            try:
                send_mail(
                    subject='Reset your password - rezteche',
                    message=(
                        f'Hi {user.username},\n\n'
                        'You requested a password reset for your rezteche account.\n'
                        'Click the link below to set a new password:\n\n'
                        f'{reset_url}\n\n'
                        'This link expires after one use.\n'
                        'If you did not request a password reset, you can ignore this email.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                pass  # Never expose whether the email was sent

        return Response(generic, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not all([uid, token, new_password, confirm_password]):
            return Response(
                {'detail': 'uid, token, new_password and confirm_password are all required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {'confirm_password': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {'new_password': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {'detail': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not _password_reset_token_generator.check_token(user, token):
            return Response(
                {'detail': 'Invalid or expired reset link.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated. You can now log in.'}, status=status.HTTP_200_OK)
