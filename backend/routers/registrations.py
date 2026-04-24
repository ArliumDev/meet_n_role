from fastapi import APIRouter, HTTPException, Request, Depends
from middleware.auth import get_current_user, APIUser

router = APIRouter()

@router.post("/{event_id}/register")
async def register_to_game(event_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire as conn:
    event = await conn.fetchrow(
      "SELECT id, max_players, status FROM events where id=$1", event_id
    )
    if not event:
      raise HTTPException(status_code=404, detail="Event not found")
    if event["status"] != "open":
      raise HTTPException(status_code=400, detail="Event not open for registration")
    
    existing = await conn.fetchrow(
      "SELECT id FROM registrations WHERE user_id=$1 AND event_id=$2", user.user_id, event_id
    )
    if existing:
      raise HTTPException(status_code=400, detail="Already registered")
    
    players_count = await conn.fetchval(
      "SELECT COUNT(+) FROM registrations WHERE event_id=$1", event_id
    )
    if players_count >= event["max_players"]:
      raise HTTPException(status_code=400, detail="Event is full")
    
    await conn.execute(
      "INSERT INTO registrations (user_id, event_id) VALUES ($1,$2)", user.user_id, event_id
    )
    return {"detail": "Registered successfully"}
  
@router.delete("/{event_id}/unregister")
async def leave_game(event_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    existing = await conn.fetchrow(
      "SELECT id FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user.user_id
    )
    if not existing:
      raise HTTPException(status_code=404, detail="Registration not found")
    
    await conn.execute(
      "DELETE FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user.user_id
    )
    return {"detail": "Unregistered successfully"}
  
@router.get("/me")
async def get_my_registrations(request: Request, user: APIUser = Depends(get_current_user)):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        events = await conn.fetch(
            """
            SELECT 
                events.id,
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
            GROUP BY events.id, events.title, events.description, events.date, 
                     events.max_players, events.created_at, events.status, users.username
            """, user.user_id
        ) 
        return [
            {
                "id": event["id"],
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