import logging
import os
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)

_GCP_CREDS_PATH = "/tmp/gcp_credentials.json"


# Mapping of settings field → SSM parameter suffix (under SSM_PREFIX/)
_FIELD_TO_SSM: dict[str, str] = {
    "discord_public_key":     "DISCORD_PUBLIC_KEY",
    "discord_bot_token":      "DISCORD_BOT_TOKEN",
    "discord_application_id": "DISCORD_APPLICATION_ID",
    "role_team_lead_id":      "ROLE_TEAM_LEAD_ID",
    "role_admin_id":          "ROLE_ADMIN_ID",
    "authorized_guild_id":    "AUTHORIZED_GUILD_ID",
    "gchat_audience":         "GCHAT_AUDIENCE",
    "gchat_authorized_space": "GCHAT_AUTHORIZED_SPACE",
}

_GCP_SSM_KEY = "GCHAT_SERVICE_ACCOUNT_KEY"


def _write_gcp_key(gcp_key: str) -> None:
    if gcp_key and gcp_key != "pending":
        try:
            with open(_GCP_CREDS_PATH, "w") as f:
                f.write(gcp_key)
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _GCP_CREDS_PATH
        except Exception:
            pass


def _load_secrets_from_ssm(settings: "Settings") -> None:
    prefix = os.environ.get("SSM_PREFIX", "")
    if not prefix:
        return

    # Determine which fields still need to be fetched
    missing_fields = {f: ssm for f, ssm in _FIELD_TO_SSM.items() if not getattr(settings, f)}
    need_gcp = not os.path.exists(_GCP_CREDS_PATH)

    if not missing_fields and not need_gcp:
        logger.info("All secrets loaded from env vars — skipping SSM")
        return

    # Build the exact list of SSM names to fetch (no pagination, single API call)
    names_to_fetch = [f"{prefix}/{ssm}" for ssm in missing_fields.values()]
    if need_gcp:
        names_to_fetch.append(f"{prefix}/{_GCP_SSM_KEY}")

    import boto3
    client = boto3.client("ssm", region_name=settings.aws_region)
    try:
        resp = client.get_parameters(Names=names_to_fetch, WithDecryption=True)
        params = {p["Name"].removeprefix(prefix + "/"): p["Value"] for p in resp["Parameters"]}
        logger.info("Loaded %d SSM parameters", len(params))
    except Exception as exc:
        logger.error("Failed to load SSM parameters: %s", exc)
        return

    for field, ssm_key in missing_fields.items():
        if ssm_key in params:
            setattr(settings, field, params[ssm_key])

    gcp_key = params.get(_GCP_SSM_KEY, "")
    _write_gcp_key(gcp_key)


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

# Write GCP credentials from env var if provided (avoids SSM for gchat Lambda)
_write_gcp_key(os.environ.get("GCHAT_SERVICE_ACCOUNT_KEY", ""))

# Load secrets from SSM only for any fields still missing
_load_secrets_from_ssm(settings)
