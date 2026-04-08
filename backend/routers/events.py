from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

router = APIRouter()

@router.get("/events")
async def get_events_global(request: Request):
    pool = request.app.state.pool
    async with pool.acquire() as conn:
        events = await conn.fetch(
            """
            SELECT events.id, events.title, events.description, events.date, events.max_players, events.created_at, events.status, users.username AS master_username,
            COUNT(registrations.user_id) AS player_joined
            FROM events
            JOIN users ON events.master_id = users.id
            LEFT JOIN registrations ON registrations.event_id = events.id
            GROUP BY events.id, users.username
            """
        )
        return events
  
@router.get("/events/{event_id}")
async def get_event_info(event_id: int, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    event = await conn.fetchrow(
      """
      SELECT events.id, events.title, events.description, events.date, events.max_players, events.created_at, events.status, users.username AS master_username,
      COUNT(registrations.user_id) AS players_joined
      FROM events
      JOIN users ON events.master_id = users.id
      LEFT JOIN registrations ON registrations.event_id = events.id
      WHERE events.id=$1
      GROUP BY events.id, users.username      
      """, event_id
    )
    if not event:
      raise HTTPException(status_code=404, detail="Event not found")
    return event

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
  
class EventStatus(str, Enum):
  open = "open"
  closed = "closed"
  cancelled = "cancelled"  

class UpdateEvent(BaseModel):
  title: str | None = None
  description: str | None = None
  date: datetime | None = None
  max_players: int | None = None
  status: EventStatus | None = None

@router.patch("/events/{event_id}")
async def patch_event(event_id: int, master_id: int, body: UpdateEvent, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    existing = await conn.fetchrow(
      "SELECT id FROM events WHERE id=$1", event_id
    )
    if not existing:
      raise HTTPException(status_code=404, detail="Event not found")
    
    ismaster = await conn.fetchrow(
      "SELECT id FROM events WHERE id=$1 AND master_id=$2", event_id, master_id
    )

    if not ismaster:
      raise HTTPException(status_code=403, detail="Permission denied")
    
    updates = {key: value for key, value in body.model_dump().items() if value is not None}

    if not updates:
      raise HTTPException(status_code=400, detail="No fields to update")
    
    set_clauses = []
    values = []
    idx = 1
    for key, value in updates.items():
      set_clauses.append(f"{key}=${idx}")
      values.append(value)
      idx += 1
    values.append(event_id)
    set_query = ", ".join(set_clauses)
    query = f"UPDATE events SET {set_query} WHERE id=${idx} RETURNING id, title, description, date, max_players, created_at, status"

    updated = await conn.fetchrow(query, *values)
    return {
      "title": updated["title"],
      "description": updated["description"],
      "date": updated["date"],
      "max_players": updated["max_players"],
      "created_at": updated["created_at"],
      "status": updated["status"]
    }

@router.delete("/events/{event_id}")
async def del_event(event_id: int, master_id: int, request: Request):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    existing = await conn.fetchrow(
      "SELECT id FROM events WHERE id=$1", event_id
    )
    if not existing:
      raise HTTPException(status_code=404, detail="Event not found")
    
    ismaster = await conn.fetchrow(
      "SELECT id FROM events WHERE id=$1 AND master_id=$2", event_id, master_id
    )
    if not ismaster:
      raise HTTPException(status_code=403, detail="Permission denied")
    
    target = await conn.fetchrow(
      "DELETE FROM events WHERE id=$1 RETURNING id, title, date", event_id
    )

    return {"detail": "Event has been deleted", "event": target}
  
@router.get("/events/{event_id}/players")
async def get_events_players(event_id: int, request: Request):
  pool =  request.app.state.pool
  async with pool.acquire() as conn:
    players = await conn.fetch(
      """
      SELECT u.id, u.username
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = $1
      """, event_id
    )
    return [{"id": p["id"], "username": p["username"]} for p in players]