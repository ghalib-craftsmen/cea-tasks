output "api_gateway_url" {
  description = "API Gateway invoke URL — use this as GCHAT_AUDIENCE"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "discord_interactions_url" {
  description = "Discord interactions endpoint"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/interactions"
}

output "gchat_interactions_url" {
  description = "Google Chat interactions endpoint"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/gchat/interactions"
}

output "discord_router_arn" {
  value = aws_lambda_function.discord_router.arn
}

output "gchat_router_arn" {
  value = aws_lambda_function.gchat_router.arn
}

output "command_lambda_arn" {
  value = aws_lambda_function.command.arn
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.mhp_table.name
}
