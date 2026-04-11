from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from utils.security import hash_password, verify_password


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
      raise HTTPException(status_code=409, detail="Username already exists")
    
    hashed_password = hash_password(user.password) 

    result = await conn.fetchrow(
      "INSERT INTO users (username, password, role) VALUES ($1,$2,$3) RETURNING id, username",
      user.username, hashed_password, user.role
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

class UpdateUser(BaseModel):
  username: str | None = None
  password: str | None = None

@router.patch("/users/{user_id}")
async def patch_user(user_id: int, body: UpdateUser, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
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
      if body.password == current_user["password"]:
        raise HTTPException(status_code=400, detail="Password is the same as before")
      updates["password"] = body.password

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
  
@router.get("/users/{user_id}/events")
async def get_user_events(user_id: int, request: Request):
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
  
class LoginRequest(BaseModel):
  username: str
  password: str
  
@router.post("/login")
async def login(user: LoginRequest, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    db_user = await conn.fetchrow(
      "SELECT id, username, password FROM users WHERE username=$1", user.username
    )
    if not db_user or not verify_password(user.password, db_user["password"]):
      raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"detail": "Login succeed"}