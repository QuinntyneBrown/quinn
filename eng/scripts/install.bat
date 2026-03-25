@echo off
setlocal enabledelayedexpansion

echo.
echo  Quinn - Local LLM Coding Agent
echo  ===============================
echo.

:: ── Check Node.js ───────────────────────────────────────────────────────

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download it from https://nodejs.org/ ^(v20 or later^)
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set "NODE_RAW=%%a"
for /f "tokens=1 delims=v." %%a in ('node -v') do set "NODE_MAJOR=%%a"
REM node -v returns "v22.21.0", strip the leading v
for /f "tokens=2 delims=v" %%a in ('node -v') do (
    for /f "tokens=1 delims=." %%b in ("%%a") do set "NODE_MAJOR=%%b"
)

if !NODE_MAJOR! lss 20 (
    echo [ERROR] Node.js v20+ is required. Found: %NODE_RAW%
    echo         Download the latest from https://nodejs.org/
    exit /b 1
)
echo [OK] Node.js found: v!NODE_MAJOR!

:: ── Check Ollama ────────────────────────────────────────────────────────

where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Ollama is not installed or not in PATH.
    echo        Quinn requires Ollama for local LLM inference.
    echo        Install it from https://ollama.ai
    echo.
    set "OLLAMA_MISSING=1"
) else (
    echo [OK] Ollama found
)

:: ── Resolve project root (two levels up from eng\scripts) ───────────────

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%\..\.."
set "PROJECT_ROOT=%cd%"
popd

echo [..] Installing from %PROJECT_ROOT%
echo.

:: ── Install dependencies ────────────────────────────────────────────────

echo [..] Installing npm dependencies...
cd /d "%PROJECT_ROOT%"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    exit /b 1
)
echo [OK] Dependencies installed

:: ── Build ───────────────────────────────────────────────────────────────

echo [..] Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    exit /b 1
)
echo [OK] Build succeeded

:: ── Link globally ───────────────────────────────────────────────────────

echo [..] Linking quinn globally...
call npm link
if %errorlevel% neq 0 (
    echo [ERROR] npm link failed. Try running this script as Administrator.
    exit /b 1
)
echo [OK] quinn is now available as a global command

:: ── Pull a default model if Ollama is present but has no models ─────────

if defined OLLAMA_MISSING goto :skip_model_check

ollama list >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Ollama is installed but does not appear to be running.
    echo        Start it and pull a model:  ollama pull gemma3:4b
    goto :skip_model_check
)

for /f "skip=1" %%i in ('ollama list 2^>nul') do (
    set "HAS_MODEL=1"
    goto :has_model
)

if not defined HAS_MODEL (
    echo.
    echo  No Ollama models found. Pulling gemma3:4b ...
    echo.
    call ollama pull gemma3:4b
    if %errorlevel% neq 0 (
        echo [WARN] Could not pull model. Pull one manually:  ollama pull gemma3:4b
    ) else (
        echo [OK] Model gemma3:4b pulled
    )
)

:has_model
:skip_model_check

:: ── Verify ──────────────────────────────────────────────────────────────

echo.
echo  ---------------------------------------------------------------

where quinn >nul 2>&1
if %errorlevel% neq 0 (
    echo  [WARN] quinn is not on PATH yet. You may need to restart your
    echo         terminal or add npm's global bin directory to PATH.
) else (
    echo  [OK] Installation complete. Run "quinn" to start.
)

echo.
echo  Quick start:
echo    quinn                          Start interactive REPL
echo    quinn "explain this code"      Single prompt
echo    quinn --list-models            Show available models
echo    quinn --help                   Full usage info
echo  ---------------------------------------------------------------
echo.

endlocal
