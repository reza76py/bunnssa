from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient


class RegistrationDuplicateEmailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/register/'
        self.base_payload = {
            'username': 'newuser',
            'email': 'duplicate@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'StrongPass123',
        }

    def test_registration_rejects_duplicate_email(self):
        first_response = self.client.post(self.url, self.base_payload, format='json')

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=self.base_payload['email']).exists())

        duplicate_payload = {
            **self.base_payload,
            'username': 'anotheruser',
        }
        second_response = self.client.post(self.url, duplicate_payload, format='json')

        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', second_response.data)
        self.assertIn('already exists', second_response.data['email'][0])