@echo off
echo ========================================
echo   Agent Studio - 启动脚本
echo ========================================
echo.

REM 检查 Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Python not found
    pause
    exit /b 1
)

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Node.js not found
    pause
    exit /b 1
)

echo [OK] Python and Node.js found
echo.

REM 启动后端
echo [START] Backend (port 8002)...
start "Agent Studio Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8002"

REM 等待后端启动
echo [WAIT] Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM 启动前端
echo [START] Frontend (port 5173)...
start "Agent Studio Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   Agent Studio is starting!
echo   Backend:  http://localhost:8002
echo   Frontend: http://localhost:5173
echo ========================================
echo.
pause
