from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    # Discord Application
    discord_public_key: str
    discord_bot_token: str
    discord_application_id: str

    # AWS
    dynamodb_table: str = "trainee-2026-abdullah-MHP_Table"
    aws_region: str = "ap-southeast-1"
    command_lambda_name: str = "trainee-2026-abdullah-craftsmeal-command"

    # Discord Role IDs
    role_team_lead_id: str
    role_admin_id: str

    # Guild Authorization
    authorized_guild_id: str

    # Timezone & Cut-off
    timezone: str = "Asia/Dhaka"
    default_cutoff_time: str = "23:00"

    # WFH soft limit
    wfh_monthly_limit: int = 5



settings = Settings()  
