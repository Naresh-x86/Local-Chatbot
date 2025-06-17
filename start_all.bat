@echo off
echo Starting FastAPI backend...

cd chatbot-backend
call .\venv\Scripts\activate

start cmd /k "uvicorn app.main:app --reload"

echo Backend running at:
echo http://127.0.0.1:8000
FOR /F "tokens=2 delims=:" %%f IN ('ipconfig ^| findstr /i "IPv4"') DO (
    echo LAN Access: http://%%f:8000
)

cd ..\chatbot-frontend
echo Starting frontend...

start cmd /k "npm run dev"

echo Frontend will be at:
echo http://localhost:5173
FOR /F "tokens=2 delims=:" %%f IN ('ipconfig ^| findstr /i "IPv4"') DO (
    echo LAN Access: http://%%f:5173
)
