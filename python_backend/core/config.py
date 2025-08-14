from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict, Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore', env_nested_delimiter='__')

    # AI Model
    MODEL_PATH: str = "ai_services/part_detection/models/yolov8n.pt"
    MODEL_VERSIONS: Optional[Dict[str, str]] = Field(default_factory=dict)
    MLFLOW_TRACKING_URI: str = "file:./mlruns"

    # Security
    VALID_API_KEYS: str = "your-secret-api-key"
    RATE_LIMIT: str = "100/minute"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Facebook OAuth
    FACEBOOK_APP_ID: str
    FACEBOOK_APP_SECRET: str
    FACEBOOK_REDIRECT_URI: str

    # Twilio SMS
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

settings = Settings()
