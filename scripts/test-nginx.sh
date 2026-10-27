#!/usr/bin/env bash
# Checks the nginx templates with docker and no outside network: they load together, a 5 MB agent upload gets
# through both utilities.conf hosts, the API sees the client's own address whatever X-Forwarded-For claims,
# machines on the contestant/guest tunnel subnets cannot reach login or VPN config on either host, and the admin
# host answers over TLS.
set -euo pipefail
dir=$(cd "$(dirname "$0")/../config/nginx" && pwd)
tmp=$(mktemp -d)
net=nginx-test-$$
vpn=nginx-test-vpn-$$
trap 'docker rm -f nginx-test nginx-test-api >/dev/null 2>&1; docker network rm "$net" "$vpn" >/dev/null 2>&1; rm -rf "$tmp"' EXIT
docker network create --internal "$net" >/dev/null
docker network create --internal --subnet 10.10.0.0/24 "$vpn" >/dev/null

# What certbot adds on the server: TLS on the public and admin hosts; the vpn-private hop verifies the public one.
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=vpn.vnoi.info \
  -addext subjectAltName=DNS:vpn.vnoi.info,DNS:admin.vpn.vnoi.info -keyout "$tmp/key.pem" -out "$tmp/cert.pem" 2>/dev/null
mkdir "$tmp/conf.d"
for conf in "$dir"/*.conf; do
  sed -e 's|listen 80; # Use certbot.*|listen 80; listen 443 ssl; ssl_certificate /etc/nginx/tls/cert.pem; ssl_certificate_key /etc/nginx/tls/key.pem;|' \
    -e 's|/etc/ssl/certs/ca-certificates.crt|/etc/nginx/tls/cert.pem|' "$conf" > "$tmp/conf.d/$(basename "$conf")"
done
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
docker network connect "$vpn" nginx-test-api
server=$(docker inspect -f "{{(index .NetworkSettings.Networks \"$net\").IPAddress}}" nginx-test-api)
vpn_server=$(docker inspect -f "{{(index .NetworkSettings.Networks \"$vpn\").IPAddress}}" nginx-test-api)
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

  for path in /auth/auth/login /user/vpn/config /USER/VPN/config /%61uth/auth/login /user//vpn/config; do
    code=$(docker run --rm --network "$vpn" curlimages/curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" "http://$vpn_server$path")
    [[ $code == 403 ]] || { echo "FAIL $host lets a contestant-subnet client reach $path ($code)"; status=1; }
  done
  code=$(docker run --rm --network "$vpn" curlimages/curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" "http://$vpn_server/user/remote-control/agent/jobs/test/updates")
  [[ $code == 200 ]] || { echo "FAIL $host blocks a contestant-subnet agent ($code)"; status=1; }
  code=$(docker run --rm --network "$net" curlimages/curl -s -o /dev/null -w '%{http_code}' -H "Host: $host" "http://$server/user/vpn/config")
  [[ $code == 200 ]] || { echo "FAIL $host blocks VPN config for a client off the tunnel ($code)"; status=1; }
done

code=$(docker run --rm --network "$net" -v "$tmp/cert.pem:/cert.pem:ro" curlimages/curl -s -o /dev/null -w '%{http_code}' \
  --cacert /cert.pem --resolve "admin.vpn.vnoi.info:443:$server" https://admin.vpn.vnoi.info/services/user/vpn/config)
[[ $code == 200 ]] || { echo "FAIL admin.vpn.vnoi.info does not answer over HTTPS ($code)"; status=1; }
exit $status
