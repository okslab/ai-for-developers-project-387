# Backend — Appointment Booking API

FastAPI implementation of the API contract in `contract/openapi/openapi.yaml`
(single source of truth: `contract/` TypeSpec). Uses **in-memory storage** — data is
reset on restart (intentional for this step).

## Stack

- Python 3.12+, FastAPI, Pydantic v2
- No database; a thread-safe in-memory store (`app/storage.py`)

## Run

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --workers 1 --port 8000
```

- API: http://localhost:8000
- Docs (Swagger UI): http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

Point the frontend at the backend by setting
`VITE_API_BASE_URL=http://localhost:8000` in `frontend/.env`.

## Deployment constraint — single process only

The backend keeps bookings in an **in-memory** store whose occupancy rule is
enforced by an in-process lock (`app/storage.py`). That guarantee only holds
within a single process, so the backend **must run with exactly one uvicorn
worker** (`--workers 1`) and **must not be scaled to multiple replicas**.
Running several workers/replicas gives each its own store and lock, letting the
same slot be double-booked. This is enforced at startup: `deploy/entrypoint.sh`
and `app/main.py` refuse to boot if `WEB_CONCURRENCY`/`GUNICORN_WORKERS` is set
to anything but `1`.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/owner/event-types` | Create event type → `201` |
| GET | `/owner/event-types` | List event types (admin) |
| GET | `/owner/bookings` | Upcoming meetings (`endsAt >= from`, optional `from`) |
| GET | `/event-types` | Booking-kinds page |
| GET | `/event-types/{id}` | Single event type; `404` if missing |
| GET | `/event-types/{id}/slots` | Free slots in 14-day window (`from`/`to` clamped) |
| POST | `/bookings` | Create booking; `201`/`404`/`409`/`422` |

## Business rules

- **Occupancy rule:** no two bookings may overlap in time, even across event types;
  enforced server-side at creation (`409` on overlap) and reflected in slot listings.
- **Booking window:** slots generated on a 30-minute grid for 14 calendar days from
  server "now" (UTC); `POST /bookings` rejects start times outside the window (`422`).
- **Duration** always comes from the event type; `endsAt` is derived server-side.
