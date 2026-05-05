from django.conf import settings
from django.core.management.base import BaseCommand
from django.core.mail import send_mail


class Command(BaseCommand):
    help = 'Send a test email to EMAIL_HOST_USER to verify SMTP configuration.'

    def handle(self, *args, **options):
        host_user = settings.EMAIL_HOST_USER
        password_set = bool(settings.EMAIL_HOST_PASSWORD)
        backend = settings.EMAIL_BACKEND

        self.stdout.write(f'EMAIL_BACKEND={backend}')
        self.stdout.write(f'EMAIL_HOST={settings.EMAIL_HOST}')
        self.stdout.write(f'EMAIL_PORT={settings.EMAIL_PORT}')
        self.stdout.write(f'EMAIL_USE_TLS={settings.EMAIL_USE_TLS}')
        self.stdout.write(f'EMAIL_HOST_USER={host_user}')
        self.stdout.write(f'EMAIL_HOST_PASSWORD_SET={password_set}')

        if backend == 'django.core.mail.backends.console.EmailBackend':
            self.stdout.write(self.style.WARNING('Console backend is enabled: emails will print in terminal and will not be delivered to inboxes.'))

        if not host_user:
            self.stderr.write(self.style.ERROR('EMAIL_HOST_USER is empty. Set it in backend/.env first.'))
            return

        if backend == 'django.core.mail.backends.smtp.EmailBackend' and not password_set:
            self.stderr.write(self.style.ERROR('EMAIL_APP_PASSWORD is empty. Set your Gmail app password in backend/.env.'))
            return

        try:
            sent = send_mail(
                subject='rezteche - SMTP Test Email',
                message='This is a test email from rezteche to confirm SMTP is working.',
                from_email=host_user,
                recipient_list=[host_user],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS(f'send_mail returned: {sent}'))
            self.stdout.write(self.style.SUCCESS('Test email command completed successfully.'))
        except Exception as exc:
            self.stderr.write(self.style.ERROR(f'Test email failed: {exc}'))
