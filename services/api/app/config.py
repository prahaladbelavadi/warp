from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MONGODB_URI: str
    MONGODB_DB: str = "warp"
    API_SECRET: str
    WEBHOOK_SECRET: str
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://app.posthog.com"

    class Config:
        env_file = ".env"


settings = Settings()
