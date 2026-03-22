"""
Redis Service for Inphora Lending System
Handles session management, token blacklisting, and caching
With in-memory fallbacks when Redis is unavailable
"""

import os
import json
import logging
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
import redis
from redis.exceptions import ConnectionError, RedisError

logger = logging.getLogger(__name__)

class RedisService:
    """Redis service for session management and caching with in-memory fallbacks"""
    
    def __init__(self):
        self.redis_client = None
        self.connected = False
        # In-memory fallbacks for when Redis is unavailable
        self._memory_blacklist = set()
        self._memory_rate_limits = {}
        self._connect()
    
    def _connect(self) -> bool:
        """Connect to Redis"""
        try:
            # Get Redis URL from environment or use default
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            
            # Create Redis client with connection pooling
            self.redis_client = redis.from_url(
                redis_url,
                max_connections=int(os.getenv('REDIS_MAX_CONNECTIONS', 20)),
                retry_on_timeout=os.getenv('REDIS_POOL_RETRY_ON_TIMEOUT', 'true').lower() == 'true',
                socket_timeout=int(os.getenv('REDIS_POOL_TIMEOUT', 30)),
                decode_responses=True
            )
            
            # Test connection
            self.redis_client.ping()
            self.connected = True
            logger.info("Successfully connected to Redis")
            return True
            
        except (ConnectionError, RedisError) as e:
            logger.warning(f"Failed to connect to Redis: {e}. Using in-memory fallbacks.")
            self.connected = False
            self.redis_client = None
            return False
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        return self.connected and self.redis_client is not None
    
    def set_session(self, session_id: str, user_data: Dict[str, Any], ttl: int = None) -> bool:
        """Store session data"""
        if not self.is_connected():
            return False
        
        try:
            ttl = ttl or int(os.getenv('SESSION_TTL', 1800))
            key = f"session:{session_id}"
            
            # Store user data as JSON
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(user_data, default=str)
            )
            return True
            
        except RedisError as e:
            logger.error(f"Failed to set session: {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        if not self.is_connected():
            return None
        
        try:
            key = f"session:{session_id}"
            data = self.redis_client.get(key)
            
            if data:
                return json.loads(data)
            return None
            
        except RedisError as e:
            logger.error(f"Failed to get session: {e}")
            return None
    
    def delete_session(self, session_id: str) -> bool:
        """Delete session data"""
        if not self.is_connected():
            return False
        
        try:
            key = f"session:{session_id}"
            self.redis_client.delete(key)
            return True
            
        except RedisError as e:
            logger.error(f"Failed to delete session: {e}")
            return False
    
    def blacklist_token(self, token: str, ttl: int = None) -> bool:
        """Add token to blacklist (with in-memory fallback)"""
        if self.is_connected():
            try:
                ttl = ttl or int(os.getenv('TOKEN_BLACKLIST_TTL', 86400))
                key = f"blacklist:{token}"
                
                self.redis_client.setex(
                    key,
                    ttl,
                    datetime.utcnow().isoformat()
                )
                return True
                
            except RedisError as e:
                logger.error(f"Failed to blacklist token in Redis: {e}")
        
        # In-memory fallback
        self._memory_blacklist.add(token)
        return True
    
    def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted (with in-memory fallback)"""
        if self.is_connected():
            try:
                key = f"blacklist:{token}"
                return bool(self.redis_client.exists(key))
                
            except RedisError as e:
                logger.error(f"Failed to check token blacklist in Redis: {e}")
        
        # In-memory fallback
        return token in self._memory_blacklist
    
    def remove_from_blacklist(self, token: str) -> bool:
        """Remove token from blacklist"""
        if self.is_connected():
            try:
                key = f"blacklist:{token}"
                self.redis_client.delete(key)
                return True
                
            except RedisError as e:
                logger.error(f"Failed to remove from blacklist: {e}")
                return False
        
        # In-memory fallback
        self._memory_blacklist.discard(token)
        return True
    
    def set_cache(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set cache value"""
        if not self.is_connected():
            return False
        
        try:
            ttl = ttl or int(os.getenv('CACHE_TTL', 3600))
            cache_key = f"{os.getenv('CACHE_PREFIX', 'inphora:')}{key}"
            
            # Serialize value
            if isinstance(value, (dict, list)):
                serialized_value = json.dumps(value, default=str)
            else:
                serialized_value = str(value)
            
            self.redis_client.setex(cache_key, ttl, serialized_value)
            return True
            
        except RedisError as e:
            logger.error(f"Failed to set cache: {e}")
            return False
    
    def get_cache(self, key: str) -> Optional[Any]:
        """Get cache value"""
        if not self.is_connected():
            return None
        
        try:
            cache_key = f"{os.getenv('CACHE_PREFIX', 'inphora:')}{key}"
            value = self.redis_client.get(cache_key)
            
            if value:
                # Try to deserialize as JSON
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return None
            
        except RedisError as e:
            logger.error(f"Failed to get cache: {e}")
            return None
    
    def delete_cache(self, key: str) -> bool:
        """Delete cache value"""
        if not self.is_connected():
            return False
        
        try:
            cache_key = f"{os.getenv('CACHE_PREFIX', 'inphora:')}{key}"
            self.redis_client.delete(cache_key)
            return True
            
        except RedisError as e:
            logger.error(f"Failed to delete cache: {e}")
            return False
    
    def increment_rate_limit(self, identifier: str, window: int = 60) -> int:
        """Increment rate limit counter (with in-memory fallback)"""
        if self.is_connected():
            try:
                key = f"rate_limit:{identifier}"
                count = self.redis_client.incr(key)
                
                if count == 1:
                    # Set expiry on first increment
                    self.redis_client.expire(key, window)
                
                return count
                
            except RedisError as e:
                logger.error(f"Failed to increment rate limit: {e}")
        
        # In-memory fallback
        import time
        now = time.time()
        if identifier not in self._memory_rate_limits:
            self._memory_rate_limits[identifier] = {"count": 0, "start": now, "window": window}
        
        entry = self._memory_rate_limits[identifier]
        if now - entry["start"] > entry["window"]:
            # Window expired, reset
            entry["count"] = 0
            entry["start"] = now
        
        entry["count"] += 1
        return entry["count"]
    
    def get_rate_limit(self, identifier: str) -> int:
        """Get current rate limit count"""
        if self.is_connected():
            try:
                key = f"rate_limit:{identifier}"
                value = self.redis_client.get(key)
                return int(value) if value else 0
                
            except RedisError as e:
                logger.error(f"Failed to get rate limit: {e}")
        
        # In-memory fallback
        entry = self._memory_rate_limits.get(identifier)
        return entry["count"] if entry else 0
    
    def clear_all_sessions(self) -> bool:
        """Clear all session data (for maintenance)"""
        if not self.is_connected():
            return False
        
        try:
            pattern = "session:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
            
        except RedisError as e:
            logger.error(f"Failed to clear sessions: {e}")
            return False
    
    def get_redis_info(self) -> Dict[str, Any]:
        """Get Redis server information"""
        if not self.is_connected():
            return {"connected": False}
        
        try:
            info = self.redis_client.info()
            return {
                "connected": True,
                "version": info.get("redis_version"),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace_hits": info.get("keyspace_hits"),
                "keyspace_misses": info.get("keyspace_misses")
            }
            
        except RedisError as e:
            logger.error(f"Failed to get Redis info: {e}")
            return {"connected": False, "error": str(e)}
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        if not self.is_connected():
            return {
                "status": "degraded",
                "message": "Redis not connected, using in-memory fallbacks"
            }
        
        try:
            # Test basic operations
            test_key = "health_check_test"
            self.redis_client.set(test_key, "test", ex=10)
            value = self.redis_client.get(test_key)
            self.redis_client.delete(test_key)
            
            if value == "test":
                return {
                    "status": "healthy",
                    "message": "Redis operational",
                    "info": self.get_redis_info()
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": "Redis read/write test failed"
                }
                
        except RedisError as e:
            return {
                "status": "unhealthy",
                "message": f"Redis health check failed: {e}"
            }

# Create singleton instance
redis_service = RedisService()

# Export for use in other modules
__all__ = ['RedisService', 'redis_service']

