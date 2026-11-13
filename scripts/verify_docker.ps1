# Portable verifier owns a unique Compose project and dynamic loopback ports.
param(
    [string]$Python,
    [string]$Output
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $Python) {
    foreach ($environmentName in @('.venv-repro', '.venv')) {
        $candidate = Join-Path $projectRoot "$environmentName/Scripts/python.exe"
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $Python = $candidate
            break
        }
    }
}
if (-not $Python) {
    throw 'Create .venv-repro first, or specify -Python with the interpreter path. See docs/LOCAL_REPRODUCTION.md.'
}
if (-not $Output) {
    $Output = Join-Path $projectRoot 'docs/evidence/docker-runtime.json'
}
& $Python (Join-Path $PSScriptRoot 'verify_docker.py') --output $Output
exit $LASTEXITCODE
