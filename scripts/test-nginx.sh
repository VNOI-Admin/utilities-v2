#!/usr/bin/env bash
# Checks the nginx templates with docker and no outside network: they load together, a 5 MB agent upload gets
# through both utilities.conf hosts, and the API sees the client's own address whatever X-Forwarded-For claims.
set -euo pipefail
dir=$(cd "$(dirname "$0")/../config/nginx" && pwd)
tmp=$(mktemp -d)
net=nginx-test-$$
trap 'docker rm -f nginx-test nginx-test-api >/dev/null 2>&1; docker network rm "$net" >/dev/null 2>&1; rm -rf "$tmp"' EXIT
docker network create --internal "$net" >/dev/null

# What certbot adds on the server: TLS on the public host, which the vpn-private hop verifies.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=vpn.vnoi.info -addext subjectAltName=DNS:vpn.vnoi.info \
  -keyout "$tmp/key.pem" -out "$tmp/cert.pem" 2>/dev/null
mkdir "$tmp/conf.d"
cp "$dir"/*.conf "$tmp/conf.d/"
sed -e 's|listen 80; # Use certbot.*|listen 80; listen 443 ssl; ssl_certificate /etc/nginx/tls/cert.pem; ssl_certificate_key /etc/nginx/tls/key.pem;|' \
  -e 's|/etc/ssl/certs/ca-certificates.crt|/etc/nginx/tls/cert.pem|' "$dir/utilities.conf" > "$tmp/conf.d/utilities.conf"
head -c 5000000 /dev/urandom > "$tmp/upload.bin"

docker run -d --name nginx-test-api --network "$net" python:3-alpine python3 -c '
import http.server
class H(http.server.BaseHTTPRequestHandler):
    def reply(s):
        s.rfile.read(int(s.headers["Content-Length"] or 0))
        body = (s.headers["X-Real-IP"] or "").encode()
        s.send_response(200); s.send_header("Content-Length", str(len(body))); s.end_headers(); s.wfile.write(body)
    do_GET = do_POST = reply
http.server.HTTPServer(("127.0.0.1", 8001), H).serve_forever()' >/dev/null

mounts=(-v "$tmp/conf.d:/etc/nginx/conf.d:ro" -v "$tmp:/etc/nginx/tls:ro")
docker run --rm --network container:nginx-test-api "${mounts[@]}" --entrypoint nginx nginx:stable -t -q
docker run -d --name nginx-test --network container:nginx-test-api "${mounts[@]}" nginx:stable >/dev/null
server=$(docker inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" nginx-test-api)
sleep 2

client() {
  docker run --rm --network "$net" -v "$tmp/upload.bin:/upload.bin:ro" --entrypoint sh curlimages/curl -c \
    'echo "$(hostname -i) $(curl -s -w " %{http_code}" "$@" "http://'"$server"'/user/remote-control/agent/jobs/test/updates")"' _ "$@"
}

status=0
for host in vpn.vnoi.info vpn-private.vnoi.info; do
  read -r ip code < <(client -o /dev/null -H "Host: $host" -F 'payload={}' -F 'files=@/upload.bin')
  [[ $code == 200 ]] || { echo "FAIL $host answers $code to a 5 MB agent upload"; status=1; }

  read -r ip seen code < <(client -H "Host: $host" -H 'X-Forwarded-For: 10.10.0.99')
  [[ $seen == "$ip" ]] || { echo "FAIL $host: API saw X-Real-IP '$seen' for client $ip (code $code)"; status=1; }
done
exit $status
