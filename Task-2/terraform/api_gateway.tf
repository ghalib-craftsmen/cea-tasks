resource "aws_apigatewayv2_api" "mhp_api" {
  name          = "${var.project_prefix}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.mhp_api.id
  name        = "$default"
  auto_deploy = true
}

# ── Integrations ──────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "discord" {
  api_id                 = aws_apigatewayv2_api.mhp_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.discord.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "gchat" {
  api_id                 = aws_apigatewayv2_api.mhp_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.gchat.invoke_arn
  payload_format_version = "2.0"
}

# ── Authorizers ───────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_authorizer" "gchat_jwt" {
  api_id           = aws_apigatewayv2_api.mhp_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_prefix}-gchat-jwt"

  jwt_configuration {
    audience = [var.gchat_audience]
    issuer   = "https://accounts.google.com"
  }
}

resource "aws_apigatewayv2_authorizer" "discord_request" {
  api_id                            = aws_apigatewayv2_api.mhp_api.id
  authorizer_type                   = "REQUEST"
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  identity_sources                  = ["$request.header.X-Signature-Ed25519", "$request.header.X-Signature-Timestamp"]
  authorizer_uri                    = aws_lambda_function.discord_authorizer.invoke_arn
  authorizer_result_ttl_in_seconds  = 0
  name                              = "${var.project_prefix}-discord-request"
}

# ── Routes ────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "discord_interactions" {
  api_id             = aws_apigatewayv2_api.mhp_api.id
  route_key          = "POST /discord/interactions"
  target             = "integrations/${aws_apigatewayv2_integration.discord.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.discord_request.id
}

resource "aws_apigatewayv2_route" "gchat_interactions" {
  api_id             = aws_apigatewayv2_api.mhp_api.id
  route_key          = "POST /gchat/interactions"
  target             = "integrations/${aws_apigatewayv2_integration.gchat.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.gchat_jwt.id
}

# ── Lambda Permissions ────────────────────────────────────────────────────────

resource "aws_lambda_permission" "discord" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discord.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mhp_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "gchat" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.gchat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mhp_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "discord_authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discord_authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mhp_api.execution_arn}/authorizers/*"
}
