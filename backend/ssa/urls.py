from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StoreViewSet,
    SupervisorViewSet,
    MemberViewSet,
    AllocationViewSet,
    RegisterView,
    ProfileView,
    VerifyEmailView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

router = DefaultRouter()
router.register(r'stores', StoreViewSet)
router.register(r'supervisors', SupervisorViewSet)
router.register(r'members', MemberViewSet)
router.register(r'allocations', AllocationViewSet)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/verify-email/<uidb64>/<token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('', include(router.urls)),
]
