$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8


Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗       ║" -ForegroundColor Cyan
Write-Host "║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝       ║" -ForegroundColor Cyan
Write-Host "║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗       ║" -ForegroundColor Cyan
Write-Host "║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║       ║" -ForegroundColor Cyan
Write-Host "║   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║       ║" -ForegroundColor Cyan
Write-Host "║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝       ║" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "║    ██████╗██╗      █████╗ ██╗    ██╗                ║" -ForegroundColor Cyan
Write-Host "║   ██╔════╝██║     ██╔══██╗██║    ██║                ║" -ForegroundColor Cyan
Write-Host "║   ██║     ██║     ███████║██║ █╗ ██║                ║" -ForegroundColor Cyan
Write-Host "║   ██║     ██║     ██╔══██║██║███╗██║                ║" -ForegroundColor Cyan
Write-Host "║   ╚██████╗███████╗██║  ██║╚███╔███╔╝                ║" -ForegroundColor Cyan
Write-Host "║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝                 ║" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "║              🐾 AI Agent Platform 🐾                 ║" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "  NexusClaw Installer" -ForegroundColor White
Write-Host ""

# Check OS
if ($IsWindows -or $env:OS -match 'Windows') {
    Write-Host "[OK] Windows detected" -ForegroundColor Green
} else {
    Write-Host "[!] Proceeding on non-Windows environment" -ForegroundColor DarkYellow
}

# Check Node
try {
    $nodeVer = (node -v) 2>$null
    if (-not $nodeVer) {
        throw "Node.js not found."
    }
    Write-Host "[OK] Node.js $nodeVer found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is required but not installed. Install Node.js v20+ and try again." -ForegroundColor Red
    exit 1
}

Write-Host "[*] Installing NexusClaw (nexusclaw@latest)..." -ForegroundColor White

# In a real environment, this might download a zip or git clone.
# Since we are installing directly in the development repo:
if (Test-Path "package.json") {
    Write-Host "[*] Restoring packages (pnpm install)..." -ForegroundColor DarkGray
    pnpm install | Out-Null
    
    Write-Host "[*] Building source..." -ForegroundColor DarkGray
    pnpm build | Out-Null
    
    Write-Host "[*] Linking globally..." -ForegroundColor DarkGray
    # Depending if we are inside VS code terminal we might need powershell semantics
    node --no-warnings dist/cli/index.js setup | Out-Null
} else {
    Write-Host "[ERROR] install.ps1 must be run from within the NexusClaw repository folder for local setups." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] NexusClaw installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Finally unpacked. Now point me at your problems." -ForegroundColor Green
Write-Host "Starting setup..." -ForegroundColor Cyan
Write-Host ""

# Drop into the onboarding wizard!
node --no-warnings ./dist/cli/index.js onboard
