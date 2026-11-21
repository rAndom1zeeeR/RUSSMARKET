#!/bin/sh
# Volume is root-owned on first mount. Hand /data to nextjs, then drop privileges.
set -e
mkdir -p /data
chown -R nextjs:nodejs /data
exec su-exec nextjs:nodejs "$@"
