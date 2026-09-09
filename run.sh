#!/bin/bash
# Little script to start back/front/db

EXPECTED_HASH="babf20660be9fa16de5b31e5d36a337421423fac38935b83c60bae4761c07950"
ACTUAL_HASH=$(sha256sum generate-certs.sh | awk '{print $1}')

set -e

cleanup() {
echo ""
echo "Stopping services..."

kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true

cd backend
docker compose down

echo "All services stopped."
exit 0
}

trap cleanup SIGINT SIGTERM

echo "Creating https certs..."

if [[ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]]; then
    echo "The file generate-certs.sh has changed! Update the file's hash."
    exit 1
fi

bash generate-certs.sh

echo "Checking backend dependencies..."

if [ ! -d "backend/node_modules" ]; then
echo "Installing backend dependencies..."
cd backend
bun install
cd ..
else
echo "Backend dependencies already installed."
fi

echo "Checking frontend dependencies..."

if [ ! -d "frontend/node_modules" ]; then
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..
else
echo "Frontend dependencies already installed."
fi

echo "Starting Docker services..."

cd backend
docker compose up -d
cd ..

echo "Starting backend..."

(
cd backend
bun run dev
) &

BACKEND_PID=$!

echo "Starting frontend..."

(
cd frontend
npm run dev
) &

FRONTEND_PID=$!

echo ""
echo " All services are running!"
echo ""
echo " Backend:  Bun running Elysia"
echo " Frontend: npm running React"
echo " 6: 7"
echo ""

wait
