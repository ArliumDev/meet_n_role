from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class CreateEvent(BaseModel):
  title: str
  description: str
  date: datetime
  master_id: int
  max_players: int

@router.post("/events")
async def create_event(event: CreateEvent, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    ismaster = await conn.fetchrow(
      "SELECT role FROM users WHERE id=$1", event.master_id
    )
    if ismaster["role"] != "master":
      raise HTTPException(status_code=400, detail="User is not master")
    
    result = await conn.fetchrow(
      "INSERT INTO events (title, description, date, max_players, master_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, title, description, date, max_players, created_at", event.title, event.description, event.date, event.max_players, event.master_id
    )

    return {"id": result["id"], "title": result["title"], "description": result["description"], "date": result["date"], "max_players": result["max_players"], "created_at": result["created_at"]}
