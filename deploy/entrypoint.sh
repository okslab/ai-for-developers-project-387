#!/bin/sh
set -e

# The backend keeps bookings in a single in-memory process; the occupancy rule
# is enforced by an in-process lock. Multiple uvicorn workers or replicas would
# each hold their own store and allow the same slot to be double-booked, so we
# refuse to start on a misconfigured worker count.
for var in WEB_CONCURRENCY GUNICORN_WORKERS; do
    eval "value=\${$var:-}"
    if [ -n "$value" ] && [ "$value" != "1" ]; then
        echo "ERROR: $var=$value — the backend must run as a single process. Set it to 1 or unset it; scaling horizontally is unsupported and double-books slots." >&2
        exit 1
    fi
done

if [ -n "$RAILWAY_REPLICA_ID" ]; then
    echo "WARNING: running on Railway replica $RAILWAY_REPLICA_ID — this service must stay at exactly 1 replica; the in-memory store is per-process."
fi

envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "nginx -t:"
nginx -t

uvicorn app.main:app --host 127.0.0.1 --port 8080 --workers 1 &

echo "starting nginx on PORT=${PORT}..."
exec nginx -g 'daemon off;'
