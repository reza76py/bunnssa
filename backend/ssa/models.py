import base64
import hashlib

from django.conf import settings
from django.core import signing
from django.db import models


def _derive_key_bytes():
    return hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()


def _xor_bytes(data: bytes, key: bytes) -> bytes:
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


def encrypt_secret(raw_value: str) -> str:
    if not raw_value:
        return ''
    key = _derive_key_bytes()
    cipher = _xor_bytes(raw_value.encode('utf-8'), key)
    token = base64.urlsafe_b64encode(cipher).decode('ascii')
    return signing.dumps({'v': token})


def decrypt_secret(signed_value: str) -> str:
    if not signed_value:
        return ''
    try:
        payload = signing.loads(signed_value)
        token = payload.get('v', '')
        cipher = base64.urlsafe_b64decode(token.encode('ascii'))
        key = _derive_key_bytes()
        raw = _xor_bytes(cipher, key)
        return raw.decode('utf-8')
    except Exception:
        return ''


def _is_encrypted_value(value: str) -> bool:
    if not value:
        return False
    try:
        payload = signing.loads(value)
        return isinstance(payload, dict) and 'v' in payload
    except Exception:
        return False


class Store(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stores')
    name = models.CharField(max_length=200)
    latitude = models.DecimalField(max_digits=10, decimal_places=6)
    longitude = models.DecimalField(max_digits=10, decimal_places=6)
    weekly_delivery_value = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-weekly_delivery_value']

    def __str__(self):
        return self.name


class Supervisor(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supervisors')
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6)
    longitude = models.DecimalField(max_digits=10, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Member(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=6)
    longitude = models.DecimalField(max_digits=10, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class AllocationResult(models.Model):
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='allocations')
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Allocation #{self.pk} ({self.created_at.date()})"


class StoreAssignment(models.Model):
    allocation = models.ForeignKey(AllocationResult, on_delete=models.CASCADE, related_name='assignments')
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    supervisor = models.ForeignKey(Supervisor, on_delete=models.CASCADE)
    supervisor_distance_km = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f"{self.store} → {self.supervisor}"


class MemberAssignment(models.Model):
    store_assignment = models.ForeignKey(StoreAssignment, on_delete=models.CASCADE, related_name='member_assignments')
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    distance_km = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f"{self.member} → {self.store_assignment.store}"


class UserEmailSettings(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='email_settings')
    email_host = models.CharField(max_length=255, default='smtp.gmail.com')
    email_port = models.PositiveIntegerField(default=587)
    email_host_user = models.EmailField(blank=True, default='')
    email_app_password = models.TextField(blank=True, default='')
    from_name = models.CharField(max_length=120, default='Bunnings SSA')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Email settings for {self.user.username}"

    def set_app_password(self, raw_value: str):
        normalized = (raw_value or '').strip().replace(' ', '')
        self.email_app_password = encrypt_secret(normalized)

    def get_app_password(self) -> str:
        return decrypt_secret(self.email_app_password)

    def has_app_password(self) -> bool:
        return bool(self.get_app_password())

    def save(self, *args, **kwargs):
        # Ensure values entered directly (admin/shell) are stored encrypted.
        if self.email_app_password and not _is_encrypted_value(self.email_app_password):
            self.set_app_password(self.email_app_password)
        super().save(*args, **kwargs)
