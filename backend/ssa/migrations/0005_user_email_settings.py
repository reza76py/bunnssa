from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('ssa', '0004_supervisor_member_email'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserEmailSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_host', models.CharField(default='smtp.gmail.com', max_length=255)),
                ('email_port', models.PositiveIntegerField(default=587)),
                ('email_host_user', models.EmailField(blank=True, default='', max_length=254)),
                ('email_app_password', models.TextField(blank=True, default='')),
                ('from_name', models.CharField(default='Bunnings SSA', max_length=120)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='email_settings', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
