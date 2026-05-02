from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet, SupervisorViewSet, MemberViewSet, AllocationViewSet, RegisterView, ProfileView, UserEmailSettingsView

router = DefaultRouter()
router.register(r'stores', StoreViewSet)
router.register(r'supervisors', SupervisorViewSet)
router.register(r'members', MemberViewSet)
router.register(r'allocations', AllocationViewSet)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('auth/email-settings/', UserEmailSettingsView.as_view(), name='email-settings'),
    path('', include(router.urls)),
]
