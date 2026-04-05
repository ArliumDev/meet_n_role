from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

@router.post("/registrations")
async def join_game(event_id: int, user_id: int, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    event = await conn.fetchrow(
      "SELECT master_id, max_players FROM events WHERE id=$1", event_id
    )
    if not event:
      raise HTTPException(status_code=404, detail="Event not found")
    
    if user_id == event["master_id"]:
      raise HTTPException(status_code=403, detail="Masters cannot join their own game")
    
    is_joined = await conn.fetchrow(
      "SELECT id FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id
    )

    if is_joined:
      raise HTTPException(status_code=400, detail="User already joined the game")
    
    players_count = await conn.fetchval(
      "SELECT COUNT(*) FROM registrations WHERE event_id=$1", event_id
    )

    if players_count >= event["max_players"]:
      raise HTTPException(status_code=400, detail="Event is full")
    
    game_status = await conn.fetchval(
      "SELECT status FROM registrations WHERE event_id=$1", event_id
    )

    if game_status == "closed":
      raise HTTPException(status_code=403,detail="Game already closed")
    elif game_status == "cancelled":
      raise HTTPException(status_code=403,detail="Game cancelled")
    
    registration = await conn.fetchrow(
      """ 
      INSERT INTO registrations (user_id, event_id, joined_at)
      VALUES ($1,$2,NOW())
      RETURNING id, user_id, event_id, joined_at      
      """, user_id, event_id
    )

    return {
      "id": registration["id"],
      "user_id": registration["user_id"],
      "event_id": registration["event_id"],
      "joined_at": registration["joined_at"]
    }
    
  