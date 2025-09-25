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
    ALLOWED_ORIGINS: str = Field(
        default_factory=lambda: os.getenv('ALLOWED_ORIGINS', '*')
    )

    # Database
    DATABASE_URL: str = Field(
        default_factory=lambda: os.getenv('DATABASE_URL', '')
    )

    # Redis
    REDIS_URL: str = Field(
        default_factory=lambda: os.getenv('REDIS_URL', '')
    )

    # JWT
    JWT_SECRET_KEY: str = Field(
        default_factory=lambda: os.getenv('JWT_SECRET_KEY', 'changeme')
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = Field(
        default_factory=lambda: os.getenv(
            'RATE_LIMIT_ENABLED', 'true'
        ).lower() == 'true'
    )
    RATE_LIMIT_ANONYMOUS_PER_MINUTE: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_ANONYMOUS_PER_MINUTE', '30')
        )
    )
    RATE_LIMIT_ANONYMOUS_PER_HOUR: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_ANONYMOUS_PER_HOUR', '500')
        )
    )
    RATE_LIMIT_ANONYMOUS_BURST: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_ANONYMOUS_BURST', '5')
        )
    )
    RATE_LIMIT_AUTHENTICATED_PER_MINUTE: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_AUTHENTICATED_PER_MINUTE', '100')
        )
    )
    RATE_LIMIT_AUTHENTICATED_PER_HOUR: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_AUTHENTICATED_PER_HOUR', '2000')
        )
    )
    RATE_LIMIT_AUTHENTICATED_BURST: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_AUTHENTICATED_BURST', '15')
        )
    )
    RATE_LIMIT_PREMIUM_PER_MINUTE: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_PREMIUM_PER_MINUTE', '200')
        )
    )
    RATE_LIMIT_PREMIUM_PER_HOUR: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_PREMIUM_PER_HOUR', '5000')
        )
    )
    RATE_LIMIT_PREMIUM_BURST: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_PREMIUM_BURST', '30')
        )
    )
    RATE_LIMIT_ADMIN_PER_MINUTE: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_ADMIN_PER_MINUTE', '500')
        )
    )
    RATE_LIMIT_ADMIN_PER_HOUR: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_ADMIN_PER_HOUR', '10000')
        )
    )
    RATE_LIMIT_ADMIN_BURST: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_ADMIN_BURST', '50')
        )
    )
    RATE_LIMIT_CLEANUP_INTERVAL: int = Field(
        default_factory=lambda: int(
            os.getenv('RATE_LIMIT_CLEANUP_INTERVAL', '300')
        )
    )

    # Facebook OAuth
    FACEBOOK_APP_ID: str = Field(
        default_factory=lambda: os.getenv('FACEBOOK_APP_ID', '')
    )
    FACEBOOK_APP_SECRET: str = Field(
        default_factory=lambda: os.getenv('FACEBOOK_APP_SECRET', '')
    )
    FACEBOOK_REDIRECT_URI: str = Field(
        default_factory=lambda: os.getenv('FACEBOOK_REDIRECT_URI', '')
    )

    # Twilio SMS
    TWILIO_ACCOUNT_SID: str = Field(
        default_factory=lambda: os.getenv('TWILIO_ACCOUNT_SID', '')
    )
    TWILIO_AUTH_TOKEN: str = Field(
        default_factory=lambda: os.getenv('TWILIO_AUTH_TOKEN', '')
    )
    TWILIO_PHONE_NUMBER: str = Field(
        default_factory=lambda: os.getenv('TWILIO_PHONE_NUMBER', '')
    )

    # Supabase Configuration
    SUPABASE_URL: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "")
    )
    SUPABASE_SERVICE_KEY: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_KEY", "")
    )
    
    # Connection Pool Configuration
    SUPABASE_MAX_CONNECTIONS: int = Field(
        default_factory=lambda: int(os.getenv("SUPABASE_MAX_CONNECTIONS", "10"))
    )
    SUPABASE_QUERY_TIMEOUT: float = Field(
        default_factory=lambda: float(os.getenv("SUPABASE_QUERY_TIMEOUT", "30.0"))
    )
    SUPABASE_HEALTH_CHECK_INTERVAL: float = Field(
        default_factory=lambda: float(os.getenv("SUPABASE_HEALTH_CHECK_INTERVAL", "60.0"))
    )
    SUPABASE_SLOW_QUERY_THRESHOLD: float = Field(
        default_factory=lambda: float(os.getenv("SUPABASE_SLOW_QUERY_THRESHOLD", "1000.0"))
    )
    SUPABASE_MAX_RETRIES: int = Field(
        default_factory=lambda: int(os.getenv("SUPABASE_MAX_RETRIES", "3"))
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

    # Monitoring Configuration
    ENVIRONMENT: str = Field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "development")
    )
    LOG_LEVEL: str = Field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )
    JAEGER_ENDPOINT: str = Field(
        default_factory=lambda: os.getenv("JAEGER_ENDPOINT", "")
    )
    PROMETHEUS_PORT: int = Field(
        default_factory=lambda: int(os.getenv("PROMETHEUS_PORT", "8001"))
    )
    ENABLE_TRACING: bool = Field(
        default_factory=lambda: os.getenv("ENABLE_TRACING", "true").lower() == "true"
    )
    ENABLE_METRICS: bool = Field(
        default_factory=lambda: os.getenv("ENABLE_METRICS", "true").lower() == "true"
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
