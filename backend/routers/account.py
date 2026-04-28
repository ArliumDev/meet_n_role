from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from utils.security import hash_password, verify_password
from utils.jwt import create_token

router = APIRouter()

class User(BaseModel):
  username: str
  password: str

@router.post("/sign_up")
async def create_user(user: User, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    existing = await conn.fetchrow(
      "SELECT id FROM users WHERE username=$1", user.username
    )

    if existing:
      raise HTTPException(status_code=409, detail="Username already exists")
    
    hashed_password = hash_password(user.password)

    result = await conn.fetchrow(
      "INSERT INTO users (username, password, app_role) VALUES ($1,$2, 'user') RETURNING id, username", user.username, hashed_password
    )

    return {"id": result["id"], "username": result["username"]}

@router.post("/sign_in")
async def login(user: User, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      "SELECT id, username, password FROM users WHERE username=$1", user.username
    )

    if not row or not verify_password(user.password, row['password']):
      raise HTTPException(status_code=400, detail="Invalid credentials")
    
    payload = {
      "user_id": row["id"],
      "username": row["username"],
      "app_role": row["app_role"]
    }

    token = create_token(payload)
    return {"token": token, "type": "bearer"}
