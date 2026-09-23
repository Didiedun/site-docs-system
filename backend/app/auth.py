"""Validate Supabase-signed access tokens before any generation/upload work."""
import os
import re
from typing import Optional
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError, PyJWKClientConnectionError

# Public project URL, never a secret; override for a different environment.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://znbekksnzycpfitbgtgt.supabase.co").rstrip("/")
ISSUER = f"{SUPABASE_URL}/auth/v1"
keys = PyJWKClient(f"{ISSUER}/.well-known/jwks.json", timeout=10, lifespan=300)
bearer = HTTPBearer(auto_error=False)


def require_utm_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Log masuk dengan akaun Google UTM anda.", headers={"WWW-Authenticate": "Bearer"})
    try:
        token = credentials.credentials
        key = keys.get_signing_key_from_jwt(token)
        claims = jwt.decode(token, key.key, algorithms=["ES256", "RS256"],
                            audience="authenticated", issuer=ISSUER,
                            options={"require": ["exp", "iat", "sub", "aud", "iss", "session_id"]})
        UUID(claims["sub"])
        UUID(claims["session_id"])
    except PyJWKClientConnectionError:
        raise HTTPException(503, "Pengesahan sesi tidak tersedia. Sila cuba lagi.") from None
    except (InvalidTokenError, PyJWKClientError, ValueError, TypeError, AttributeError):
        raise HTTPException(401, "Sesi tamat atau tidak sah. Sila log masuk semula.", headers={"WWW-Authenticate": "Bearer"}) from None
    # utm_access is issued only by the DB hook after checking the Google identity.
    # Ignore user_metadata entirely, including any similarly named flag.
    if (claims.get("role") != "authenticated" or claims.get("utm_access") is not True
            or claims.get("is_anonymous") is True
            or not re.fullmatch(r"[^@\s]+@utm\.my", str(claims.get("email", "")).lower())):
        raise HTTPException(403, "Akses memerlukan akaun Google UTM @utm.my. Sila log masuk semula.")
    return claims
