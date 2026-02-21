@echo off
setlocal
cd /d "%~dp0"

echo Starten van DN_DISPATCH (laatste versie)...
where npm >nul 2>nul
if errorlevel 1 (
  echo Fout: npm is niet gevonden. Installeer Node.js en probeer opnieuw.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo node_modules niet gevonden. npm install wordt uitgevoerd...
  call npm install
  if errorlevel 1 (
    echo.
    echo Installatie mislukt.
    pause
    exit /b 1
  )
)

echo.
echo De app start op http://localhost:3012
echo Opmerking: npm run dev voert automatisch een data-import uit uit Excel.
start "" "http://localhost:3012"

call npm run dev
if errorlevel 1 (
  echo.
  echo De app kon niet gestart worden.
  pause
)
