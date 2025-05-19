# PowerShell script to run both React and Electron in development mode

Write-Host "Starting FocusTrack development environment..." -ForegroundColor Green

# Start React development server in background
Write-Host "Starting React development server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "npm run react-dev" -WorkingDirectory $PSScriptRoot

# Wait for React server to start
Write-Host "Waiting for React server to start on port 3000..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Electron
Write-Host "Starting Electron..." -ForegroundColor Yellow
npm run electron-simple