@echo off
echo.
echo ========================================
echo   MUSICPORTAL MOONSHOT LAUNCHER
echo   Universal Intelligence Discovery
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Running database migration...
call npm run db:push
if %errorlevel% neq 0 (
    echo WARNING: Database migration failed - may need manual setup
)

echo.
echo [3/4] Checking TypeScript...
call npm run check
if %errorlevel% neq 0 (
    echo WARNING: TypeScript errors detected - proceeding anyway
)

echo.
echo [4/4] Starting server...
echo.
echo ========================================
echo   MOONSHOT ACTIVE
echo   - Upload songs to analyze
echo   - Visit /intelligence for dashboard
echo   - Watch console for analysis logs
echo ========================================
echo.

call npm run dev
