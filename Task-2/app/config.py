from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # Discord Application
    discord_public_key: str
    discord_bot_token: str
    discord_application_id: str

    # AWS
    dynamodb_meal_table: str = "mhp-meal-records"
    dynamodb_user_history_table: str = "mhp-user-history"
    aws_region: str = "ap-southeast-1"

    # Discord Role IDs
    role_team_lead_id: str
    role_admin_id: str

    # Guild Authorization
    authorized_guild_id: str

    # Timezone & Cut-off
    timezone: str = "Asia/Dhaka"
    default_cutoff_time: str = "00:00"

    # Internal API (dashboard)
    internal_api_key: str


settings = Settings()  
