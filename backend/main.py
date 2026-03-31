import asyncpg
from pydantic import BaseModel
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException

# Startup event. Create pool

@asynccontextmanager
async def lifespan(app: FastAPI):
  app.state.pool = await asyncpg.create_pool(
    user="dbadmin",
    password="dbpass",
    database="tfg_db",
    host="localhost",
    port=5432,
    min_size=1,
    max_size=10
  )
  yield
  await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

# Request model

class CreateUser(BaseModel):
  username: str
  password: str
  role: str = "player"

# POST users

@app.post("/users")
async def create_user(user: CreateUser):
  pool = app.state.pool
  async with pool.acquire() as conn:
    existing = await conn.fetchrow(
      "SELECT id FROM users WHERE username=$1", user.username
    )
    if existing:
      raise HTTPException(status_code=400, detail="Username already exists")
    
    result = await conn.fetchrow(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) "
      "RETURNING id, username",
      user.username, user.password, user.role
    )

    return {"id": result["id"], "username": result["username"]}
  
# GET users

@app.get("/users/{user_id}")
async def get_user(user_id: int):
  pool = app.state.pool
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      "SELECT id, username, role FROM users WHERE id=$1", user_id
    )
    if not row:
      raise HTTPException(status_code=404, detail="User not found")
    return {"id": row["id"], "username": row["username"], "role": row["role"]}