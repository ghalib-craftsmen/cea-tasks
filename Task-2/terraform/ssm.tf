# ── Discord secrets ───────────────────────────────────────────────────────────

resource "aws_ssm_parameter" "discord_public_key" {
  name  = "/${var.project_prefix}/DISCORD_PUBLIC_KEY"
  type  = "String"
  value = var.discord_public_key
}

resource "aws_ssm_parameter" "discord_bot_token" {
  name  = "/${var.project_prefix}/DISCORD_BOT_TOKEN"
  type  = "String"
  value = var.discord_bot_token
}

resource "aws_ssm_parameter" "discord_application_id" {
  name  = "/${var.project_prefix}/DISCORD_APPLICATION_ID"
  type  = "String"
  value = var.discord_application_id
}

resource "aws_ssm_parameter" "discord_role_team_lead_id" {
  name  = "/${var.project_prefix}/ROLE_TEAM_LEAD_ID"
  type  = "String"
  value = var.discord_role_team_lead_id
}

resource "aws_ssm_parameter" "discord_role_admin_id" {
  name  = "/${var.project_prefix}/ROLE_ADMIN_ID"
  type  = "String"
  value = var.discord_role_admin_id
}

resource "aws_ssm_parameter" "discord_guild_id" {
  name  = "/${var.project_prefix}/AUTHORIZED_GUILD_ID"
  type  = "String"
  value = var.discord_guild_id
}

# ── GChat secrets ─────────────────────────────────────────────────────────────

resource "aws_ssm_parameter" "gchat_authorized_space" {
  name  = "/${var.project_prefix}/GCHAT_AUTHORIZED_SPACE"
  type  = "String"
  value = var.gchat_authorized_space
}

resource "aws_ssm_parameter" "gchat_audience" {
  name  = "/${var.project_prefix}/GCHAT_AUDIENCE"
  type  = "String"
  value = var.gchat_audience != "" ? var.gchat_audience : "pending"
}
