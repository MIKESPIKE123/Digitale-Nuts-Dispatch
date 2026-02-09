@echo off
setlocal
cd /d "%~dp0"

echo Starten van DIGITALE NUTS app...
where npm >nul 2>nul
if errorlevel 1 (
  echo Fout: npm is niet gevonden. Installeer Node.js en probeer opnieuw.
  pause
  exit /b 1
)

call npm start
if errorlevel 1 (
  echo.
  echo De app kon niet gestart worden.
  pause
)
