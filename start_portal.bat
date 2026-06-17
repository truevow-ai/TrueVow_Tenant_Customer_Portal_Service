@echo off
REM Start TrueVow Customer Portal
REM Port: 3031 — Law Firm Dashboard with SETTLE, billing, intake
echo Starting Customer Portal on port 3031...
cd /d "%~dp0"
npx next dev -p 3031
