@echo off
setlocal
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3012"

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
echo Oude DN_DISPATCH instanties worden afgesloten...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(%PORT%, 3012, 3016, 3017) | Sort-Object -Unique; $procIds = @(); foreach ($p in $ports) { $procIds += @(Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess) }; $procIds = $procIds | Sort-Object -Unique; if (-not $procIds) { Write-Host 'Geen oude instanties gevonden.' } else { foreach ($procId in $procIds) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue; Write-Host ('Gestopt oude instantie PID ' + $procId) } }"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(8); while ((Get-Date) -lt $deadline) { if (-not (Get-NetTCPConnection -State Listen -LocalPort %PORT% -ErrorAction SilentlyContinue)) { exit 0 }; Start-Sleep -Milliseconds 250 }; exit 1"
if errorlevel 1 (
  echo Fout: poort %PORT% is nog steeds in gebruik na cleanup.
  echo Sluit de andere app/terminal die die poort gebruikt en probeer opnieuw.
  pause
  exit /b 1
)

echo.
echo De app start op http://localhost:%PORT%
echo Opmerking: npm run dev voert automatisch een data-import uit uit Excel.
echo Tip: geef optioneel een poort mee, bv. "OPEN DN DISPATCH - LAATSTE VERSIE.cmd 3017"
start "" "http://localhost:%PORT%"

call npm run dev -- --port %PORT%
if errorlevel 1 (
  echo.
  echo De app kon niet gestart worden.
  pause
)
