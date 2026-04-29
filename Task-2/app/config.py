import os
import boto3
from pydantic_settings import BaseSettings

_GCP_CREDS_PATH = "/tmp/gcp_credentials.json"


def _load_secrets_from_ssm(settings: "Settings") -> None:
    prefix = os.environ.get("SSM_PREFIX", "")
    if not prefix:
        return

    client = boto3.client("ssm", region_name=settings.aws_region)

    # Fetch all parameters under the prefix in a single API call
    paginator = client.get_paginator("get_parameters_by_path")
    params: dict[str, str] = {}
    for page in paginator.paginate(Path=prefix, WithDecryption=True):
        for p in page["Parameters"]:
            name = p["Name"].removeprefix(prefix + "/")
            params[name] = p["Value"]

    settings.discord_public_key     = params.get("DISCORD_PUBLIC_KEY", "")
    settings.discord_bot_token      = params.get("DISCORD_BOT_TOKEN", "")
    settings.discord_application_id = params.get("DISCORD_APPLICATION_ID", "")
    settings.role_team_lead_id      = params.get("ROLE_TEAM_LEAD_ID", "")
    settings.role_admin_id          = params.get("ROLE_ADMIN_ID", "")
    settings.authorized_guild_id    = params.get("AUTHORIZED_GUILD_ID", "")
    settings.gchat_audience         = params.get("GCHAT_AUDIENCE", "")
    settings.gchat_authorized_space = params.get("GCHAT_AUTHORIZED_SPACE", "")

    gcp_key = params.get("GCHAT_SERVICE_ACCOUNT_KEY", "")
    if gcp_key and gcp_key != "pending":
        try:
            with open(_GCP_CREDS_PATH, "w") as f:
                f.write(gcp_key)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _GCP_CREDS_PATH
        except Exception:
            pass


class Settings(BaseSettings):

    # Discord Application — loaded from SSM in Lambda, from .env locally
    discord_public_key: str = ""
    discord_bot_token: str = ""
    discord_application_id: str = ""

    # AWS
    dynamodb_table: str = "trainee-2026-abdullah-MHP_Table"
    aws_region: str = "ap-southeast-1"

    # Discord Role IDs — loaded from SSM in Lambda, from .env locally
    role_team_lead_id: str = ""
    role_admin_id: str = ""

    # Guild Authorization — loaded from SSM in Lambda, from .env locally
    authorized_guild_id: str = ""

    # Timezone & Cut-off
    timezone: str = "Asia/Dhaka"
    default_cutoff_time: str = "23:00"

    # WFH soft limit
    wfh_monthly_limit: int = 5

    # Announcement channel (optional)
    announcement_channel_id: str = ""

    # Google Chat — loaded from SSM in Lambda, from .env locally
    gchat_audience: str = ""
    gchat_authorized_space: str = ""
    gchat_announcement_space: str = ""


# Module-level singleton — initialised on container start
settings = Settings()

# Load secrets from SSM if running in Lambda (SSM_PREFIX is set)
_load_secrets_from_ssm(settings)
