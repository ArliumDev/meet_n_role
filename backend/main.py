from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import create_pool
from routers import users, events

# Startup event. Create pool

@asynccontextmanager
async def lifespan(app: FastAPI):
  app.state.pool = await create_pool()
  yield
  await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

app.include_router(users.router)
app.include_router(events.router)