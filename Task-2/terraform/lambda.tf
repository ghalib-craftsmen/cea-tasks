# ── Shared Dependencies Layer ─────────────────────────────────────────────────

resource "aws_lambda_layer_version" "shared_deps" {
  layer_name               = "${var.project_prefix}-shared-deps"
  filename                 = "../layer.zip"
  source_code_hash         = filebase64sha256("../layer.zip")
  compatible_runtimes      = [var.lambda_runtime]
  compatible_architectures = [var.lambda_arch]
}

# ── Discord Authorizer ────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "discord_authorizer" {
  name              = "/aws/lambda/${var.project_prefix}-discord-authorizer"
  retention_in_days = 60
}

resource "aws_lambda_function" "discord_authorizer" {
  function_name    = "${var.project_prefix}-discord-authorizer"
  filename         = "../lambda.zip"
  source_code_hash = filebase64sha256("../lambda.zip")
  handler          = "app.discord_authorizer.handler"
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_arch]
  memory_size      = 256
  timeout          = 5
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]

  depends_on = [aws_cloudwatch_log_group.discord_authorizer]
}

# ── Discord ───────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "discord" {
  name              = "/aws/lambda/${var.project_prefix}-discord"
  retention_in_days = 60
}

resource "aws_lambda_function" "discord" {
  function_name    = "${var.project_prefix}-discord"
  filename         = "../lambda.zip"
  source_code_hash = filebase64sha256("../lambda.zip")
  handler          = "app.discord.handler"
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_arch]
  memory_size      = 1024
  timeout          = 15
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]

  environment {
    variables = {
      SSM_PREFIX          = "/${var.project_prefix}"
      DYNAMODB_TABLE      = var.dynamodb_table_name
      TIMEZONE            = var.timezone
      DEFAULT_CUTOFF_TIME = var.default_cutoff_time
      WFH_MONTHLY_LIMIT   = var.wfh_monthly_limit
    }
  }

  depends_on = [aws_cloudwatch_log_group.discord]
}

# ── GChat ─────────────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "gchat" {
  name              = "/aws/lambda/${var.project_prefix}-gchat"
  retention_in_days = 60
}

resource "aws_lambda_function" "gchat" {
  function_name    = "${var.project_prefix}-gchat"
  filename         = "../lambda.zip"
  source_code_hash = filebase64sha256("../lambda.zip")
  handler          = "app.gchat.handler"
  runtime          = var.lambda_runtime
  architectures    = [var.lambda_arch]
  memory_size      = 1024
  timeout          = 15
  role             = aws_iam_role.lambda_exec.arn
  layers           = [aws_lambda_layer_version.shared_deps.arn]

  environment {
    variables = {
      SSM_PREFIX          = "/${var.project_prefix}"
      DYNAMODB_TABLE      = var.dynamodb_table_name
      TIMEZONE            = var.timezone
      DEFAULT_CUTOFF_TIME = var.default_cutoff_time
      WFH_MONTHLY_LIMIT   = var.wfh_monthly_limit
    }
  }

  depends_on = [aws_cloudwatch_log_group.gchat]
}
