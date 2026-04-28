output "api_gateway_url" {
  description = "API Gateway invoke URL — use this as GCHAT_AUDIENCE"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "discord_interactions_url" {
  description = "Discord interactions endpoint"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/discord/interactions"
}

output "gchat_interactions_url" {
  description = "Google Chat interactions endpoint"
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/gchat/interactions"
}

output "discord_lambda_arn" {
  value = aws_lambda_function.discord.arn
}

output "gchat_lambda_arn" {
  value = aws_lambda_function.gchat.arn
}

output "discord_lambda_invoke_arn" {
  value = aws_lambda_function.discord.invoke_arn
}

output "gchat_lambda_invoke_arn" {
  value = aws_lambda_function.gchat.invoke_arn
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.mhp_table.name
}
