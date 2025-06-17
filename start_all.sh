#!/bin/bash

# Function to get local IP
get_ip() {
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1"
}

# Start FastAPI Backend
echo "Starting FastAPI backend..."

cd chatbot-backend || exit 1

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# Open new terminal tab/window and run backend
osascript <<EOF
tell application "Terminal"
    do script "cd $(pwd); source venv/bin/activate; uvicorn app.main:app --reload"
end tell
EOF

BACKEND_IP=$(get_ip)
echo "Backend running at:"
echo "  http://127.0.0.1:8000"
echo "  http://$BACKEND_IP:8000"

cd ../chatbot-frontend || exit 1
echo "Starting frontend..."

# Open another terminal tab/window and run frontend
osascript <<EOF
tell application "Terminal"
    do script "cd $(pwd); npm install; npm run dev"
end tell
EOF

echo "Frontend running at:"
echo "  http://localhost:5173"
echo "  http://$BACKEND_IP:5173"
