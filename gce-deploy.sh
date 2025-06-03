#!/bin/bash

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Google Cloud SDK is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "Please authenticate with Google Cloud first:"
    gcloud auth login
fi

# Set project ID
PROJECT_ID="chatpyev0-prod"
gcloud config set project $PROJECT_ID

# Create the instance
echo "Creating Google Compute Engine instance..."
gcloud compute instances create chatpye-instance \
    --source-instance-template=chatpye-template \
    --zone=us-central1-a

# Get the external IP
EXTERNAL_IP=$(gcloud compute instances describe chatpye-instance \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "Instance created successfully!"
echo "External IP: $EXTERNAL_IP"
echo "Please wait a few minutes for the startup script to complete."
echo "You can check the status with: gcloud compute ssh chatpye-instance --zone=us-central1-a" 