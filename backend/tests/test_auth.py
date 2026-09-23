import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth
from app.api import app


class AccessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.key = ec.generate_private_key(ec.SECP256R1())
        cls.client = TestClient(app)

    def claims(self, **changes):
        value = dict(iss=auth.ISSUER, aud='authenticated', sub=str(uuid4()),
                     session_id=str(uuid4()), exp=int(time.time()) + 3600,
                     iat=int(time.time()) - 1, role='authenticated',
                     email='STAFF@utm.my', utm_access=True, is_anonymous=False)
        value.update(changes)
        return value

    def post(self, claims, key=None, path='/generate'):
        token = jwt.encode(claims, key or self.key, algorithm='ES256', headers={'kid': 'test'})
        with patch.object(auth.keys, 'get_signing_key_from_jwt', return_value=SimpleNamespace(key=self.key.public_key())), patch('app.api.generate', return_value='test result'):
            return self.client.post(path, headers={'Authorization': 'Bearer ' + token}, json={'docType': 'diary', 'payload': {}})

    def test_health_public_and_post_requires_auth(self):
        self.assertEqual(self.client.get('/health').status_code, 200)
        for path in ['/generate', '/programme/parse']:
            self.assertEqual(self.client.post(path, json={}).status_code, 401)

    def test_valid_utm_account(self):
        self.assertEqual(self.post(self.claims()).status_code, 200)

    def test_rejected_claims(self):
        for changes, status in [({'email': 'a@gmail.com'}, 403), ({'email': 'a@utm.my.evil.test'}, 403),
                                ({'email': 'a@graduate.utm.my'}, 403), ({'role': 'service_role'}, 403),
                                ({'utm_access': False}, 403), ({'utm_access': 'true'}, 403),
                                ({'is_anonymous': True}, 403), ({'iss': 'https://attacker.test/auth/v1'}, 401),
                                ({'aud': 'another-app'}, 401), ({'exp': int(time.time()) - 30}, 401),
                                ({'sub': 'invalid'}, 401)]:
            with self.subTest(changes=changes):
                self.assertEqual(self.post(self.claims(**changes)).status_code, status)

    def test_editable_metadata_cannot_grant_access(self):
        claims = self.claims(user_metadata={'utm_access': True, 'email': 'staff@utm.my'})
        del claims['utm_access']
        self.assertEqual(self.post(claims).status_code, 403)

    def test_wrong_signature_and_missing_expiry(self):
        self.assertEqual(self.post(self.claims(), ec.generate_private_key(ec.SECP256R1())).status_code, 401)
        claims = self.claims()
        del claims['exp']
        self.assertEqual(self.post(claims).status_code, 401)

    def test_rejected_before_file_parser(self):
        self.assertEqual(self.post(self.claims(email='a@gmail.com'), path='/programme/parse').status_code, 403)

    def test_jwks_outage_fails_closed(self):
        with patch.object(auth.keys, 'get_signing_key_from_jwt', side_effect=auth.PyJWKClientConnectionError('offline')):
            response = self.client.post('/generate', headers={'Authorization': 'Bearer unavailable'}, json={})
        self.assertEqual(response.status_code, 503)


if __name__ == '__main__':
    unittest.main()
