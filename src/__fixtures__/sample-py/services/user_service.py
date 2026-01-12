# Sample Python module for testing
from typing import Optional
from .models import User
from ..shared.database import Database
import logging

class UserService:
    """User service for CRUD operations"""
    
    def __init__(self, db: Database):
        self.db = db
        self.logger = logging.getLogger(__name__)
    
    def get_user(self, user_id: str) -> Optional[User]:
        return self.db.find_one("users", {"id": user_id})
    
    def create_user(self, data: dict) -> User:
        self.logger.info(f"Creating user: {data}")
        return self.db.insert("users", data)
