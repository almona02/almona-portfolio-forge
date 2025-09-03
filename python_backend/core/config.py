import os
from typing import Dict, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        extra='ignore',
        env_nested_delimiter='__'
    )

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

    # Supabase Configuration
    SUPABASE_URL: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "")
    )
    SUPABASE_SERVICE_KEY: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_KEY", "")
    )

    # SendGrid Configuration
    SENDGRID_API_KEY: str = Field(
        default_factory=lambda: os.getenv("SENDGRID_API_KEY", "")
    )
    SENDGRID_FROM_EMAIL: str = Field(
        default_factory=lambda: os.getenv(
            "SENDGRID_FROM_EMAIL", "noreply@almona.com"
        )
    )
    SENDGRID_FROM_NAME: str = Field(
        default_factory=lambda: os.getenv(
            "SENDGRID_FROM_NAME", "Almona Support"
        )
    )

    # Email Configuration
    ADMIN_EMAILS: str = Field(
        default_factory=lambda: os.getenv("ADMIN_EMAILS", "admin@almona.com")
    )
    COMPANY_NAME: str = Field(
        default_factory=lambda: os.getenv("COMPANY_NAME", "Almona Industrial")
    )
    COMPANY_WEBSITE: str = Field(
        default_factory=lambda: os.getenv(
            "COMPANY_WEBSITE", "https://almona.com"
        )
    )

    @property
    def admin_email_list(self) -> list[str]:
        """Convert comma-separated admin emails to list"""
        return [
            email.strip()
            for email in self.ADMIN_EMAILS.split(",")
            if email.strip()
        ]


settings = Settings()
