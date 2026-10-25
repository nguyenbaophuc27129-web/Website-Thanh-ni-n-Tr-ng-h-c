Write-Host "Keeping SSH tunnel alive..."
while ($true) {
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting SSH tunnel..."
    ssh -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes -o ExitOnForwardFailure=yes -N tnth-db
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Tunnel disconnected with exit code $LASTEXITCODE. Reconnecting in 2s..."
    Start-Sleep -Seconds 2
}
