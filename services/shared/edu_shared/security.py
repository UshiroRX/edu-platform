from jose import JWTError, jwt
from .config import fetch_settings


async def decode_and_validate_token(token: str) -> str:
    try:
        
        settings = await fetch_settings()
        
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        print("Payload:", payload)
        print("Token:", token)
        user_id: str | None = payload.get("sub")
        print(user_id)
        if user_id is None:
            raise JWTError("User ID ('sub') not found in token")
        return user_id
    except Exception as e:
        print("Error decoding token:", e)
        raise ValueError(f"Token is invalid: {e}")