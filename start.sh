#!/bin/bash
# Chess Coaching Platform — start MongoDB + Express server
set -e

MONGOD="$HOME/mongodb/bin/mongod"
DATADIR="$HOME/mongodb/data/db"
LOGFILE="$HOME/mongodb/logs/mongod.log"

# Start MongoDB if not already running
if ! pgrep -x mongod > /dev/null; then
    echo "Starting MongoDB..."
    "$MONGOD" --dbpath "$DATADIR" --logpath "$LOGFILE" --fork
    echo "MongoDB started."
else
    echo "MongoDB already running."
fi

# Start Express server
cd "$(dirname "$0")"
echo "Starting Chess Coaching server on http://localhost:3001 ..."
npm start
