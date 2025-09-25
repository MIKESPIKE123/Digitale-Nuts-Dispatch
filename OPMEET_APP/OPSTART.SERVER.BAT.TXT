@echo off
setlocal ENABLEDELAYEDEXPANSION
REM === Instellingen ===
set PORT=%1
if "%PORT%"=="" set PORT=5173
set HTML=opmeetapp_BOAB_2025_V22.html

REM === Validatie ===
if not exist "%HTML%" (
  echo ERROR: %HTML% niet gevonden in %cd%
  exit /b 1
)

REM === Detectie Python / py / Node ===
where python >nul 2>nul
if %errorlevel%==0 goto :serve_python

where py >nul 2>nul
if %errorlevel%==0 goto :serve_py

where node >nul 2>nul
if %errorlevel%==0 goto :serve_node

echo Geen Python of Node gevonden.
echo - Gebruik VS Code Live Preview/Live Server, of
echo - Installeer portable Node in je gebruikersmap.
pause
exit /b 1

:serve_python
echo Start Python HTTP server op poort %PORT% ...
start "dev-server (python)" cmd /c python -m http.server %PORT%
goto :open_browser

:serve_py
echo Start Python (py) HTTP server op poort %PORT% ...
start "dev-server (py)" cmd /c py -m http.server %PORT%
goto :open_browser

:serve_node
if exist server.js (
  echo Start Node server op poort %PORT% ...
  set PORT=%PORT%
  start "dev-server (node)" cmd /c node server.js
) else (
  echo Node gevonden, maar server.js ontbreekt.
  echo Maak server.js aan (zie hieronder) of gebruik Python-optie.
  pause
  exit /b 1
)
goto :open_browser

:open_browser
timeout /t 1 >nul
start "" http://localhost:%PORT%/%HTML%
echo Server gestart. Sluit dit venster niet als je de Python/Node server wil laten draaien.
exit /b 0
