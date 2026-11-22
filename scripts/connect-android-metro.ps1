param(
    [ValidateRange(1024, 65535)][int]$MetroPort = 8081,
    [string]$Serial
)

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path -LiteralPath $adb)) { throw 'Android SDK/adb não encontrado.' }

# A porta aberta não comprova qual cópia do projeto o Metro está servindo.
$manifest = Invoke-RestMethod "http://127.0.0.1:$MetroPort/" -UseBasicParsing -Headers @{
    'Expo-Platform' = 'android'
    Accept = 'application/expo+json'
} -TimeoutSec 10
$servedRoot = $manifest.extra.expoClient._internal.projectRoot
if (-not $servedRoot -or [IO.Path]::GetFullPath($servedRoot).TrimEnd('\') -ne $sourceRoot) {
    throw "O Metro da porta $MetroPort não serve a cópia canônica '$sourceRoot'. Escolha outra porta com -MetroPort."
}

# Dois Metros da mesma pasta podem ter carregado ambientes diferentes.
# Compare somente as duas configurações públicas usadas na autenticação.
$expected = @{}
$publicKeys = @('EXPO_PUBLIC_IDENTITY_API_URL', 'EXPO_PUBLIC_ACADEMIC_API_URL')
foreach ($envFile in @('.env', '.env.development', '.env.local', '.env.development.local')) {
    $envPath = Join-Path $sourceRoot $envFile
    if (Test-Path -LiteralPath $envPath) {
        foreach ($line in Get-Content -LiteralPath $envPath) {
            if ($line -match '^\s*(EXPO_PUBLIC_(?:IDENTITY|ACADEMIC)_API_URL)\s*=\s*(.*?)\s*$') {
                $expected[$Matches[1]] = $Matches[2].Trim('"', "'")
            }
        }
    }
}
foreach ($key in $publicKeys) {
    $processValue = [Environment]::GetEnvironmentVariable($key, 'Process')
    if ($processValue) { $expected[$key] = $processValue }
    if (-not $expected[$key]) { throw "Configure $key antes de conectar o app." }
}
$launchUri = [Uri]$manifest.launchAsset.url
$bundleUri = "http://127.0.0.1:$MetroPort$($launchUri.AbsolutePath)?platform=android&dev=true&minify=false&transform.bytecode=0"
# -UseBasicParsing avoids the Internet Explorer engine, which fails on Windows PowerShell 5.1.
$bundleResponse = Invoke-WebRequest $bundleUri -UseBasicParsing -TimeoutSec 300
$bundle = if ($bundleResponse.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($bundleResponse.Content) } else { $bundleResponse.Content }
foreach ($key in $publicKeys) {
    $pattern = '"' + $key + '"\s*:\s*\{\s*enumerable:\s*true,\s*value:\s*"([^"]+)"'
    $embedded = [regex]::Match($bundle, $pattern)
    if (-not $embedded.Success -or $embedded.Groups[1].Value.TrimEnd('/') -ne $expected[$key].TrimEnd('/')) {
        throw "O Metro da porta $MetroPort não incorporou o valor atual de $key. Use um Metro atualizado; os processos existentes foram preservados."
    }
}

$devices = @(& $adb devices | ForEach-Object { if ($_ -match '^(\S+)\s+device$') { $Matches[1] } })
if ($Serial) {
    if ($Serial -notin $devices) { throw "O dispositivo '$Serial' não está online." }
} elseif ($devices.Count -eq 1) {
    $Serial = $devices[0]
} else {
    throw 'Informe -Serial quando houver zero ou vários dispositivos online.'
}

& $adb -s $Serial shell am force-stop com.nomi.app
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível encerrar o processo do app.' }

# O host salvo no menu de desenvolvimento prevalece sobre adb reverse.
# Altere somente essa preferência; preserve SecureStore e os demais dados.
$preferences = 'shared_prefs/com.nomi.app_preferences.xml'
& $adb -s $Serial shell run-as com.nomi.app test -f $preferences
if ($LASTEXITCODE -eq 0) {
    & $adb -s $Serial shell run-as com.nomi.app sed -i "'s#\(debug_http_host.>\)[^<]*#\1localhost:8081#'" $preferences
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível alinhar o host de desenvolvimento do app.' }
}
& $adb -s $Serial reverse tcp:8081 "tcp:$MetroPort"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível conectar o emulador ao Metro.' }
& $adb -s $Serial shell am start -n com.nomi.app/.MainActivity
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível abrir o app.' }
Write-Host "App conectado à cópia canônica, Metro $MetroPort, dispositivo $Serial."
