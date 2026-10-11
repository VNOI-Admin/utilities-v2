#!/usr/bin/env sh
cp /usr/share/nginx/html/assets/*.js /tmp

# Only the public placeholders defined in apps/admin-panel/config/config.json
# (turned into $NAME tokens by the Dockerfile build step) may be substituted.
# Deriving the list from printenv would make every container env var -
# including the JWT secrets, the WireGuard core key and the S3 credentials
# from the shared env file - an eligible placeholder in the publicly served
# bundle. Keep this list in sync with config.json.
export SUBSTITUTIONS='$_comment,$VITE_APP_USER_ENDPOINT,$VITE_APP_AUTH_ENDPOINT,$VITE_APP_INTERNAL_ENDPOINT,$VITE_APP_PRINTING_ENDPOINT,$VITE_APP_APP_ENV'

echo "Substitutions: $SUBSTITUTIONS"

for file in $JSFOLDER;
do
  cat $file | envsubst "$SUBSTITUTIONS" < $file | sponge $file
done
nginx -g 'daemon off;'
