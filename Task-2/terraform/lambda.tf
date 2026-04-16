# ── Discord Router ────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "discord_router" {
  name              = "/aws/lambda/${var.project_prefix}-discord-router"
  retention_in_days = 60
}

resource "aws_lambda_function" "discord_router" {
  function_name    = "${var.project_prefix}-discord-router"
  filename         = "../lambda.zip"
  source_code_hash = filebase64sha256("../lambda.zip")
  handler          = "app.router.handler"
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_arch]
  memory_size      = 256
  timeout          = 60
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      DISCORD_PUBLIC_KEY     = var.discord_public_key
      DISCORD_BOT_TOKEN      = var.discord_bot_token
      DISCORD_APPLICATION_ID = var.discord_application_id
      ROLE_TEAM_LEAD_ID      = var.discord_role_team_lead_id
      ROLE_ADMIN_ID          = var.discord_role_admin_id
      AUTHORIZED_GUILD_ID    = var.discord_guild_id
      COMMAND_LAMBDA_NAME    = "${var.project_prefix}-command"
      DYNAMODB_TABLE         = var.dynamodb_table_name
      TIMEZONE               = var.timezone
      DEFAULT_CUTOFF_TIME    = var.default_cutoff_time
      WFH_MONTHLY_LIMIT      = var.wfh_monthly_limit
    }
  }

  depends_on = [aws_cloudwatch_log_group.discord_router]
}

# ── GChat Router ──────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "gchat_router" {
  name              = "/aws/lambda/${var.project_prefix}-gchat-router"
  retention_in_days = 60
}

resource "aws_lambda_function" "gchat_router" {
  function_name    = "${var.project_prefix}-gchat-router"
  filename         = "../lambda.zip"
  source_code_hash = filebase64sha256("../lambda.zip")
  handler          = "app.gchat_router.handler"
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_arch]
  memory_size      = 256
  timeout          = 60
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      GCHAT_AUDIENCE         = var.gchat_audience
      GCHAT_AUTHORIZED_SPACE = var.gchat_authorized_space
      COMMAND_LAMBDA_NAME    = "${var.project_prefix}-command"
      DYNAMODB_TABLE         = var.dynamodb_table_name
      TIMEZONE               = var.timezone
      DEFAULT_CUTOFF_TIME    = var.default_cutoff_time
      WFH_MONTHLY_LIMIT      = var.wfh_monthly_limit
    }
  }

  depends_on = [aws_cloudwatch_log_group.gchat_router]
}

# ── Command Lambda ────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "command" {
  name              = "/aws/lambda/${var.project_prefix}-command"
  retention_in_days = 60
}

resource "aws_lambda_function" "command" {
  function_name    = "${var.project_prefix}-command"
  filename         = "../lambda.zip"
  source_code_hash = filebase64sha256("../lambda.zip")
  handler          = "app.handler.handler"
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_arch]
  memory_size      = 512
  timeout          = 60
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      DISCORD_BOT_TOKEN      = var.discord_bot_token
      DISCORD_APPLICATION_ID = var.discord_application_id
      DYNAMODB_TABLE         = var.dynamodb_table_name
      TIMEZONE               = var.timezone
      DEFAULT_CUTOFF_TIME    = var.default_cutoff_time
      WFH_MONTHLY_LIMIT      = var.wfh_monthly_limit
    }
  }

  depends_on = [aws_cloudwatch_log_group.command]
}
