# TripMates API

## Overview
This lightweight backend is included to provide production-ready API scaffolding for the TripMates frontend.

It exposes endpoints for:
- trip listing and creation
- draft/publish lifecycle
- destination suggestions
- weather lookups
- AI trip planning
- image upload
- compatibility recommendations

## Run locally

```bash
npm run dev:server
```

The API listens on port 4000 by default.

## Available endpoints

- `GET /api/health`
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/:id`
- `POST /api/trips/:id/publish`
- `POST /api/trips/:id/draft`
- `GET /api/destinations?q=...`
- `GET /api/weather?city=...`
- `GET /api/trips/:id/recommendations`
- `POST /api/trips/:id/ai-plan`
- `POST /api/upload`

## Authentication and Prisma
The app is built to work without a database when the local environment is not configured. If `DATABASE_URL` is set, the server will use Prisma as the persistence layer as a first-class production option.
