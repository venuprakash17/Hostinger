#!/bin/bash
# EC2 User Data Script - Runs on first boot
# This prepares the instance for deployment

# Update system
apt-get update
apt-get upgrade -y

# Install basic tools
apt-get install -y git curl wget

# Install Python 3.11
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update
apt-get install -y python3.11 python3.11-venv python3-pip

# Install Docker
apt-get install -y docker.io
systemctl start docker
systemctl enable docker
usermod -aG docker ubuntu

# Install Nginx
apt-get install -y nginx

# Create deployment directory
mkdir -p /home/ubuntu/deploy
chown ubuntu:ubuntu /home/ubuntu/deploy

# Log completion
echo "EC2 initialization complete" > /var/log/user-data.log

