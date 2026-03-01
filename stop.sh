#!/bin/bash
# Chess Coaching Platform — stop MongoDB + Express server

# Kill the Express server on port 3001
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "Stopping Express server (port 3001)..."
    lsof -ti:3001 | xargs kill -9
fi

# Stop MongoDB gracefully
if pgrep -x mongod > /dev/null; then
    echo "Stopping MongoDB..."
    "$HOME/mongodb/bin/mongod" --dbpath "$HOME/mongodb/data/db" --shutdown 2>/dev/null || pkill -x mongod
fi

echo "All stopped."
