from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from utils.jwt import verify_token
from pydantic import BaseModel


async def jwt_auth(request: Request, call_next):
  auth = request.heaers.get("Authorization")
  if not auth or not auth.startswith("Bearer"):
    raise HTTPException(status_code=401, detail="Token requerido")
  
  token = auth.split(" ")[1]

  try:
    payload = verify_token(token)
    request.state.user = payload
  except:
    raise HTTPException(status_code=401, detail="Token inválido")
  
  response = await call_next(request)
  return response

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
    role: str

async def get_current_user(request: Request) -> APIUser:
    if not hasattr(request.state, 'user'):
        raise HTTPException(status_code=401, detail="No authenticated user")
    payload = request.state.user
    return APIUser(**payload)

async def require_master(request: Request) -> APIUser:
    user = await get_current_user(request)
    if user.role != "master":
        raise HTTPException(status_code=403, detail="Masters only")
    return user