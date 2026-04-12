from fastapi import APIRouter, HTTPException, Request, Depends
from middleware.auth import get_current_user, APIUser

router = APIRouter()

@router.post("/register_to_game")
async def register_event(user_id: int, event_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    if user_id != user.user_id:
      raise HTTPException(status_code=403, detail="Permission denied. You can only register yourself")
    
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
      "INSERT INTO registrations (user_id, event_id) VALUES ($1,$2)", user_id, event_id
    )
    return {"detail": "Registered succesfully"}
  
@router.delete("/{event_id}/{user_id}")
async def unregister_event(event_id: int, user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:

    existing = await conn.fetchrow(
      "SELECT id FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id
    )
    if not existing:
      raise HTTPException(status_code=404, detail="Registration not found")
    
    if user_id == user.user_id:
      await conn.execute(
        "DELETE FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id
      )
      return {"detail": "Unregistered succesfully"}
    
    event_master_id = await conn.fetchval(
      "SELECT master_id FROM events WHERE id=$1", event_id
    )
    if not event_master_id:
      raise HTTPException(status_code=404, detail="Event not found")
    
    if event_master_id != user.user_id:
      raise HTTPException(status_code=403, detail="Not authorized to remove other players")
    
    player_username = await conn.fetchval(
      "SELECT username FROM users WHERE id=$1", user_id
    )
    
    await conn.execute(
      "DELETE FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id
    )
    return {"detail": f"User {player_username} has been unregistered from the event"}
    
    
  
@router.get("/{user_id}")
async def get_user_registrations(user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    if user_id != user.user_id:
      raise HTTPException(status_code=403, detail="Permission denied. You can only see your own registrations")
    events = await conn.fetch(
      """
      SELECT 
                events.title, 
                events.description, 
                events.date, 
                events.max_players, 
                events.created_at, 
                events.status, 
                users.username AS master_username,
                COUNT(r2.user_id) AS player_joined
            FROM registrations
            JOIN events ON registrations.event_id = events.id
            JOIN users ON events.master_id = users.id
            LEFT JOIN registrations r2 ON r2.event_id = events.id
            WHERE registrations.user_id = $1
            GROUP BY events.title, events.description, events.date, 
                     events.max_players, events.created_at, events.status, users.username
            """, user_id
        ) 
    return [
            {
                "title": event["title"],
                "description": event["description"],
                "date": event["date"],
                "max_players": event["max_players"],
                "created_at": event["created_at"],
                "status": event["status"],
                "master_username": event["master_username"],
                "player_joined": event["player_joined"]
            }
            for event in events
        ]