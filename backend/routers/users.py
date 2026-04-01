from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

class CreateUser(BaseModel):
  username: str
  password: str
  role: str = "player"

@router.post("/users")
async def create_user(user: CreateUser, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    existing = await conn.fetchrow(
      "SELECT id FROM users WHERE username=$1", user.username
    )

    if existing:
      raise HTTPException(status_code=404, detail="Username already exists")
    
    result = await conn.fetchrow(
      "INSERT INTO users (username, password, role) VALUES ($1,$2,$3) RETURNING id, username",
      user.username, user.password, user.role
    )

    return {"id": result["id"], "username": result["username"]}
  
@router.get("/users/{user_id}")
async def get_user(user_id: int, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      "SELECT id, username, role FROM users WHERE id=$1", user_id
    )

    if not row:
      raise HTTPException(status_code=404, detail="User not found")
    
    return {
      "id": row["id"],
      "username": row["username"],
      "role": row["role"]
    }

@router.delete("/users/{user_id}")
async def del_user(user_id: int, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    target = await conn.fetchrow(
      "DELETE FROM users WHERE id=$1 RETURNING id, username", user_id
    )

    if not target:
      raise HTTPException(status_code=404, detail="User not found")
    
    return {"detail": "User has been deleted", "user": target}

class UpdateUsername(BaseModel):
  username: str

@router.patch("/users/{user_id}/username")
async def change_username(user_id: int, body: UpdateUsername, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    current_user = await conn.fetchrow(
      "SELECT id, username FROM users WHERE id=$1", user_id
    )
    if not current_user:
      raise HTTPException(status_code=404, detail="User not found")
    
    existing = await conn.fetchrow(
      "SELECT id FROM users WHERE username=$1 AND id<>$2", body.username, user_id
    )
    if existing:
      raise HTTPException(status_code=400, detail="Username already exists")
    
    updated = await conn.fetchrow(
      "UPDATE users SET username=$1 WHERE id=$2 RETURNING id, username", body.username, user_id
    )

    return {"id": updated["id"], "username": updated["username"]}
  
class UpdatePassword(BaseModel):
  password: str
  
@router.patch("/users/{user_id}/password")
async def change_password(user_id: int, body: UpdatePassword, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    current_user = await conn.fetchrow(
      "SELECT id, password FROM users where id=$1", user_id
    )
    
    if not current_user:
      raise HTTPException(status_code=404, detail="User not found")
    
    if body.password == current_user["password"]:
      raise HTTPException(status_code=400, detail="Password is the same as before")
    
    updated = await conn.fetchrow(
      "UPDATE users SET password=$1 WHERE id=$2 RETURNING id, password",
      body.password, user_id
    )

    return {"id": updated["id"], "password": updated["password"]}