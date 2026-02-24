from fastapi import FastAPI
from db import Base, engine
from routes import auth, checkin, survey, quick_thought, dashboard, alerts, connections
import models   
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

# Safe migration: add mood_entry_id to alerts table if it doesn't exist yet
# (create_all never adds columns to existing tables in PostgreSQL)
with engine.connect() as conn:
    try:
        conn.execute(
            __import__("sqlalchemy").text(
                "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS mood_entry_id INTEGER "
                "REFERENCES mood_entries(id) ON DELETE SET NULL"
            )
        )
        conn.commit()
    except Exception:
        conn.rollback()  # column may already exist or DB may not support IF NOT EXISTS


app = FastAPI(title="Nexis Backend", version="1.0.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # Allow the origins listed above
    allow_credentials=True,      # Allow cookies
    allow_methods=["*"],         # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],         # Allow all headers
)

app.include_router(auth.router)
app.include_router(checkin.router)
app.include_router(survey.router)
app.include_router(quick_thought.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(connections.router)

@app.get("/")
def root():
    return {"message": "Welcome to Nexis Backend"}
