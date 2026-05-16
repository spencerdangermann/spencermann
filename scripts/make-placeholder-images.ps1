# Creates simple SVG cover images for each model in data/models.json (offline-friendly).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$jsonPath = Join-Path $root 'data\models.json'
$data = Get-Content $jsonPath -Raw | ConvertFrom-Json

function New-PlaceholderSvg([string]$title, [string]$category) {
    $safeTitle = [System.Security.SecurityElement]::Escape($title)
    $colors = @{
        'hollow-knight' = '#4a3728'
        'tools'         = '#2d4a3e'
        'games'         = '#3d2d4a'
        'random'        = '#2d3d4a'
    }
    $bg = $colors[$category]
    if (-not $bg) { $bg = '#222222' }
    @"
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:$bg"/>
      <stop offset="100%" style="stop-color:#111"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <text x="600" y="380" fill="#e8e8e8" font-family="Segoe UI, Arial, sans-serif" font-size="36" text-anchor="middle">$safeTitle</text>
  <text x="600" y="440" fill="#b0b0b0" font-family="Segoe UI, Arial, sans-serif" font-size="22" text-anchor="middle">Spencermann · MakerWorld</text>
</svg>
"@
}

foreach ($model in $data.models) {
    $outPath = Join-Path $root ($model.image -replace '\.jpg$', '.svg')
    $dir = Split-Path $outPath -Parent
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    New-PlaceholderSvg $model.title $model.category | Set-Content -Path $outPath -Encoding UTF8
    $model.image = $model.image -replace '\.jpg$', '.svg'
}

$data | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $root 'data\models.json') -Encoding UTF8

# Category thumbnails
$catDirs = @{
    'hollow-knight' = 'hollow-knight'
    'tools'         = 'tools'
    'games'         = 'games'
    'random'        = 'random'
}
foreach ($cat in $catDirs.Keys) {
    $first = $data.models | Where-Object { $_.category -eq $cat } | Select-Object -First 1
    if ($first) {
        $src = Join-Path $root ($first.image)
        $dest = Join-Path $root "images\categories\$cat.svg"
        New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
        Copy-Item $src $dest -Force
    }
}

Write-Host 'Placeholder SVGs created.'
