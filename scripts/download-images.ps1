$ErrorActionPreference = 'Stop'
$base = Join-Path $PSScriptRoot '..\images' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $base) {
    $base = Join-Path (Split-Path $PSScriptRoot -Parent) 'images'
}
New-Item -ItemType Directory -Force -Path $base, "$base\hollow-knight", "$base\tools", "$base\random", "$base\games", "$base\categories" | Out-Null

function Get-OgImage([string]$pageUrl) {
    $r = Invoke-WebRequest -Uri $pageUrl -UseBasicParsing -Headers @{
        'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    } -TimeoutSec 60
    if ($r.Content -match 'property="og:image"\s+content="([^"]+)"') { return ($Matches[1] -replace '&amp;', '&') }
    if ($r.Content -match 'content="([^"]+)"\s+property="og:image"') { return ($Matches[1] -replace '&amp;', '&') }
    throw "No og:image on $pageUrl"
}

function Save-Cover([string]$outPath, [string]$pageUrl) {
    $img = Get-OgImage $pageUrl
    Invoke-WebRequest -Uri $img -OutFile $outPath -UseBasicParsing -Headers @{ 'User-Agent' = 'Mozilla/5.0' } -TimeoutSec 120
    Get-Item $outPath
}

$jobs = @(
    @{ Out = "$base\hollow-knight\pure-vessel-mask.jpg"; Url = 'https://makerworld.com/en/models/1161708-the-pure-vessel-mask-from-hollow-knight' },
    @{ Out = "$base\hollow-knight\hornet-mask.jpg"; Url = 'https://makerworld.com/en/models/1803316-large-hornet-mask-silk-song-hollow-knight-adult' },
    @{ Out = "$base\hollow-knight\harrah-mask.jpg"; Url = 'https://makerworld.com/en/models/2244864-dreamer-harrah-the-beast-mask-hollow-knight' },
    @{ Out = "$base\tools\dumpster-trash-can.jpg"; Url = 'https://makerworld.com/en/models/794185-mountable-dumpster-trash-can' },
    @{ Out = "$base\random\fountain-girl.jpg"; Url = 'https://makerworld.com/en/models/1707987-working-fountain-girl-sculpture-for-pond-garden' },
    @{ Out = "$base\random\dragon-fountain.jpg"; Url = 'https://makerworld.com/en/models/1414737-working-dragon-water-fountain-sculpture-for-pond' },
    @{ Out = "$base\games\bubble-mask.jpg"; Url = 'https://makerworld.com/en/models/2767411-bubble-mask-the-amazing-digital-circus-tadc' },
    @{ Out = "$base\games\lizzy-murder-drones.jpg"; Url = 'https://makerworld.com/en/models/2782999-lizzy-murder-drones-7-tall' },
    @{ Out = "$base\games\tessa-murder-drones.jpg"; Url = 'https://makerworld.com/en/models/2802038-tessa-james-elliott-spacesuit-murder-drones-7' }
)

$report = @()
foreach ($j in $jobs) {
    try {
        $fi = Save-Cover $j.Out $j.Url
        $report += [pscustomobject]@{ File = $fi.FullName; Status = 'OK'; SizeBytes = $fi.Length }
    } catch {
        $report += [pscustomobject]@{ File = $j.Out; Status = 'ERROR'; Detail = $_.Exception.Message }
    }
}

$catMap = @{
    'hollow-knight' = "$base\categories\hollow-knight.jpg"
    'tools'         = "$base\categories\tools.jpg"
    'random'        = "$base\categories\random.jpg"
    'games'         = "$base\categories\games.jpg"
}
foreach ($folder in $catMap.Keys) {
    $src = Get-ChildItem (Join-Path $base $folder) -Filter *.jpg -ErrorAction SilentlyContinue |
        Sort-Object Length -Descending | Select-Object -First 1
    if ($src) {
        Copy-Item $src.FullName $catMap[$folder] -Force
        $fi = Get-Item $catMap[$folder]
        $report += [pscustomobject]@{ File = $fi.FullName; Status = 'OK (category)'; SizeBytes = $fi.Length }
    }
}

$report | Format-Table -AutoSize
$report | ConvertTo-Json -Depth 3 | Out-File (Join-Path $PSScriptRoot 'download-report.json')
