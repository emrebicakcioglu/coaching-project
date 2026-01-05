# Generate Kubernetes Secrets for Core-App
# Run: .\generate-secrets.ps1

$ErrorActionPreference = "Stop"

function Get-RandomString {
    param([int]$Length, [string]$Charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $result = ""
    foreach ($byte in $bytes) {
        $result += $Charset[$byte % $Charset.Length]
    }
    return $result
}

function Get-RandomBase64 {
    param([int]$ByteLength)
    $bytes = New-Object byte[] $ByteLength
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

function Get-RandomHex {
    param([int]$ByteLength)
    $bytes = New-Object byte[] $ByteLength
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

# Generate secrets
$secrets = @{
    DB_PASSWORD = Get-RandomString -Length 24 -Charset "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%^&*"
    POSTGRES_PASSWORD = ""  # Will be set same as DB_PASSWORD
    JWT_SECRET = Get-RandomBase64 -ByteLength 48
    ENCRYPTION_KEY = Get-RandomHex -ByteLength 32
    MFA_TEMP_TOKEN_SECRET = Get-RandomBase64 -ByteLength 32
    MINIO_ACCESS_KEY = Get-RandomString -Length 20
    MINIO_SECRET_KEY = Get-RandomString -Length 40
    MINIO_ROOT_PASSWORD = Get-RandomString -Length 24
    RESEND_API_KEY = "CHANGE_ME_IF_USING_RESEND"
}
$secrets.POSTGRES_PASSWORD = $secrets.DB_PASSWORD

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Generated Kubernetes Secrets for Core-App" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Output for manual use
Write-Host "=== Secret Values ===" -ForegroundColor Yellow
foreach ($key in $secrets.Keys | Sort-Object) {
    Write-Host "${key}: $($secrets[$key])"
}

Write-Host ""
Write-Host "=== kubectl Command ===" -ForegroundColor Yellow
$kubectlCmd = "kubectl create secret generic core-app-secrets --namespace=core-app ``"
foreach ($key in $secrets.Keys | Sort-Object) {
    $kubectlCmd += "`n  --from-literal=$key=`"$($secrets[$key])`" ``"
}
$kubectlCmd = $kubectlCmd.TrimEnd(" ``")
Write-Host $kubectlCmd

# Generate YAML file
$yamlContent = @"
# ============================================
# Kubernetes Secrets for Core-App
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm")
# ============================================
# WARNUNG: Diese Datei enthaelt sensible Daten!
# NICHT in Git committen! Zu .gitignore hinzufuegen!
# ============================================

apiVersion: v1
kind: Secret
metadata:
  name: core-app-secrets
  namespace: core-app
type: Opaque
stringData:
  DB_PASSWORD: "$($secrets.DB_PASSWORD)"
  POSTGRES_PASSWORD: "$($secrets.POSTGRES_PASSWORD)"
  ENCRYPTION_KEY: "$($secrets.ENCRYPTION_KEY)"
  JWT_SECRET: "$($secrets.JWT_SECRET)"
  MFA_TEMP_TOKEN_EXPIRY: "300"
  MFA_TEMP_TOKEN_SECRET: "$($secrets.MFA_TEMP_TOKEN_SECRET)"
  MINIO_ACCESS_KEY: "$($secrets.MINIO_ACCESS_KEY)"
  MINIO_ROOT_PASSWORD: "$($secrets.MINIO_ROOT_PASSWORD)"
  MINIO_SECRET_KEY: "$($secrets.MINIO_SECRET_KEY)"
  RESEND_API_KEY: "$($secrets.RESEND_API_KEY)"
  TOKEN_CLEANUP_INTERVAL_MS: "3600000"
  VERIFICATION_TOKEN_EXPIRY: "24h"
"@

$secretsFile = Join-Path $PSScriptRoot "core-app-secrets.yaml"
$yamlContent | Out-File -FilePath $secretsFile -Encoding UTF8

Write-Host ""
Write-Host "=== Secrets YAML File ===" -ForegroundColor Yellow
Write-Host "Saved to: $secretsFile" -ForegroundColor Green
Write-Host ""
Write-Host "To apply:" -ForegroundColor Cyan
Write-Host "  kubectl apply -f `"$secretsFile`""
Write-Host ""
Write-Host "WICHTIG: Fuege diese Dateien zu .gitignore hinzu:" -ForegroundColor Red
Write-Host "  *-secrets.yaml"
Write-Host "  generate-secrets.ps1"
