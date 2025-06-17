#!/bin/bash

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Google Cloud SDK is not installed. Please install it first."
    exit 1
fi

# Set project ID
PROJECT_ID="chatpyev0-prod"
gcloud config set project $PROJECT_ID

# Instance details
INSTANCE_NAME="chatpye-instance"
ZONE="us-central1-a"

# Copy files to the instance
echo "Copying files to the instance..."
gcloud compute scp --recurse ./* $INSTANCE_NAME:~/chatpye --zone=$ZONE

# SSH into the instance and restart the application
echo "Restarting the application..."
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="cd ~/chatpye && \
    npm install && \
    pm2 restart all"

echo "Deployment completed!" 