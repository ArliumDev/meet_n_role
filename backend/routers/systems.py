from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import FileResponse
from middleware.auth import get_current_user, APIUser
import os

router = APIRouter()

@router.get("")
async def get_systems(request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    rows = await conn.fetch("SELECT id, name, template_filename FROM systems ORDER BY name")
    return [{"id": row["id"], "name": row["name"], "template_filename": row["template_filename"]} for row in rows]
  
@router.get("/{system_id}/template")
async def dowload_template(system_id: int, request: Request, user: APIUser = Depends(get_current_user)):
  pool = request.app.state.pool
  async with pool.acquire() as conn:
    system = await conn.fetchrow("SELECT template_filename FROM systems where id = $1", system_id)
    if not system or not system["template_filename"]:
      raise HTTPException(status_code=404, detail="Sistema no encontrado o sin plantilla")
    
    has_access = await conn.fetchval("""
        SELECT 1 from REGISTRATIONS r
        JOIN events e ON r.event_id = e.id
        WHERE r.user_id = $1 AND e.system_id = $2
        LIMIT 1
    """, user.user_id, system_id)

    if not has_access:
      is_master = await conn.fetchval("""
          SELECT 1 from events WHERE master_id = $1 AND system_id = $2 LIMIT 1
      """, user.user_id, system_id)

      if not is_master:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta plantilla")
      
      file_path = f"/app/templates/{system['template_filename']}"
      if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo de plantilla no encontrado")
      
      return FileResponse(file_path, media_type="application/pdf", filename=system['template_filename'])