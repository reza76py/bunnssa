from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ssa', '0003_add_created_by_ownership'),
    ]

    operations = [
        migrations.AddField(
            model_name='supervisor',
            name='email',
            field=models.EmailField(blank=True, null=True, max_length=254),
        ),
        migrations.AddField(
            model_name='member',
            name='email',
            field=models.EmailField(blank=True, null=True, max_length=254),
        ),
    ]
