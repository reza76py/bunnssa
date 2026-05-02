from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def assign_existing_records_to_owner(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Store = apps.get_model('ssa', 'Store')
    Supervisor = apps.get_model('ssa', 'Supervisor')
    Member = apps.get_model('ssa', 'Member')
    AllocationResult = apps.get_model('ssa', 'AllocationResult')

    owner = User.objects.filter(is_superuser=True).order_by('id').first() or User.objects.order_by('id').first()
    has_existing_records = any([
        Store.objects.exists(),
        Supervisor.objects.exists(),
        Member.objects.exists(),
        AllocationResult.objects.exists(),
    ])

    if owner is None:
        if has_existing_records:
            raise RuntimeError('Cannot backfill created_by fields without at least one existing user.')
        return

    Store.objects.filter(created_by__isnull=True).update(created_by=owner)
    Supervisor.objects.filter(created_by__isnull=True).update(created_by=owner)
    Member.objects.filter(created_by__isnull=True).update(created_by=owner)
    AllocationResult.objects.filter(created_by__isnull=True).update(created_by=owner)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ssa', '0002_remove_store_members_needed'),
    ]

    operations = [
        migrations.AddField(
            model_name='allocationresult',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='allocations', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='member',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='members', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='store',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='stores', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='supervisors', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(assign_existing_records_to_owner, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='allocationresult',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='allocations', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='member',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='members', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='store',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stores', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='supervisor',
            name='created_by',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='supervisors', to=settings.AUTH_USER_MODEL),
        ),
    ]