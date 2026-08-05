from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.init_db import init_db
from app.ratelimit import limiter
from app.routers import auth, users, services

app = FastAPI(title="CredVault API", version="1.0.0")

# ---- Rate limiting (slowapi) ----
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Juda ko'p urinish. Iltimos, birozdan so'ng qayta urinib ko'ring."
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev uchun; productionda frontend domenini yozing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(services.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
