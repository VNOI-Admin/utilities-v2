#!/usr/bin/env bash
# Checks the nginx templates with docker and no outside network: they load together, and an agent upload of
# a few MB gets past both utilities.conf hops (a 502 from the private hop is fine: its upstream is offline).
set -euo pipefail
dir=$(cd "$(dirname "$0")/../config/nginx" && pwd)
tmp=$(mktemp -d)
trap 'docker rm -f nginx-test-net >/dev/null 2>&1; rm -rf "$tmp"' EXIT
head -c 5000000 /dev/urandom > "$tmp/upload.bin"

docker run -d --name nginx-test-net --network none python:3-alpine python3 -c '
import http.server
class H(http.server.BaseHTTPRequestHandler):
    def do_POST(s):
        s.rfile.read(int(s.headers["Content-Length"])); s.send_response(200); s.end_headers()
http.server.HTTPServer(("127.0.0.1", 8001), H).serve_forever()' >/dev/null

mounts=()
for f in "$dir"/*.conf; do mounts+=(-v "$f:/etc/nginx/conf.d/$(basename "$f"):ro"); done
docker run --rm --network container:nginx-test-net "${mounts[@]}" --entrypoint nginx nginx:stable -t -q
docker run -d --rm --name nginx-test --network container:nginx-test-net "${mounts[@]}" nginx:stable >/dev/null
trap 'docker rm -f nginx-test nginx-test-net >/dev/null 2>&1; rm -rf "$tmp"' EXIT
sleep 2

status=0
for host in vpn.vnoi.info vpn-private.vnoi.info; do
  code=$(docker run --rm --network container:nginx-test-net -v "$tmp/upload.bin:/upload.bin:ro" curlimages/curl \
    -s -o /dev/null -w '%{http_code}' -H "Host: $host" -F 'payload={}' -F 'files=@/upload.bin' \
    http://127.0.0.1/user/remote-control/agent/jobs/test/updates)
  if [[ $code == 413 ]]; then echo "FAIL $host rejects a 5 MB agent upload"; status=1; fi
done
exit $status
