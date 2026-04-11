from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import create_pool
from routers import users, events, registrations
from middleware.auth import JWTMiddleware

# Startup event. Create pool

@asynccontextmanager
async def lifespan(app: FastAPI):
  app.state.pool = await create_pool()
  yield
  await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(JWTMiddleware)

app.include_router(users.router)
app.include_router(events.router)
app.include_router(registrations.router)

app.include_router(users.router, prefix="/users")