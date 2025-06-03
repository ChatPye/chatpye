#!/bin/bash

# Exit on error
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Update system
log "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
log "Installing Docker..."
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

# Install Docker Engine and Docker Compose plugin
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Create app directory
log "Creating application directory..."
mkdir -p /var/www/chatpye
chown -R $USER:$USER /var/www/chatpye

# Clone the repository (token should be passed as metadata)
log "Cloning repository..."
GITHUB_TOKEN=$(curl -s "http://metadata.google.internal/computeMetadata/v1/instance/attributes/github-token" -H "Metadata-Flavor: Google")
if [ -z "$GITHUB_TOKEN" ]; then
    log "Error: GitHub token not found in instance metadata"
    exit 1
fi

git clone "https://${GITHUB_TOKEN}@github.com/joboyebisi/chatpye.git" /var/www/chatpye

# Navigate to app directory
cd /var/www/chatpye

# Create environment file
log "Creating environment file..."
cat > .env << EOL
MONGODB_URI=mongodb+srv://joboyebisi:SKAcvHtoOvxffK8F@cluster0.euasito.mongodb.net/chatpye_db?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DB_NAME=chatpye_db
OPENAI_API_KEY=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
ANTHROPIC_API_KEY=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
GEMINI_API_KEY=AIzaSyAXqVlTjwfj8fXQazQM7cWWHwi7Kxo7-IE
GOOGLE_AI_KEY=AIzaSyAXqVlTjwfj8fXQazQM7cWWHwi7Kxo7-IE
YOUTUBE_API_KEY=AIzaSyBWGWBlHw2KVKuA59tOXCJSuxHD5_LXDZs
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBTPANcSv0WgbioENoj9ocnw2EL7ot0NgY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=chatpyev0-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=chatpyev0-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=chatpyev0-prod.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=826587156753
NEXT_PUBLIC_FIREBASE_APP_ID=1:826587156753:web:3e1f39c4c7de676b983cb0
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-LWX2C1E1DC
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyAXqVlTjwfj8fXQazQM7cWWHwi7Kxo7-IE
EOL

# Build and start Docker container
log "Building and starting Docker container..."
docker compose up -d --build

# Install and configure Nginx
log "Installing and configuring Nginx..."
apt-get install -y nginx

# Install Certbot for SSL
apt-get install -y certbot python3-certbot-nginx

# Create Nginx configuration
log "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/chatpye << EOF
server {
    listen 80;
    server_name chatpye.com www.chatpye.com;

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
ln -sf /etc/nginx/sites-available/chatpye /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
log "Testing Nginx configuration..."
nginx -t

# Restart Nginx
log "Restarting Nginx..."
systemctl restart nginx

# Setup SSL with Certbot
log "Setting up SSL certificates..."
certbot --nginx -d chatpye.com -d www.chatpye.com --non-interactive --agree-tos --email joboyebisi@gmail.com

# Add Certbot renewal to crontab
echo "0 0 * * * root certbot renew --quiet" >> /etc/crontab

log "Startup script completed successfully!" 