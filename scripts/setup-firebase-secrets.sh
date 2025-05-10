#!/bin/bash

# colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Firebase Secrets Setup Helper${NC}"
echo "This script will help you set up your Firebase secrets in GitHub."
echo "Please have your Firebase project configuration ready."
echo

# Function to prompt for a secret
prompt_secret() {
    local name=$1
    local description=$2
    echo -e "${YELLOW}Enter your $description:${NC}"
    read -p "> " value
    echo
    echo "To add this secret to GitHub, run:"
    echo -e "${GREEN}gh secret set $name \"$value\"${NC}"
    echo
}

echo -e "${YELLOW}Step 1: Install GitHub CLI${NC}"
echo "If you haven't installed the GitHub CLI, run:"
echo -e "${GREEN}brew install gh${NC}"
echo

echo -e "${YELLOW}Step 2: Login to GitHub CLI${NC}"
echo "Run:"
echo -e "${GREEN}gh auth login${NC}"
echo

echo -e "${YELLOW}Step 3: Set up your Firebase secrets${NC}"
echo "For each prompt below, enter the corresponding value from your Firebase project settings."
echo "You can find these in your Firebase Console under Project Settings > General > Your apps > Web app"
echo

prompt_secret "NEXT_PUBLIC_FIREBASE_API_KEY" "Firebase API Key"
prompt_secret "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "Firebase Auth Domain (usually project-id.firebaseapp.com)"
prompt_secret "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "Firebase Project ID"
prompt_secret "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "Firebase Storage Bucket (usually project-id.appspot.com)"
prompt_secret "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "Firebase Messaging Sender ID"
prompt_secret "NEXT_PUBLIC_FIREBASE_APP_ID" "Firebase App ID"
prompt_secret "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" "Firebase Measurement ID (if you have Google Analytics enabled)"

echo -e "${YELLOW}Step 4: Verify your secrets${NC}"
echo "After setting all secrets, you can verify them by running:"
echo -e "${GREEN}gh secret list${NC}"
echo

echo -e "${YELLOW}Step 5: Trigger a new deployment${NC}"
echo "After setting all secrets, you can trigger a new deployment by running:"
echo -e "${GREEN}gh workflow run deploy.yml${NC}"
echo

echo -e "${GREEN}Setup complete!${NC}"
echo "Remember to keep your Firebase configuration values secure and never commit them to your repository." 