output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.cea_backend.public_ip
}

output "api_url" {
  description = "Backend API URL"
  value       = "http://${aws_instance.cea_backend.public_ip}:8000"
}

output "docs_url" {
  description = "FastAPI Swagger docs URL"
  value       = "http://${aws_instance.cea_backend.public_ip}:8000/docs"
}
