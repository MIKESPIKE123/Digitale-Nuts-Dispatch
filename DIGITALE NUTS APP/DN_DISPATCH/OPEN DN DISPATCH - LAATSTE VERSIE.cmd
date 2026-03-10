@echo off
setlocal
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3012"
set "CACHE_BUSTER="
for /f %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format yyyyMMddHHmmss"') do set "CACHE_BUSTER=%%i"

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

if exist ".git" (
  echo.
  set "GIT_BRANCH="
  set "GIT_COMMIT="
  for /f "delims=" %%i in ('git branch --show-current 2^>nul') do set "GIT_BRANCH=%%i"
  for /f "delims=" %%i in ('git rev-parse --short HEAD 2^>nul') do set "GIT_COMMIT=%%i"
  if not "%GIT_BRANCH%"=="" echo Branch: %GIT_BRANCH%
  if not "%GIT_COMMIT%"=="" echo Commit: %GIT_COMMIT%
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
echo Browser URL: http://localhost:%PORT%/?v=%CACHE_BUSTER%
start "" "http://localhost:%PORT%/?v=%CACHE_BUSTER%"

call npm run dev -- --port %PORT% --force
if errorlevel 1 (
  echo.
  echo De app kon niet gestart worden.
  pause
)
