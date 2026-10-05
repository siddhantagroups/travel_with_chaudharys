#!/usr/bin/env bash
# Nightly MongoDB backup for Travel With Chaudharys, keeping the last 14 days.
#
# Install on the server (as root):
#   cp ~/twc/deploy/backup-mongo.sh /usr/local/bin/twc-backup && chmod 700 /usr/local/bin/twc-backup
#   mkdir -p /var/backups/twc && chmod 700 /var/backups/twc
#   crontab -e      and add:   30 2 * * * /usr/local/bin/twc-backup >> /var/log/twc-backup.log 2>&1
#
# Backups on the same machine don't survive losing the machine: also copy
# /var/backups/twc somewhere else now and then (or enable Hostinger's VPS
# snapshot backups).
set -euo pipefail

DB="${TWC_DB:-travelwithchaudharys}"
DEST="/var/backups/twc"
STAMP="$(date +%F_%H%M)"

umask 077
mongodump --quiet --db "$DB" --archive="$DEST/$DB-$STAMP.archive.gz" --gzip
find "$DEST" -name "$DB-*.archive.gz" -mtime +14 -delete
echo "$(date -Is) backup ok: $DEST/$DB-$STAMP.archive.gz"

# Restore one (careful — replaces what's there):
#   mongorestore --drop --gzip --archive=/var/backups/twc/<file>.archive.gz
