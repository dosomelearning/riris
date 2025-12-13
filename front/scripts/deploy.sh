#!/bin/bash

# Define variables
BUCKET_NAME="riris-webapp-ru7btob1t3"
DISTRIBUTION_ID="E1NXWYNQWRNN2Y"
BUILD_DIR="dist"
AWS_PROFILE="dev"


# Exit on error
set -e

echo "Building Vite app..."
npm run build

echo "Syncing '$BUILD_DIR/' to S3 bucket '$BUCKET_NAME' using profile '$AWS_PROFILE'..."
aws s3 sync $BUILD_DIR s3://$BUCKET_NAME \
  --delete \
  --profile $AWS_PROFILE \
  --no-cli-pager \
  --no-cli-auto-prompt \
  --output text

echo "Invalidating CloudFront cache for distribution '$DISTRIBUTION_ID'..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --profile $AWS_PROFILE \
  --no-cli-pager \
  --no-cli-auto-prompt \
  --output text

echo "Deployment completed successfully with profile '$AWS_PROFILE'!"
