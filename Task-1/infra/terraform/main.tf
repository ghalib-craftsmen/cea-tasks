provider "aws" {
  region = var.aws_region
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "cea_backend_sg" {
  name        = "cea-task1-backend-sg"
  description = "Allow SSH and backend API access"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  ingress {
    description = "FastAPI"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "cea_backend" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  key_name                    = var.key_pair_name
  vpc_security_group_ids      = [aws_security_group.cea_backend_sg.id]
  associate_public_ip_address = true

  user_data = <<-EOF
    #!/bin/bash
    apt update -y
    apt upgrade -y
    apt install -y python3 python3-pip python3-venv git

    git clone https://github.com/ghalib-craftsmen/cea-tasks.git /home/ubuntu/cea-task1-backend-3

    BACKEND_DIR=/home/ubuntu/cea-task1-backend-3/Task-1/backend

    python3 -m venv $BACKEND_DIR/venv
    $BACKEND_DIR/venv/bin/pip install -r $BACKEND_DIR/requirements.txt

    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    cat > $BACKEND_DIR/.env <<ENVFILE
    SECRET_KEY=$SECRET_KEY
    UVICORN_HOST=0.0.0.0
    WFH_ALLOWANCE=5
    ENVFILE

    cd $BACKEND_DIR && $BACKEND_DIR/venv/bin/python3 scripts/setup_db.py 20 5 7

    chown -R ubuntu:ubuntu /home/ubuntu/cea-task1-backend-3

    cat > /etc/systemd/system/cea-backend.service <<SVCFILE
    [Unit]
    Description=CEA Task-1 FastAPI Backend
    After=network.target

    [Service]
    User=ubuntu
    WorkingDirectory=$BACKEND_DIR
    EnvironmentFile=$BACKEND_DIR/.env
    ExecStart=$BACKEND_DIR/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
    Restart=always
    RestartSec=5

    [Install]
    WantedBy=multi-user.target
    SVCFILE

    systemctl daemon-reload
    systemctl enable cea-backend
    systemctl start cea-backend
  EOF

  tags = {
    Name = "trainee-2026-abdullah-task1-craftsmeal-3"
  }
}
