# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing multiple NestJS backend services and Vue 3 frontend applications, managed with Yarn workspaces and Turbo. The project provides various utilities services including user management, authentication, printing, and internal tools.

## Requirements

- Node.js 18
- Yarn (v4.1.1)
- MongoDB

## Common Commands

### Development
```bash
# Install dependencies
yarn install

# Run all apps in parallel
yarn dev

# Run specific apps (main development setup)
yarn dev:main  # Runs user, auth, and admin-panel

# Run individual apps using Turbo filters
yarn dev --filter user
yarn dev --filter auth
yarn dev --filter admin-panel
```

### Building & Testing
```bash
# Build all projects (uses Turbo)
yarn build

# Lint all projects
yarn lint

# Format code with Prettier
yarn format
```

### Production
```bash
# Start production build
yarn start:prod  # Runs the built user service
```

## Architecture

### Monorepo Structure

**Apps** (`apps/*`):
- **user** (NestJS) - User management service (port 8001, Swagger at `/docs`)
- **auth** (NestJS) - Authentication service (port 8002, Swagger at `/docs`)
- **admin-panel** (Vue 3 + Vite + Vuetify) - Admin dashboard (port 8000)
- **coach-view** (Vue 3) - Coach interface
- **printing** (NestJS) - Printing service
- **internal** (NestJS) - Internal utilities service
- **sync** (NestJS) - Data synchronization service

**Libs** (`libs/*`):
- **api** - Generated API clients for services (TypeScript types from Swagger)
- **common** - Shared NestJS utilities (decorators, DTOs, guards, types)
- **common-db** - Database module and Mongoose schemas
- **utils** - Utility functions (crypto, etc.)

### Path Aliases

The codebase uses TypeScript path aliases for imports:

- `@libs/common` → `libs/common/src`
- `@libs/common-db` → `libs/common-db/src`
- `@libs/utils` → `libs/utils/src`
- `@app/api` → `libs/api/src`

Jest also has corresponding module name mappers configured.

### NestJS Applications

All NestJS apps follow a similar structure:
- Entry point: `apps/<app-name>/src/main.ts`
- Root module: `apps/<app-name>/src/app.module.ts`
- Configuration via `.env` file (see setup instructions)
- Global modules: ConfigModule, JwtModule
- Database: MongoDB via DatabaseModule from `@libs/common-db`

### Frontend Applications

- **admin-panel**: Vue 3 + Vite + Vuetify + Pinia (state management) + Vue Router
- **coach-view**: Vue 3 application (structure follows typical Vue patterns)
- Both use auto-imports for components and composables

### Build System

Uses Turbo for monorepo build orchestration with dependency-aware execution. The pipeline is configured in `turbo.json`.

### Code Quality

- **Linting**: Biome (configured in lint-staged for pre-commit)
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged (auto-formats TypeScript files on commit)

## Development Setup

1. `yarn install`
2. Create `.env` file based on `.env.example` (if exists)
3. Start MongoDB
4. `yarn dev` or `yarn dev:main` to run services
5. Access services:
   - User service: http://localhost:8001 (Swagger: http://localhost:8001/docs)
   - Auth service: http://localhost:8002 (Swagger: http://localhost:8002/docs)
   - Admin panel: http://localhost:8000

## Key Technologies

- **Backend**: NestJS, MongoDB (Mongoose), BullMQ, Passport JWT
- **Frontend**: Vue 3, Vite, Vuetify, Pinia, Video.js
- **Monorepo**: Yarn workspaces, Turbo
- **Testing**: Jest
- **Build**: TypeScript, Vite (frontend), NestJS CLI (backend)