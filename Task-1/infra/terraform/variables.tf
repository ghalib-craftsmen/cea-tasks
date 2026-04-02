variable "aws_region" {
  description = "AWS region to deploy the instance"
  type        = string
  default     = "ap-southeast-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "Name of the existing AWS key pair for SSH access"
  type        = string
}

variable "my_ip" {
  description = "Your public IP for SSH access (e.g. 203.0.113.0/32)"
  type        = string
}
