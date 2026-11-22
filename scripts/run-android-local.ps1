param(
    [string]$Device = "Nomi_API_36",
    [ValidateRange(1024, 65535)][int]$MetroPort = 8081,
    [switch]$SkipBuild,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$sourceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path.TrimEnd('\')
$mirrorRoot = "C:\n"
$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$javaRoot = "C:\Program Files\Android\Android Studio\jbr"

if (-not (Test-Path (Join-Path $javaRoot "bin\java.exe"))) {
    throw "JDK do Android Studio não encontrado em '$javaRoot'. Instale o Android Studio ou ajuste `$javaRoot no script."
}
if (-not (Test-Path (Join-Path $sdkRoot "platform-tools\adb.exe"))) {
    throw "Android SDK/adb não encontrado em '$sdkRoot'. Instale o SDK Platform-Tools pelo SDK Manager."
}

$env:JAVA_HOME = $javaRoot
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$javaRoot\bin;$sdkRoot\platform-tools;$sdkRoot\emulator;$env:Path"

# O CMake/Ninja do Android ainda usa caminhos legados de até 260 caracteres.
# Mantemos um espelho curto só para o build; o código editável continua no Desktop.
New-Item -ItemType Directory -Force -Path $mirrorRoot | Out-Null
$excluded = @(
    (Join-Path $sourceRoot "node_modules"),
    (Join-Path $sourceRoot "android\build"),
    (Join-Path $sourceRoot "android\app\build"),
    (Join-Path $sourceRoot ".expo"),
    (Join-Path $sourceRoot ".git")
)
robocopy $sourceRoot $mirrorRoot /E /XD $excluded /XF "*.log" /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null

$required = @(
    "react-native",
    "expo",
    "expo-modules-autolinking",
    "react-native-gesture-handler",
    "react-native-reanimated",
    "react-native-screens",
    "react-native-svg",
    "react-native-safe-area-context",
    "react-native-worklets",
    "@rive-app\react-native",
    "react-native-nitro-modules"
)
foreach ($name in $required) {
    $mirrorPackage = Join-Path $mirrorRoot "node_modules\$name"
    $sourcePackage = Join-Path $sourceRoot "node_modules\$name"
    if (-not (Test-Path (Join-Path $mirrorPackage "package.json")) -and (Test-Path (Join-Path $sourcePackage "package.json"))) {
        $packageParent = Split-Path $mirrorPackage -Parent
        New-Item -ItemType Directory -Force -Path $packageParent | Out-Null
        New-Item -ItemType Junction -Path $mirrorPackage -Target $sourcePackage | Out-Null
    }
    if (-not (Test-Path (Join-Path $mirrorPackage "package.json"))) {
        throw "Dependência local ausente no espelho: $mirrorRoot\node_modules\$name. Execute npm ci na cópia do Desktop e tente novamente."
    }
}

Push-Location $mirrorRoot
try {
    $apk = Join-Path $mirrorRoot "android\app\build\outputs\apk\debug\app-debug.apk"
    $fingerprintFile = Join-Path $mirrorRoot "android\.nomi-native-fingerprint"
    $nativeInputs = @(
        "app.json",
        "package-lock.json",
        "android\build.gradle",
        "android\settings.gradle",
        "android\gradle.properties",
        "android\app\build.gradle",
        "android\app\src\main\java\com\nomi\app\MainApplication.kt",
        "plugins\withRiveNitroPackages.js"
    )
    $fingerprintParts = foreach ($relativePath in $nativeInputs) {
        $fullPath = Join-Path $sourceRoot $relativePath
        if (Test-Path -LiteralPath $fullPath) {
            $sha = [System.Security.Cryptography.SHA256]::Create()
            try {
                $hash = [System.BitConverter]::ToString($sha.ComputeHash([System.IO.File]::ReadAllBytes($fullPath))).Replace('-', '')
            } finally {
                $sha.Dispose()
            }
            "$relativePath=$hash"
        }
    }
    $nativeFingerprint = $fingerprintParts -join "`n"
    $previousFingerprint = if (Test-Path -LiteralPath $fingerprintFile) { Get-Content -LiteralPath $fingerprintFile -Raw } else { "" }
    $needsNativeBuild = $Rebuild -or -not (Test-Path -LiteralPath $apk) -or $previousFingerprint -ne $nativeFingerprint

    if ($SkipBuild -and $needsNativeBuild) {
        throw "O APK não está atualizado com os arquivos nativos. Rode novamente sem -SkipBuild para recompilar com segurança."
    }

    if (-not $SkipBuild -and $needsNativeBuild) {
        # Generate the complete dependency list from the source checkout before
        # Gradle reads its cached autolinking.json in the short-path mirror.
        $autolinkJsonPath = Join-Path $mirrorRoot "android\build\generated\autolinking\autolinking.json"
        New-Item -ItemType Directory -Force -Path (Split-Path $autolinkJsonPath -Parent) | Out-Null
        Push-Location $sourceRoot
        try {
            $autolinkJson = & node .\node_modules\expo-modules-autolinking\bin\expo-modules-autolinking.js react-native-config --platform android --json
            if ($LASTEXITCODE -ne 0) { throw "Não foi possível gerar a lista de módulos nativos." }
        } finally { Pop-Location }
        $autolinkJson = ($autolinkJson -join "`n").Replace($sourceRoot.Replace('\', '\\'), $mirrorRoot.Replace('\', '\\')).Replace($sourceRoot.Replace('\', '/'), $mirrorRoot.Replace('\', '/'))
        [System.IO.File]::WriteAllText($autolinkJsonPath, $autolinkJson, [System.Text.UTF8Encoding]::new($false))
        & .\android\gradlew.bat -p .\android :app:generateAutolinkingPackageList :app:generateAutolinkingNewArchitectureFiles --rerun-tasks --max-workers=2 --console=plain
        if ($LASTEXITCODE -ne 0) { throw "Geração do autolinking falhou." }

        # CMake receives PROJECT_BUILD_DIR under C:\n even when Gradle's
        # outputs are redirected. Keep its generated source in sync.
        $redirectedAutolinking = "C:\nomi-native-build\app\generated\autolinking"
        $cmakeAutolinking = Join-Path $mirrorRoot "android\app\build\generated\autolinking"
        if (Test-Path $redirectedAutolinking) {
            New-Item -ItemType Directory -Force -Path $cmakeAutolinking | Out-Null
            Copy-Item -Path (Join-Path $redirectedAutolinking '*') -Destination $cmakeAutolinking -Recurse -Force
        }

        # O autolinker pode conservar o caminho físico original dos pacotes ligados.
        # Como o espelho possui a mesma árvore em C:\n, normalizamos os arquivos gerados.
        $oldJson = 'C:\\Users\\Willian\\Desktop\\Nomi\\nomi-mobile'
        $oldSlash = 'C:/Users/Willian/Desktop/Nomi/nomi-mobile'
        $newJson = 'C:\\n'
        $newSlash = 'C:/n'
        foreach ($generatedDir in @(
            (Join-Path $mirrorRoot "android\build\generated\autolinking"),
            (Join-Path $mirrorRoot "android\app\build\generated\autolinking")
        )) {
            if (Test-Path $generatedDir) {
                Get-ChildItem $generatedDir -Recurse -File | ForEach-Object {
                    $text = Get-Content $_.FullName -Raw
                    $updated = $text.Replace($oldJson, $newJson).Replace($oldSlash, $newSlash)
                    if ($updated -ne $text) {
                        Set-Content -LiteralPath $_.FullName -Value $updated -NoNewline
                    }
                }
            }
        }

        # Gradle can restore an old Kotlin class from its build cache even when
        # the generated MainApplication has changed. Recompile it explicitly so
        # NitroModulesPackage/RivePackage registrations reach the APK.
        & .\android\gradlew.bat -p .\android :app:compileDebugKotlin --rerun-tasks --no-build-cache --max-workers=2 --console=plain
        if ($LASTEXITCODE -ne 0) { throw "Compilação Kotlin do app falhou." }

        & .\android\gradlew.bat -p .\android :app:assembleDebug -x lint -x test --configure-on-demand --build-cache --max-workers=2 -PreactNativeDevServerPort=8081 -PreactNativeArchitectures=x86_64 --console=plain
        if ($LASTEXITCODE -ne 0) { throw "Build Android local falhou." }
        if (-not (Test-Path -LiteralPath $apk)) { throw "Gradle terminou sem gerar o APK no caminho esperado '$apk'." }
        Set-Content -LiteralPath $fingerprintFile -Value $nativeFingerprint -NoNewline
    }

    if (-not (Test-Path -LiteralPath $apk)) { throw "APK local não encontrado em '$apk'." }
    Write-Host "APK pronto: $apk" -ForegroundColor Green

    $adb = Join-Path $sdkRoot "platform-tools\adb.exe"
    $onlineDevice = & $adb devices | Select-String "\sdevice$"
    if ($onlineDevice) {
        if (-not (Get-NetTCPConnection -LocalPort $metroPort -State Listen -ErrorAction SilentlyContinue)) {
            $metroLog = Join-Path $mirrorRoot "metro.log"
            $metroCommand = "npm start -- --port $metroPort > `"$metroLog`" 2>&1"
            # Metro must use the canonical source tree. The native build mirror
            # contains package copies that would initialize React Native twice.
            Start-Process -FilePath "cmd.exe" -ArgumentList @('/c', $metroCommand) -WorkingDirectory $sourceRoot -WindowStyle Hidden
            $metroReady = $false
            for ($i = 0; $i -lt 30; $i++) {
                Start-Sleep -Seconds 1
                if (Get-NetTCPConnection -LocalPort $metroPort -State Listen -ErrorAction SilentlyContinue) {
                    $metroReady = $true
                    break
                }
            }
            if (-not $metroReady) {
                throw "Metro não abriu na porta $metroPort. Consulte $metroLog"
            }
        }
        & $adb install -r $apk
        if ($LASTEXITCODE -eq 0) {
            & (Join-Path $sourceRoot 'scripts\connect-android-metro.ps1') -MetroPort $MetroPort
            Write-Host "Aplicativo instalado e aberto no emulador." -ForegroundColor Green
        } else {
            Write-Warning "O APK foi gerado, mas a instalação falhou. Se for conflito de assinatura, remova com: adb uninstall com.nomi.app"
        }
    } else {
        Write-Host "Nenhum emulador online. Para instalar depois: adb install -r `"$apk`"" -ForegroundColor Cyan
    }
} finally {
    Pop-Location
}
