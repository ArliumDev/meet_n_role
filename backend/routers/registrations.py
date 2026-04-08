from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()

@router.post("/registrations")
async def register_event(user_id: int, event_id: int, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    user = await conn.fetchrow(
      "SELECT id FROM users WHERE id=$1", user_id)
    if not user:
      raise HTTPException(status_code=404, detail="User not found")
    
    event = await conn.fetchrow(
      "SELECT id, max_players, status FROM events WHERE id=$1", event_id
    )
    if not event:
      raise HTTPException(status_code=404, detail="Event not found")
    if event["status"] != "open":
      raise HTTPException(status_code=400, detail="Event not open for registration")
    
    existing = await conn.fetchrow(
      "SELECT id FROM registrations WHERE user_id=$1 AND event_id=$2", user_id, event_id
    )
    if existing:
      raise HTTPException(status_code=400, detail="Already registered")
    
    players_count = await conn.fetchval(
      "SELECT COUNT(*) FROM registrations WHERE event_id=$1", event_id
    )
    if players_count >= event["max_players"]:
      raise HTTPException(status_code=400, detail="Event is full")
    
    await conn.execute(
      "INSERT INTO registration (user_id, event_id) VALUES ($1,$2)", user_id, event_id
    )
    return {"detail": "Registered succesfully"}
  
@router.delete("/registrations/{event_id}/{user_id}")
async def unregister_event(event_id: int, user_id: int, request: Request, master_id: int | None = None):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    existing = await conn.fetchrow(
      "SELECT id FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id
    )
    if not existing:
      raise HTTPException(status_code=404, detail="Registration not found")
    
    if master_id is not None:
      event_master = await conn.fetchval(
        "SELECT master_id FROM events WHERE id=$1", event_id
      )
      if not event_master:
        raise HTTPException(status_code=404, detail="Event not found")
      if event_master != master_id:
        raise HTTPException(status_code=403, detail="Not authorized to remove other players")
      
      await conn.execute(
        "DELETE FROM registrations WHERE event_id=$1 AND user_id=$2 AND master_id=$3", event_id, user_id, master_id
      )
    else:
      await conn.execute(
        "DELETE FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id
      )

    return {"detail": "Unregistered succesfully"}