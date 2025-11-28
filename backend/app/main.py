print("Initial deployment successful")
print("Initial deployment successful 22222")

"""FastAPI application main file"""
from fastapi import FastAPI, Request, status, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.middleware.errors import ServerErrorMiddleware
from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.config import get_settings
from app.core.database import engine, Base
from app.api import auth, jobs, users, colleges, global_content, bulk_upload, promotion, training_sessions, attendance, academic, certificates, resume, job_aggregation, mock_interviews, hall_tickets, notifications, announcements, coding_labs, proctoring, lab_management, intelligent_lab, coding_problems, analytics

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
if isinstance(settings.BACKEND_CORS_ORIGINS, str):
    cors_origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
else:
    cors_origins = settings.BACKEND_CORS_ORIGINS

# Ensure common local development origins are allowed
dev_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

for origin in dev_origins:
    if origin not in cors_origins:
        cors_origins.append(origin)

print(f"[CORS] Allowed origins: {cors_origins}")

# Custom middleware to ensure CORS headers are always present
# This middleware wraps ALL responses, including error responses
class CORSHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        if origin and origin in cors_origins:
            allow_origin = origin
        else:
            allow_origin = cors_origins[0] if cors_origins else "*"
        
        # Store origin in request state for exception handlers
        request.state.cors_origin = allow_origin
        
        try:
            response = await call_next(request)
        except Exception as e:
            # If an exception occurs, create a response with CORS headers
            import traceback
            error_trace = traceback.format_exc()
            print(f"Middleware caught exception: {e}")
            print(error_trace)
            
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": str(e) if settings.DEBUG else "Internal server error"},
                headers={
                    "Access-Control-Allow-Origin": allow_origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        
        # Always ensure CORS headers are present, even if they were already set
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response

# Add CORS header middleware FIRST (outermost layer)
# This ensures CORS headers are added to ALL responses, including errors
app.add_middleware(CORSHeaderMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Exception handlers to ensure CORS headers are always sent
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with CORS headers"""
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        allow_origin = origin
    else:
        allow_origin = cors_origins[0] if cors_origins else "*"
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": allow_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers"""
    origin = request.headers.get("origin")
    if origin and origin in cors_origins:
        allow_origin = origin
    else:
        allow_origin = cors_origins[0] if cors_origins else "*"
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": allow_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions with CORS headers"""
    import traceback
    error_trace = traceback.format_exc()
    print(f"Unhandled exception: {exc}")
    print(error_trace)
    
    # Try to get origin from request state (set by middleware) or headers
    if hasattr(request.state, 'cors_origin'):
        allow_origin = request.state.cors_origin
    else:
        origin = request.headers.get("origin")
        if origin and origin in cors_origins:
            allow_origin = origin
        else:
            allow_origin = cors_origins[0] if cors_origins else "*"
    
    error_detail = str(exc)
    if settings.DEBUG:
        error_detail = f"{str(exc)}\n\nTraceback:\n{error_trace}"
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": error_detail if settings.DEBUG else "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": allow_origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(jobs.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(colleges.router, prefix=settings.API_V1_STR)
app.include_router(global_content.router, prefix=settings.API_V1_STR)
app.include_router(bulk_upload.router, prefix=settings.API_V1_STR)
app.include_router(promotion.router, prefix=settings.API_V1_STR)
app.include_router(training_sessions.router, prefix=settings.API_V1_STR)
app.include_router(attendance.router, prefix=settings.API_V1_STR)
app.include_router(academic.router, prefix=settings.API_V1_STR)
app.include_router(certificates.router, prefix=settings.API_V1_STR)
app.include_router(resume.router, prefix=settings.API_V1_STR)
app.include_router(job_aggregation.router, prefix=settings.API_V1_STR)
app.include_router(mock_interviews.router, prefix=settings.API_V1_STR)
app.include_router(hall_tickets.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(announcements.router, prefix=settings.API_V1_STR)
app.include_router(coding_labs.router, prefix=settings.API_V1_STR)
app.include_router(coding_problems.router, prefix=settings.API_V1_STR)
app.include_router(proctoring.router, prefix=settings.API_V1_STR)
app.include_router(lab_management.router, prefix=settings.API_V1_STR)
app.include_router(intelligent_lab.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

# WebSocket endpoint for coding labs monitoring
@app.websocket("/ws/coding-labs/{lab_id}")
async def websocket_coding_labs(
    websocket: WebSocket,
    lab_id: int,
    token: str = None
):
    """WebSocket endpoint for real-time coding labs monitoring"""
    from app.services.websocket_monitor import manager
    from app.core.security import decode_token
    from app.core.database import SessionLocal
    from fastapi import WebSocketDisconnect, Query
    
    await websocket.accept()
    
    # Get token from query params or headers
    if not token:
        # Try to get from query params
        query_params = dict(websocket.query_params)
        token = query_params.get("token")
    
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return
    
    try:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        user_id = int(payload.get("sub"))
        if not user_id:
            await websocket.close(code=1008, reason="Invalid user")
            return
        
        # Connect to monitoring manager
        await manager.connect(websocket, lab_id, user_id)
        
        # Handle WebSocket messages
        try:
            while True:
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "ping":
                    await manager.send_personal_message({"type": "pong"}, websocket)
                
                elif message_type == "activity_update":
                    manager.update_activity(
                        lab_id=lab_id,
                        user_id=user_id,
                        current_code=data.get("code"),
                        language=data.get("language"),
                        problem_id=data.get("problem_id"),
                        tab_switches=data.get("tab_switches", 0),
                        fullscreen_exits=data.get("fullscreen_exits", 0)
                    )
                    
                    # Broadcast update
                    activities = manager.get_lab_activities(lab_id)
                    await manager.broadcast_to_lab(lab_id, {
                        "type": "activity_update",
                        "activities": [a.dict() for a in activities]
                    })
                
                elif message_type == "get_activities":
                    activities = manager.get_lab_activities(lab_id)
                    await manager.send_personal_message({
                        "type": "activities",
                        "activities": [a.dict() for a in activities]
                    }, websocket)
                
                elif message_type == "code_change":
                    manager.update_activity(
                        lab_id=lab_id,
                        user_id=user_id,
                        current_code=data.get("code"),
                        language=data.get("language")
                    )
        except WebSocketDisconnect:
            manager.disconnect(websocket)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"WebSocket message error: {e}", exc_info=True)
            manager.disconnect(websocket)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"WebSocket authentication error: {e}", exc_info=True)
        await websocket.close(code=1008, reason="Authentication failed")

# Create database tables
@app.on_event("startup")
async def startup():
    """Create database tables on startup and run migrations"""
    Base.metadata.create_all(bind=engine)
    
    # Add problem_code column if it doesn't exist (migration)
    try:
        from sqlalchemy import text, inspect
        inspector = inspect(engine)
        
        if 'coding_problems' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('coding_problems')]
            if 'problem_code' not in columns:
                print("🔄 Adding problem_code column to coding_problems table...")
                with engine.connect() as conn:
                    conn.execute(text("""
                        ALTER TABLE coding_problems 
                        ADD COLUMN problem_code VARCHAR(100)
                    """))
                    conn.commit()
                    
                    conn.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_coding_problems_problem_code 
                        ON coding_problems(problem_code)
                    """))
                    conn.commit()
                    print("✅ Added problem_code column and index")
    except Exception as e:
        print(f"⚠️  Could not add problem_code column (may already exist): {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Elevate Edu API",
        "version": settings.VERSION,
        "docs": "/api/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get(f"{settings.API_V1_STR}/health")
async def health_v1():
    """Health check endpoint under API v1"""
    return {"status": "healthy", "version": settings.VERSION}

# test
# run test
# deploy fix
# deploy fix
# deploy fix 2
