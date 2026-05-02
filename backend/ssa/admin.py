from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.db.models import Count, Sum
from django.db.models.functions import Coalesce

from .models import AllocationResult, Member, MemberAssignment, Store, StoreAssignment, Supervisor, UserEmailSettings

try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass


def _location(obj):
    return f"{obj.latitude}, {obj.longitude}"


_location.short_description = 'Location'


class StoreAssignmentInline(admin.TabularInline):
    model = StoreAssignment
    extra = 0
    can_delete = False
    fields = ('store', 'supervisor', 'supervisor_distance_km', 'weekly_value', 'member_summary')
    readonly_fields = ('store', 'supervisor', 'supervisor_distance_km', 'weekly_value', 'member_summary')

    def weekly_value(self, obj):
        return obj.store.weekly_delivery_value

    weekly_value.short_description = 'Weekly value'

    def member_summary(self, obj):
        members = obj.member_assignments.select_related('member').all()
        if not members:
            return 'No members assigned'
        return ', '.join(f"{assignment.member.name} ({assignment.distance_km} km)" for assignment in members)

    member_summary.short_description = 'Members'


@admin.action(description='Reset password to Admin123@')
def reset_password_to_default(modeladmin, request, queryset):
    for user in queryset:
        user.set_password('Admin123@')
        user.save(update_fields=['password'])


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    actions = [reset_password_to_default]
    list_display = (
        'username',
        'email',
        'date_joined',
        'last_login',
        'is_active',
        'store_count',
        'supervisor_count',
        'member_count',
    )
    readonly_fields = ('store_count', 'supervisor_count', 'member_count')

    fieldsets = UserAdmin.fieldsets + (
        ('Ownership Summary', {'fields': ('store_count', 'supervisor_count', 'member_count')}),
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            _store_count=Count('stores', distinct=True),
            _supervisor_count=Count('supervisors', distinct=True),
            _member_count=Count('members', distinct=True),
        )

    def store_count(self, obj):
        return getattr(obj, '_store_count', obj.stores.count())

    store_count.short_description = 'Stores'

    def supervisor_count(self, obj):
        return getattr(obj, '_supervisor_count', obj.supervisors.count())

    supervisor_count.short_description = 'Supervisors'

    def member_count(self, obj):
        return getattr(obj, '_member_count', obj.members.count())

    member_count.short_description = 'Members'


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'weekly_delivery_value', 'location', 'created_at')
    list_filter = ('created_by',)
    search_fields = ('name',)

    def location(self, obj):
        return _location(obj)

    location.short_description = 'Location'


@admin.register(Supervisor)
class SupervisorAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_by', 'location', 'created_at')
    list_filter = ('created_by',)
    search_fields = ('name', 'email', 'created_by__username')

    def location(self, obj):
        return _location(obj)

    location.short_description = 'Location'


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_by', 'location', 'created_at')
    list_filter = ('created_by',)
    search_fields = ('name', 'email', 'created_by__username')

    def location(self, obj):
        return _location(obj)

    location.short_description = 'Location'


@admin.register(AllocationResult)
class AllocationResultAdmin(admin.ModelAdmin):
    inlines = [StoreAssignmentInline]
    list_display = ('id', 'created_by', 'created_at', 'store_count', 'total_weekly_value', 'notes')
    search_fields = ('created_by__username', 'notes')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            _store_count=Count('assignments', distinct=True),
            _total_weekly_value=Coalesce(Sum('assignments__store__weekly_delivery_value'), 0),
        )

    def store_count(self, obj):
        return getattr(obj, '_store_count', obj.assignments.count())

    store_count.short_description = 'Stores assigned'

    def total_weekly_value(self, obj):
        return getattr(obj, '_total_weekly_value', 0)

    total_weekly_value.short_description = 'Total weekly value'


@admin.register(StoreAssignment)
class StoreAssignmentAdmin(admin.ModelAdmin):
    list_display = ('allocation', 'store', 'supervisor', 'supervisor_distance_km')


@admin.register(MemberAssignment)
class MemberAssignmentAdmin(admin.ModelAdmin):
    list_display = ('store_assignment', 'member', 'distance_km')


@admin.register(UserEmailSettings)
class UserEmailSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_host', 'email_port', 'email_host_user', 'from_name', 'updated_at')
    search_fields = ('user__username', 'email_host_user', 'from_name')


_original_each_context = admin.site.each_context


def admin_each_context(request):
    context = _original_each_context(request)
    context['dashboard_stats'] = {
        'Total users': User.objects.count(),
        'Total stores': Store.objects.count(),
        'Total supervisors': Supervisor.objects.count(),
        'Total members': Member.objects.count(),
        'Total allocations run': AllocationResult.objects.count(),
    }
    return context


admin.site.each_context = admin_each_context
admin.site.site_header = 'Bunnings SSA - Admin Panel'
admin.site.site_title = 'Bunnings SSA - Admin Panel'
admin.site.index_title = 'Bunnings SSA - Admin Panel'