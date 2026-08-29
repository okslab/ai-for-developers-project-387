import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import guest, owner

# The store is in-memory and its occupancy rule is enforced by an in-process
# lock, so correctness requires exactly one process. Fail fast on any
# env-driven worker count (belt-and-braces to the `--workers 1` pinned at every
# launch point) so a misconfiguration can't silently allow double-booking.
def _guard_single_process() -> None:
    for var in ("WEB_CONCURRENCY", "GUNICORN_WORKERS"):
        value = os.environ.get(var)
        if value is not None and value != "1":
            raise RuntimeError(
                f"{var}={value!r}: the backend must run as a single process; "
                "the in-memory store is per-process and multiple workers/replicas "
                "would allow double-booking. Set it to 1 or unset it."
            )


_guard_single_process()

app = FastAPI(title="Appointment Booking API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": detail["code"], "message": detail["message"]},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": "ERROR", "message": str(detail)},
    )


app.include_router(guest.router)
app.include_router(owner.router)
