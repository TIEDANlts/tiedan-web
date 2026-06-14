#!/usr/bin/env sh
set -eu

./node_modules/.bin/prisma migrate deploy
exec node server.js
