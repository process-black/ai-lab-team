#!/bin/bash
# Usage: ./scripts/heroku_env_push.sh [HEROKU_APP_NAME]
# Loops through .env.dev in the project root and sets Heroku config vars

ENV_FILE=".env.heroku"
HEROKU_APP_NAME="$1"

if [ ! -f "$ENV_FILE" ]; then
  echo "File $ENV_FILE does not exist."
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  # Skip comments and empty lines
  if [[ "$line" =~ ^# ]] || [[ -z "$line" ]]; then
    continue
  fi
  # Only process lines that look like KEY=VALUE
  if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
    var_name=$(echo "$line" | cut -d '=' -f 1)
    var_value=$(echo "$line" | cut -d '=' -f 2-)
    # Escape single quotes in value
    safe_value=$(printf "%s" "$var_value" | sed "s/'/'\\''/g")
    if [ -z "$HEROKU_APP_NAME" ]; then
      echo "heroku config:set $var_name='$safe_value'"
      heroku config:set "$var_name=$safe_value"
    else
      echo "heroku config:set $var_name='$safe_value' --app $HEROKU_APP_NAME"
      heroku config:set "$var_name=$safe_value" --app "$HEROKU_APP_NAME"
    fi
  fi
done < "$ENV_FILE"
