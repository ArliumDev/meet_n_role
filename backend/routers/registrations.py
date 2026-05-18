from fastapi import APIRouter, HTTPException, Request, Depends
from middleware.auth import get_current_user, APIUser

router = APIRouter()

@router.post("/{event_id}/register")
async def register_to_game(event_id: int, request: Request, user: APIUser = Depends(get_current_user)):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        event = await conn.fetchrow(
            "SELECT id, max_players, status FROM events WHERE id=$1", event_id
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        if event["status"] != "open":
            raise HTTPException(status_code=400, detail="Event not open for registration")
        
        banned = await conn.fetchval(
            "SELECT 1 FROM event_bans WHERE event_id=$1 AND user_id=$2", event_id, user.user_id
        )

        if banned:
            raise HTTPException(status_code=403, detail="You are banned from this event")
        
        existing = await conn.fetchrow(
            "SELECT id FROM registrations WHERE user_id=$1 AND event_id=$2", user.user_id, event_id
        )
        if existing:
            raise HTTPException(status_code=400, detail="Already registered")
        
        players_count = await conn.fetchval(
            "SELECT COUNT(*) FROM registrations WHERE event_id=$1", event_id
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
            (
                SELECT 
                    events.id,
                    events.title,
                    events.description,
                    events.date,
                    events.max_players,
                    events.created_at,
                    events.status,
                    events.master_id,
                    users.username AS master_username,
                    (SELECT COUNT(*) FROM registrations r2 WHERE r2.event_id = events.id) AS player_joined,
                    systems.name AS system_name,
                    events.system_id
                FROM registrations
                JOIN events ON registrations.event_id = events.id
                JOIN users ON events.master_id = users.id
                LEFT JOIN systems ON events.system_id = systems.id
                WHERE registrations.user_id = $1
            )
            UNION
            (
                SELECT 
                    events.id,
                    events.title,
                    events.description,
                    events.date,
                    events.max_players,
                    events.created_at,
                    events.status,
                    events.master_id,
                    users.username AS master_username,
                    (SELECT COUNT(*) FROM registrations r2 WHERE r2.event_id = events.id) AS player_joined,
                    systems.name AS system_name,
                    events.system_id
                FROM events
                JOIN users ON events.master_id = users.id
                LEFT JOIN systems ON events.system_id = systems.id
                WHERE events.master_id = $1
            )
            ORDER BY date DESC
            """,
            user.user_id,
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
                "player_joined": event["player_joined"],
                "master_id": event["master_id"],
                "system_name": event["system_name"],
                "system_id": event["system_id"]
            }
            for event in events
        ]

@router.delete("/{event_id}/kick/{user_id}")
async def kick_player(event_id: int, user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        event = await conn.fetchrow("SELECT master_id FROM events WHERE id = $1", event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event["master_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Only the master can kick players")
        
        if user_id == user.user_id:
            raise HTTPException(status_code=400, detail="You cannot kick yourself")
        
        reg = await conn.fetchrow(
            "SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2", event_id, user_id
        )
        if not reg:
            raise HTTPException(status_code=404, detail="Player is not registered in this event")
        
        await conn.execute(
            "DELETE FROM registrations WHERE event_id = $1 AND user_id = $2", event_id, user_id
        )
        return {"detail": f"Player {user_id} has been kicked from the event"}

@router.post("/{event_id}/ban/{user_id}")
async def ban_player(event_id: int, user_id: int, request: Request, user: APIUser = Depends(get_current_user)):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        event = await conn.fetchrow("SELECT master_id FROM events WHERE id=$1", event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event["master_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="Only the master can ban players")
        if user_id == user.user_id:
            raise HTTPException(status_code=400, detail="You cannot ban yourself")
        
        reg = await conn.fetchrow("SELECT id FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id)
        if not reg:
            raise HTTPException(status_code=404,detail="Player is not registered in this event")
        
        await conn.execute("DELETE FROM registrations WHERE event_id=$1 AND user_id=$2", event_id, user_id)

        await conn.execute(
            """
            INSERT INTO event_bans (event_id, user_id) VALUES ($1,$2) ON CONFLICT (event_id, user_id) DO NOTHING
            """, event_id, user_id)
        return {"detail": f"player {user_id} has been banned from the event"}

@router.get("/me/bans")
async def get_my_bans(request: Request, user: APIUser = Depends(get_current_user)):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT event_id FROM event_bans WHERE user_id=$1", user.user_id
        )
        return [row["event_id"] for row in rows]