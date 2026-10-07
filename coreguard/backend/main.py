import sys
from pathlib import Path
# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes.prediction import router as prediction_router
from routes.migration import router as migration_router
from routes.simulation import router as simulation_router
from routes.metrics import router as metrics_router

app = FastAPI(
    title="CoreGuard - Predictive Security-Aware Multicore Migration API",
    description="Backend ML and Decision Engine for Multicore Process Migration Simulation",
    version="1.0.0"
)

# Enable CORS for React frontend (localhost:5173 / localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("[CoreGuard Backend] Initializing SQLite database...")
    init_db()
    print("[CoreGuard Backend] SQLite database initialized.")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CoreGuard Multicore OS Simulator Backend",
        "version": "1.0.0",
        "ml_model": "RandomForest (Active)"
    }

@app.get("/")
def root():
    return {
        "message": "CoreGuard Predictive Security-Aware Multicore OS Simulation API",
        "docs": "/docs",
        "health": "/api/health"
    }

# Register API routers
app.include_router(simulation_router)
app.include_router(prediction_router)
app.include_router(migration_router)
app.include_router(metrics_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
