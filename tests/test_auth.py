import pytest
from main import hash_password, verify_password, create_access_token, decode_access_token
import os

# Set up test environment
os.environ["JWT_SECRET"] = "test-secret-key"

def test_password_hashing():
    """Test password hashing and verification"""
    password = "testpassword123"

    # Hash password
    hashed = hash_password(password)
    assert hashed != password
    assert hashed.startswith("$2b$")  # bcrypt format

    # Verify correct password
    assert verify_password(password, hashed) == True

    # Verify incorrect password
    assert verify_password("wrongpassword", hashed) == False

def test_jwt_token():
    """Test JWT token creation and decoding"""
    payload = {"sub": "test@example.com", "email": "test@example.com"}

    # Create token
    token = create_access_token(payload, expires_in=3600)
    assert isinstance(token, str)
    assert len(token.split(".")) == 3  # JWT has 3 parts

    # Decode token
    decoded = decode_access_token(token)
    assert decoded["sub"] == payload["sub"]
    assert decoded["email"] == payload["email"]
    assert "exp" in decoded

def test_jwt_expired_token():
    """Test expired JWT token handling"""
    payload = {"sub": "test@example.com", "email": "test@example.com"}

    # Create token that expires immediately
    token = create_access_token(payload, expires_in=-1)

    # Should raise HTTPException for expired token
    with pytest.raises(Exception):  # FastAPI HTTPException
        decode_access_token(token)

if __name__ == "__main__":
    # Run basic tests
    test_password_hashing()
    test_jwt_token()
    test_jwt_expired_token()
    print("All tests passed!")