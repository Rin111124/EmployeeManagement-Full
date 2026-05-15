param(
  [string]$DeliveryRoot = "E:\EmployeeManagement-delivery"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$DeliveryRoot = [System.IO.Path]::GetFullPath($DeliveryRoot)
$SourceStage = Join-Path $DeliveryRoot "source-code"
$SourceZip = Join-Path $DeliveryRoot "source-code.zip"
$DeploymentDir = Join-Path $DeliveryRoot "deployment"
$DocumentationDir = Join-Path $DeliveryRoot "documentation"
$MobileBuildsDir = Join-Path $DeliveryRoot "mobile-builds"
$DatabaseDir = Join-Path $DeliveryRoot "database"

New-Item -ItemType Directory -Path $DeliveryRoot -Force | Out-Null
New-Item -ItemType Directory -Path $DeploymentDir -Force | Out-Null
New-Item -ItemType Directory -Path $DocumentationDir -Force | Out-Null
New-Item -ItemType Directory -Path $MobileBuildsDir -Force | Out-Null
New-Item -ItemType Directory -Path $DatabaseDir -Force | Out-Null

if (Test-Path $SourceStage) {
  Remove-Item -LiteralPath $SourceStage -Recurse -Force
}

if (Test-Path $SourceZip) {
  Remove-Item -LiteralPath $SourceZip -Force
}

$excludeDirs = @(
  ".git",
  ".vscode",
  ".idea",
  "node_modules",
  ".venv",
  "dist",
  "build",
  "coverage",
  "uploads",
  ".expo",
  ".cache",
  "__pycache__",
  "docx-work",
  "out",
  "tmp",
  "C:\tmp"
)

$excludeFiles = @(
  ".env",
  ".env.docker",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  "*.log",
  "npm-debug.log*",
  "yarn-debug.log*",
  "yarn-error.log*",
  "pnpm-debug.log*",
  "*.pyc",
  "Thumbs.db",
  ".DS_Store"
)

robocopy $ProjectRoot $SourceStage /E /XD $excludeDirs /XF $excludeFiles | Out-Host
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -gt 7) {
  throw "robocopy failed with exit code $robocopyExit"
}

Compress-Archive -Path (Join-Path $SourceStage "*") -DestinationPath $SourceZip -Force

Copy-Item (Join-Path $ProjectRoot "docker-compose.yml") $DeploymentDir -Force
Copy-Item (Join-Path $ProjectRoot ".env.docker.example") $DeploymentDir -Force
Copy-Item (Join-Path $ProjectRoot "deployment\README.md") (Join-Path $DeploymentDir "BACKEND_DATABASE_DEPLOYMENT.md") -Force

Copy-Item (Join-Path $ProjectRoot "README.md") $DocumentationDir -Force
Copy-Item (Join-Path $ProjectRoot "HANDOVER_PACKAGING_GUIDE.md") $DocumentationDir -Force
Copy-Item (Join-Path $ProjectRoot "PRODUCTION_DEPLOYMENT_GUIDE.md") $DocumentationDir -Force

if (Test-Path (Join-Path $ProjectRoot "docs")) {
  Copy-Item (Join-Path $ProjectRoot "docs") (Join-Path $DocumentationDir "docs") -Recurse -Force
}

if (Test-Path (Join-Path $ProjectRoot "uml-diagrams")) {
  Copy-Item (Join-Path $ProjectRoot "uml-diagrams") (Join-Path $DocumentationDir "uml-diagrams") -Recurse -Force
}

Write-Host "Created handover package structure at: $DeliveryRoot"
Write-Host "Source archive: $SourceZip"
Write-Host "Place APK files in: $MobileBuildsDir"
Write-Host "Place database dumps in: $DatabaseDir"
