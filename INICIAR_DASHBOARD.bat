@echo off
echo Iniciando Servidor Backend (Flask)...
start /B cmd /c "cd backend && python app.py"

echo Iniciando Servidor Frontend (Vite/React)...
cd frontend && npm run dev

pause
