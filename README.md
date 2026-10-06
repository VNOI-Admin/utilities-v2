# Utilities V2

Backend services and admin panel for VNOI contests: accounts and login, contestant VPN configs, machine
monitoring, remote control of contest machines, overlays and printing.

| App | Port | What it does |
|---|---|---|
| `admin-panel` | 8000 | Vue admin UI |
| `user` | 8001 | User-facing API: VPN config, machine reports, remote-control agent endpoints |
| `auth` | 8002 | Login and token refresh |
| `internal` | 8003 | Admin API: users, VPN sync, remote control, overlays, reactions |
| `printing` | 8004 | Print queue |
| `sync` | 8005 | Contest data sync from VNOJ |

The NestJS services serve Swagger UI at `/docs`.

## Requirements

- Node.js 20 (the Dockerfiles build on `node:20-alpine`)
- Yarn 4, through Corepack: `corepack enable`
- Docker, for MongoDB and Redis

## Development setup

1. Install dependencies:

   ```bash
   corepack enable
   yarn install
   ```

2. Create `.env` from the sample. Every NestJS service reads it from the repo root.

   ```bash
   cp .env.sample .env
   ```

   Then edit it:
   - Set `JWT_ACCESS_TOKEN_SECRET` and `JWT_REFRESH_TOKEN_SECRET` to random strings, for example from
     `openssl rand -hex 32`.
   - Set `SECURE_COOKIES="false"` so login cookies work over plain HTTP.
   - Set `REDIS_PASSWORD=""`: the compose Redis has no password.
   - Leave the WireGuard, wg-portal, VNOJ and S3 values as they are unless you work on those features (see below).

3. Start MongoDB and Redis:

   ```bash
   docker compose up -d mongo redis
   ```

4. Point the admin panel at the services. Vite reads `apps/admin-panel/.env`:

   ```bash
   cat > apps/admin-panel/.env <<'EOF'
   VITE_APP_USER_ENDPOINT=http://localhost:8001
   VITE_APP_AUTH_ENDPOINT=http://localhost:8002
   VITE_APP_INTERNAL_ENDPOINT=http://localhost:8003
   VITE_APP_PRINTING_ENDPOINT=http://localhost:8004
   EOF
   ```

5. Run the services:

   ```bash
   yarn dev:main                         # user, auth, internal and admin-panel
   yarn dev --filter user --filter auth  # or pick apps
   ```

6. Open http://localhost:8000 and log in as `admin` / `admin`. `internal` creates this account on its first
   start; change the password before using the setup for anything real.

### Optional parts

These need outside services. Without them the rest still runs, and the affected feature logs errors.

- **VPN peers**: `internal` pushes peers to [wg-portal](https://github.com/h44z/wg-portal) at
  `WG_PORTAL_BASE_URL`. `docker-compose.yaml` has a `wg_portal` service, but it runs on the host network and
  manages `/etc/wireguard`, so only start it on a machine meant to be the VPN server.
- **Contest data**: `sync` and the overlays read VNOJ through `VNOJ_API_BASE_URL` and `VNOJ_API_KEY`.
- **Reactions**: rendering needs `ffmpeg` on the path, the assets under `REACTION_RENDERER_*`, and an S3 bucket
  in `REACTION_S3_*`.

## Tests and lint

```bash
yarn jest                      # all specs
yarn jest apps/user/src/vpn    # one folder
npx biome check apps libs
```

## Docker

Each app has a Dockerfile; `scripts/build.sh` builds them all as `utilities/<app>` (or one: `scripts/build.sh user`).
The compose file reads `.docker.env`:

```bash
scripts/build.sh
cp .docker.env.sample .docker.env   # then fill in the secrets
docker compose up -d
```

`config/nginx/` holds the nginx templates for the public API, admin and judge hosts.
