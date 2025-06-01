#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /var/www/chatpye
chown -R $USER:$USER /var/www/chatpye

# Clone the repository
git clone https://github.com/joboyebisi/chatpye.git /var/www/chatpye

# Navigate to app directory
cd /var/www/chatpye

# Create environment file
cat > .env << EOL
MONGODB_URI=${MONGODB_URI}
GOOGLE_AI_KEY=${GOOGLE_AI_KEY}
PUBLIC_FIREBASE_API_KEY=${PUBLIC_FIREBASE_API_KEY}
PUBLIC_FIREBASE_AUTH_DOMAIN=${PUBLIC_FIREBASE_AUTH_DOMAIN}
PUBLIC_FIREBASE_PROJECT_ID=${PUBLIC_FIREBASE_PROJECT_ID}
PUBLIC_FIREBASE_STORAGE_BUCKET=${PUBLIC_FIREBASE_STORAGE_BUCKET}
PUBLIC_FIREBASE_MEASUREMENT_ID=${PUBLIC_FIREBASE_MEASUREMENT_ID}
EOL

# Build and start Docker container
docker build -t chatpye .
docker run -d \
    --name chatpye \
    --restart unless-stopped \
    -p 3000:3000 \
    --env-file .env \
    chatpye

# Install and configure Nginx
apt-get install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/chatpye << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/chatpye /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx 