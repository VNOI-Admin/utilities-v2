#!/bin/bash

# If app name provided, build only that app
if [ $# -eq 1 ]; then
  app_name=$1
  app=apps/$app_name
  if [ -d "$app" ]; then
    docker build -t utilities/$app_name -f $app/Dockerfile .
  else
    echo "App $app_name not found"
  fi
  exit
fi

# For each folder in apps, build docker image

for app in apps/*; do
  if [ -d "$app" ]; then
    app_name=$(basename $app)
    # if Dockerfile not found, skip
    if [ ! -f "$app/Dockerfile" ]; then
      echo "Dockerfile not found in $app"
      continue
    fi
    docker build -t utilities/$app_name -f $app/Dockerfile .
  fi
done
