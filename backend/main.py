from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_pool
from routers import users, events, registrations, account
from middleware.auth import JWTMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
  app.state.pool = await create_pool()
  yield
  await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],

)
app.add_middleware(JWTMiddleware)
app.include_router(account.router, prefix="/account")
app.include_router(users.router, prefix="/users")
app.include_router(events.router, prefix="/events")
app.include_router(registrations.router, prefix="/registrations")
