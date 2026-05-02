import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Store, Supervisor, Member, AllocationResult, UserEmailSettings
from .serializers import (
    StoreSerializer, SupervisorSerializer, MemberSerializer, AllocationResultSerializer,
    UserRegistrationSerializer, UserProfileSerializer, UserEmailSettingsSerializer
)
from .allocation import run_allocation

logger = logging.getLogger(__name__)


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


class ProfileView(RetrieveAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class UserEmailSettingsView(RetrieveAPIView):
    serializer_class = UserEmailSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj, _ = UserEmailSettings.objects.get_or_create(user=self.request.user)
        return obj

    def put(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = self.get_serializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
