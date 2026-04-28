variable "aws_region" {
  description = "AWS deployment region"
  default     = "ap-southeast-1"
}

variable "project_prefix" {
  description = "Prefix for all resource names"
  default     = "trainee-2026-abdullah"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  default     = "trainee-2026-abdullah-MHP_Table"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  default     = "python3.12"
}

variable "lambda_arch" {
  description = "Lambda architecture"
  default     = "arm64"
}

variable "timezone" {
  description = "IANA timezone for cut-off time evaluation"
  default     = "Asia/Dhaka"
}

variable "default_cutoff_time" {
  description = "Daily meal cut-off time (HH:MM)"
  default     = "23:00"
}

variable "wfh_monthly_limit" {
  description = "WFH days soft limit per month"
  default     = "5"
}

# Discord secrets — injected by Jenkins credentials
variable "discord_public_key" {
  description = "Discord application Ed25519 public key"
  sensitive   = true
  default     = ""
}

variable "discord_bot_token" {
  description = "Discord bot token"
  sensitive   = true
  default     = ""
}

variable "discord_application_id" {
  description = "Discord application ID"
  sensitive   = true
  default     = ""
}

variable "discord_role_team_lead_id" {
  description = "Discord role ID for Team Lead"
  sensitive   = true
  default     = ""
}

variable "discord_role_admin_id" {
  description = "Discord role ID for Admin"
  sensitive   = true
  default     = ""
}

variable "discord_guild_id" {
  description = "Authorized Discord guild ID"
  sensitive   = true
  default     = ""
}

# GChat secrets — injected by Jenkins credentials
variable "gchat_authorized_space" {
  description = "Authorized Google Chat space resource name"
  sensitive   = true
  default     = ""
}

variable "gchat_audience" {
  description = "Expected JWT aud claim — set to the API Gateway invoke URL after first deploy"
  default     = ""
}

variable "throttling_burst_limit" {
  description = "API Gateway stage throttling burst limit (max concurrent requests)"
  default     = 10
}

variable "throttling_rate_limit" {
  description = "API Gateway stage throttling rate limit (requests per second)"
  default     = 5
}

variable "gchat_service_account_key" {
  description = "Google Cloud service account JSON key for Chat API"
  sensitive   = true
  default     = ""
}
