from django.conf import settings
from django.db import models


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
