#!/bin/bash

# Update system and install dependencies
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y \
    curl \
    git \
    build-essential \
    nodejs \
    npm

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/chatpye
sudo chown -R $USER:$USER /var/www/chatpye

# Clone repository (replace with your repo URL)
git clone https://github.com/joboyebisi/chatpye.git /var/www/chatpye

# Navigate to app directory
cd /var/www/chatpye

# Install dependencies
npm install

# Build the application
npm run build

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

# Start the application with PM2
pm2 start npm --name "chatpye" -- start
pm2 save
pm2 startup

# Setup Nginx as reverse proxy
sudo apt-get install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/chatpye << EOF
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
sudo ln -s /etc/nginx/sites-available/chatpye /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Setup SSL with Certbot
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

echo "Deployment completed successfully!" 