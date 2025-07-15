#!/usr/bin/env sh
cp /usr/share/nginx/html/assets/*.js /tmp

export EXISTING_VARS=$(printenv | awk -F= '{print $1}' | sed 's/^/\$/g' | paste -sd,);

echo "Existing vars: $EXISTING_VARS"

for file in $JSFOLDER;
do
  cat $file | envsubst $EXISTING_VARS < $file | sponge $file
done
nginx -g 'daemon off;'
