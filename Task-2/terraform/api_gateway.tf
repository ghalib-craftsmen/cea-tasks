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

resource "aws_apigatewayv2_integration" "discord_router" {
  api_id                 = aws_apigatewayv2_api.mhp_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.discord_router.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "gchat_router" {
  api_id                 = aws_apigatewayv2_api.mhp_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.gchat_router.invoke_arn
  payload_format_version = "2.0"
}

# ── Routes ────────────────────────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "discord_interactions" {
  api_id    = aws_apigatewayv2_api.mhp_api.id
  route_key = "POST /interactions"
  target    = "integrations/${aws_apigatewayv2_integration.discord_router.id}"
}

resource "aws_apigatewayv2_route" "gchat_interactions" {
  api_id    = aws_apigatewayv2_api.mhp_api.id
  route_key = "POST /gchat/interactions"
  target    = "integrations/${aws_apigatewayv2_integration.gchat_router.id}"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.mhp_api.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.discord_router.id}"
}

# ── Lambda Permissions ────────────────────────────────────────────────────────

resource "aws_lambda_permission" "discord_router" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discord_router.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mhp_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "gchat_router" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.gchat_router.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.mhp_api.execution_arn}/*/*"
}
