from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from utils.security import hash_password, verify_password
from utils.jwt import create_token, verify_token
from secrets import token_urlsafe
from middleware.auth import get_current_user, APIUser


router = APIRouter()

@router.get("/me")
async def me(request: Request, user: APIUser = Depends(get_current_user)):
  return user
  
@router.get("/{user_id}")
async def get_user(user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      "SELECT id, username FROM users WHERE id=$1", user_id
    )

    if not row:
      raise HTTPException(status_code=404, detail="User not found")
    
    return {
      "id": row["id"],
      "username": row["username"],
    }

@router.delete("/{user_id}")
async def del_user(user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    if user_id != user.user_id:
      raise HTTPException(status_code=403, detail="Permission denied. You can only delete your own account")
  
    target = await conn.fetchrow(
      "DELETE FROM users WHERE id=$1 RETURNING id, username", user_id
    )

    if not target:
      raise HTTPException(status_code=404, detail="User not found")
    
    return {"detail": "User has been deleted", "user": target}

class UpdateUser(BaseModel):
  username: str | None = None
  password: str | None = None

@router.patch("/{user_id}")
async def patch_user(user_id: int, body: UpdateUser, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    if user_id != user.user_id:
      raise HTTPException(status_code=403, detail="Permission denied. You can only edit your own profile")
    
    current_user = await conn.fetchrow(
      "SELECT id, username, password FROM users where id=$1", user_id
    )
    if not current_user:
      raise HTTPException(status_code=404, detail="User not found")
    
    updates = {}

    if body.username:
      existing = await conn.fetchrow(
        "SELECT id FROM users WHERE username=$1 AND id <>$2", body.username, user_id
      )
      if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
      updates["username"] = body.username
    
    if body.password:
      if verify_password(body.password, current_user["password"]):
        raise HTTPException(status_code=400, detail="Password is the same as before")
      updates["password"] = hash_password(body.password)

    if not updates:
      raise HTTPException(status_code=400, detail="No fields to update")
    
    set_clauses = []
    values = []
    idx = 1
    for key, val in updates.items():
      set_clauses.append(f"{key}=${idx}")
      values.append(val)
      idx += 1
    values.append(user_id)
    set_query = ", ".join(set_clauses)
    query = f"UPDATE users SET {set_query} WHERE id=${idx} RETURNING id, username, password"

    updated = await conn.fetchrow(query, *values)
    return {
      "id": updated["id"],
      "username": updated["username"],
    }
  
@router.get("/{user_id}/events")
async def get_user_events(user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    events = await conn.fetch(
      """
      SELECT DISTINCT events.* , 
      users.username AS master_username,
      COUNT(registrations.user_id) AS player_joined
      FROM registrations
      JOIN events on registrations.event_id = events.id
      JOIN users ON event.master_id = users.id
      LEFT JOIN registration r2 ON r2.event_id = events.id
      WHERE registrations.user_id = $1
      GROUP BY events.id, users.username
      """, user_id
    )
    return events
    
@router.post("/{user_id}/reset_password")
async def reset_user_password(user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    if user_id != user.user_id:
      raise HTTPException(status_code=403, detail="Permision denied. You can only delete your own account")
    
    user = await conn.fetchrow(
      "SELECT id FROM users WHERE id=$1", user_id
    )
    if not user: 
      raise HTTPException(status_code=404, detail="User not found")
    
    new_password = token_urlsafe(12)[:12]

    hashed_password = hash_password(new_password)

    await conn.execute(
      "UPDATE users SET password=$1 WHERE id=$2", hashed_password, user_id
    )

    return {
      "detail": "Password has been reseted. Please change the password as soon as possible",
      "temp_password": f"Your temporary password is {new_password}"
    }
