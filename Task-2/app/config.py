import os
import boto3
from pydantic_settings import BaseSettings


def _get_ssm(name: str, prefix: str, client) -> str:
    """Fetch a single SSM parameter value."""
    response = client.get_parameter(Name=f"{prefix}/{name}")
    return response["Parameter"]["Value"]


def _load_secrets_from_ssm(settings: "Settings") -> None:
    """
    Fetch all sensitive settings from SSM Parameter Store and update the
    settings object in place. Called during init and after SnapStart restore.
    """
    prefix = os.environ.get("SSM_PREFIX", "")
    if not prefix:
        return

    client = boto3.client("ssm", region_name=settings.aws_region)

    settings.discord_public_key     = _get_ssm("DISCORD_PUBLIC_KEY",     prefix, client)
    settings.discord_bot_token      = _get_ssm("DISCORD_BOT_TOKEN",      prefix, client)
    settings.discord_application_id = _get_ssm("DISCORD_APPLICATION_ID", prefix, client)
    settings.role_team_lead_id      = _get_ssm("ROLE_TEAM_LEAD_ID",      prefix, client)
    settings.role_admin_id          = _get_ssm("ROLE_ADMIN_ID",          prefix, client)
    settings.authorized_guild_id    = _get_ssm("AUTHORIZED_GUILD_ID",    prefix, client)
    settings.gchat_audience         = _get_ssm("GCHAT_AUDIENCE",         prefix, client)
    settings.gchat_authorized_space = _get_ssm("GCHAT_AUTHORIZED_SPACE", prefix, client)


class Settings(BaseSettings):

    # Discord Application — loaded from SSM in Lambda, from .env locally
    discord_public_key: str = ""
    discord_bot_token: str = ""
    discord_application_id: str = ""

    # AWS
    dynamodb_table: str = "trainee-2026-abdullah-MHP_Table"
    aws_region: str = "ap-southeast-1"
    command_lambda_name: str = "trainee-2026-abdullah-command"

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


# ── SnapStart after-restore hook ──────────────────────────────────────────────
# Registered only when running in Lambda. After a SnapStart restore, secrets
# are refreshed so the restored snapshot never serves stale values.
def _after_restore(event, context):  # noqa: ARG001
    _load_secrets_from_ssm(settings)


try:
    import awslambdaric.bootstrap as _bootstrap  # type: ignore
    _bootstrap.register_after_restore(_after_restore)
except ImportError:
    pass  # Not running in Lambda (local dev) — hook registration is a no-op
