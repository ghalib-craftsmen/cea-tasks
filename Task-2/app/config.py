from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # Discord Application
    discord_public_key: str
    discord_bot_token: str
    discord_application_id: str

    # AWS
    dynamodb_table: str = "trainee-2026-ghalib-MHP_Table"
    aws_region: str = "ap-southeast-1"
    command_lambda_name: str = "mhp-command"

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
