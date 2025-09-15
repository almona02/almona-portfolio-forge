from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apis.v1 import router as v1_router
from apis.v2.tickets import router as v2_tickets_router

app = FastAPI(title="Almona Industrial API", version="2.0.0")

# CORS middleware (static list per provided spec)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(v1_router, prefix="/api/v1")
app.include_router(v2_tickets_router, prefix="/api/v2")


@app.get("/")
async def root():
    return {"message": "Almona Industrial API", "version": "2.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
