#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_TMP_DIR="${BACKUP_TMP_DIR:-./.backup-tmp}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-tiedan_web_uploads_data}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

: "${POSTGRES_DB:?POSTGRES_DB must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${BACKUP_REMOTE:?BACKUP_REMOTE must point to an rclone crypt remote}"

STAMP="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="$BACKUP_TMP_DIR/$STAMP"
DB_FILE="$WORK_DIR/postgres-$STAMP.sql.gz"
UPLOADS_FILE="$WORK_DIR/uploads-$STAMP.tar.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

ping_fail() {
  if [ -n "${HEALTHCHECKS_BACKUP_URL:-}" ]; then
    curl -fsS -m 10 --retry 2 "${HEALTHCHECKS_BACKUP_URL%/}/fail" >/dev/null || true
  fi
}

cleanup() {
  status="$?"
  if [ "$status" -ne 0 ]; then
    ping_fail
  fi
  rm -rf "$WORK_DIR"
  exit "$status"
}

trap cleanup EXIT

REMOTE_NAME="${BACKUP_REMOTE%%:*}"
if [ "$REMOTE_NAME" = "$BACKUP_REMOTE" ] \
  || ! rclone config show "$REMOTE_NAME" | grep -Eq '^type = crypt$'; then
  echo "BACKUP_REMOTE must use an rclone crypt remote" >&2
  exit 1
fi

mkdir -p "$WORK_DIR"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DB_FILE"

docker run --rm \
  -v "$UPLOADS_VOLUME:/data/uploads:ro" \
  -v "$(pwd)/$WORK_DIR:/backup" \
  busybox:1.36 \
  tar -czf "/backup/$(basename "$UPLOADS_FILE")" -C /data/uploads .

rclone copy "$WORK_DIR" "$BACKUP_REMOTE/$STAMP"
rclone delete "$BACKUP_REMOTE" --min-age "${RETENTION_DAYS}d"
rclone rmdirs "$BACKUP_REMOTE" --leave-root

if [ -n "${HEALTHCHECKS_BACKUP_URL:-}" ]; then
  curl -fsS -m 10 --retry 2 "$HEALTHCHECKS_BACKUP_URL" >/dev/null || true
fi
