from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from utils.jwt import verify_token
from pydantic import BaseModel

class JWTMiddleware(BaseHTTPMiddleware):
  async def dispatch(self, request, call_next):
    if request.url.path in ["/account/sign_in", "/account/sign_up", "/docs", "/openapi.json"]:
      return await call_next(request)
    
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer"):
      raise HTTPException(status_code=401, detail="Token required")
    
    token = auth.split(" ")[1]
    try:
      payload = verify_token(token)
      request.state.user = payload
    except:
      raise HTTPException(status_code=401, detail="Invalid token")
    
    return await call_next(request)

class APIUser(BaseModel):
    user_id: int
    username: str

async def get_current_user(request: Request) -> APIUser:
    if not hasattr(request.state, 'user'):
        raise HTTPException(status_code=401, detail="No authenticated user")
    payload = request.state.user
    return APIUser(**payload)