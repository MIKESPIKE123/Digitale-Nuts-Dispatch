param(
  [int]$Port = 5173,
  [string]$Html = "opmeetapp_BOAB_2025_V22.html"
)

$root = Get-Location
if (-not (Test-Path $Html)) {
  Write-Error "ERROR: $Html niet gevonden in $root"
  exit 1
}

function Have($cmd){ return $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

if (Have "python") {
  Write-Host "Start Python HTTP server op poort $Port ..."
  Start-Process -WindowStyle Normal -FilePath "python" -ArgumentList "-m","http.server","$Port"
}
elseif (Have "py") {
  Write-Host "Start Python (py) HTTP server op poort $Port ..."
  Start-Process -WindowStyle Normal -FilePath "py" -ArgumentList "-m","http.server","$Port"
}
elseif (Have "node") {
  if (Test-Path "server.js") {
    Write-Host "Start Node server op poort $Port ..."
    $env:PORT = "$Port"
    Start-Process -WindowStyle Normal -FilePath "node" -ArgumentList "server.js"
  } else {
    Write-Error "Node gevonden, maar server.js ontbreekt. Maak server.js aan of gebruik Python-optie."
    exit 1
  }
}
else {
  Write-Error "Geen Python of Node gevonden. Gebruik VS Code Live Preview/Live Server."
  exit 1
}

Start-Sleep -Seconds 1
Start-Process "http://localhost:$Port/$Html"
Write-Host "Server gestart. Laat het server-venster openstaan."
