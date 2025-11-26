"""WebSocket Service for Real-Time Monitoring"""
from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, List, Set
from datetime import datetime
import json
import logging

from app.core.database import get_db
from app.models.coding_lab import CodingLab, LabSubmission
from app.models.user import User
from app.schemas.coding_lab import StudentActivity, LabMonitoringResponse

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections"""
    
    def __init__(self):
        # lab_id -> Set[WebSocket]
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # WebSocket -> (user_id, lab_id)
        self.connection_info: Dict[WebSocket, tuple] = {}
        # lab_id -> Dict[user_id, StudentActivity]
        self.student_activities: Dict[int, Dict[int, StudentActivity]] = {}
    
    async def connect(self, websocket: WebSocket, lab_id: int, user_id: int):
        """Connect a client"""
        await websocket.accept()
        
        if lab_id not in self.active_connections:
            self.active_connections[lab_id] = set()
            self.student_activities[lab_id] = {}
        
        self.active_connections[lab_id].add(websocket)
        self.connection_info[websocket] = (user_id, lab_id)
        
        # Initialize activity
        if user_id not in self.student_activities[lab_id]:
            self.student_activities[lab_id][user_id] = StudentActivity(
                user_id=user_id,
                lab_id=lab_id,
                time_spent_seconds=0,
                attempt_count=0,
                last_activity=datetime.now(),
                is_active=True
            )
        
        logger.info(f"Client connected: user_id={user_id}, lab_id={lab_id}")
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a client"""
        if websocket in self.connection_info:
            user_id, lab_id = self.connection_info[websocket]
            
            if lab_id in self.active_connections:
                self.active_connections[lab_id].discard(websocket)
            
            if lab_id in self.student_activities:
                if user_id in self.student_activities[lab_id]:
                    self.student_activities[lab_id][user_id].is_active = False
            
            del self.connection_info[websocket]
            
            logger.info(f"Client disconnected: user_id={user_id}, lab_id={lab_id}")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_to_lab(self, lab_id: int, message: dict):
        """Broadcast message to all clients in a lab"""
        if lab_id not in self.active_connections:
            return
        
        disconnected = []
        for websocket in self.active_connections[lab_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")
                disconnected.append(websocket)
        
        # Clean up disconnected clients
        for ws in disconnected:
            self.disconnect(ws)
    
    def update_activity(
        self,
        lab_id: int,
        user_id: int,
        current_code: str = None,
        language: str = None,
        problem_id: int = None,
        tab_switches: int = 0,
        fullscreen_exits: int = 0
    ):
        """Update student activity"""
        if lab_id not in self.student_activities:
            self.student_activities[lab_id] = {}
        
        if user_id not in self.student_activities[lab_id]:
            self.student_activities[lab_id][user_id] = StudentActivity(
                user_id=user_id,
                lab_id=lab_id,
                time_spent_seconds=0,
                attempt_count=0,
                last_activity=datetime.now(),
                is_active=True
            )
        
        activity = self.student_activities[lab_id][user_id]
        activity.last_activity = datetime.now()
        activity.is_active = True
        
        if current_code is not None:
            activity.current_code = current_code
        if language is not None:
            activity.language = language
        if problem_id is not None:
            activity.problem_id = problem_id
        
        activity.tab_switches += tab_switches
        activity.fullscreen_exits += fullscreen_exits
    
    def increment_attempt(self, lab_id: int, user_id: int):
        """Increment attempt count"""
        if lab_id in self.student_activities:
            if user_id in self.student_activities[lab_id]:
                self.student_activities[lab_id][user_id].attempt_count += 1
    
    def get_lab_activities(self, lab_id: int) -> List[StudentActivity]:
        """Get all activities for a lab"""
        if lab_id not in self.student_activities:
            return []
        
        return list(self.student_activities[lab_id].values())


# Global connection manager
manager = ConnectionManager()


async def websocket_endpoint(
    websocket: WebSocket,
    lab_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time monitoring"""
    await manager.connect(websocket, lab_id, user_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            message_type = data.get("type")
            
            if message_type == "ping":
                # Heartbeat
                await manager.send_personal_message({"type": "pong"}, websocket)
            
            elif message_type == "activity_update":
                # Update activity
                manager.update_activity(
                    lab_id=lab_id,
                    user_id=user_id,
                    current_code=data.get("code"),
                    language=data.get("language"),
                    problem_id=data.get("problem_id"),
                    tab_switches=data.get("tab_switches", 0),
                    fullscreen_exits=data.get("fullscreen_exits", 0)
                )
                
                # Broadcast update to faculty/admins
                activities = manager.get_lab_activities(lab_id)
                await manager.broadcast_to_lab(lab_id, {
                    "type": "activity_update",
                    "activities": [a.dict() for a in activities]
                })
            
            elif message_type == "get_activities":
                # Send current activities
                activities = manager.get_lab_activities(lab_id)
                await manager.send_personal_message({
                    "type": "activities",
                    "activities": [a.dict() for a in activities]
                }, websocket)
            
            elif message_type == "code_change":
                # Code changed
                manager.update_activity(
                    lab_id=lab_id,
                    user_id=user_id,
                    current_code=data.get("code"),
                    language=data.get("language")
                )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        manager.disconnect(websocket)

