#!/bin/bash

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
