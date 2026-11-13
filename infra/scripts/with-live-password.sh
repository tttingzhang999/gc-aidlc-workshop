#!/usr/bin/env bash
# Reads the workshop test-user password from the live stack output so it never lives in the repo.
set -euo pipefail

WORKSHOP_TEST_USER_PASSWORD="$(aws cloudformation describe-stacks \
  --stack-name workshop-stack --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='AIDLCPlatformPassword'].OutputValue" \
  --output text)"

if [[ -z "$WORKSHOP_TEST_USER_PASSWORD" || "$WORKSHOP_TEST_USER_PASSWORD" == "None" ]]; then
  echo "Could not read AIDLCPlatformPassword from workshop-stack outputs" >&2
  exit 1
fi

export WORKSHOP_TEST_USER_PASSWORD
exec npx "$@"
