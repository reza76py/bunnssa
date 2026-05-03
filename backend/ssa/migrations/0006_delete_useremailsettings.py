from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ssa', '0005_user_email_settings'),
    ]

    operations = [
        migrations.DeleteModel(
            name='UserEmailSettings',
        ),
    ]
