<#
.SYNOPSIS
    Levanta el entorno completo de NexusGuard AI con un solo comando.

.DESCRIPTION
    Comprueba los requisitos, arranca la infraestructura en Docker (PostgreSQL y
    Ollama), instala las dependencias que falten, aplica el esquema de Prisma,
    siembra la base de datos si esta vacia y arranca el servicio de inferencia y
    el frontend en dos ventanas paralelas.

    Es idempotente: se puede lanzar tantas veces como haga falta. Lo que ya esta
    hecho se salta.

.PARAMETER Seed
    Fuerza la resiembra de la base de datos aunque ya tenga datos.

.PARAMETER NoSeed
    No siembra nunca, ni siquiera con la base de datos vacia.

.PARAMETER NoStart
    Prepara todo el entorno pero no arranca la web ni la API. Util para CI o
    para dejar la base de datos lista sin abrir ventanas.

.EXAMPLE
    npm run dev
    Arranque normal desde la raiz del workspace.

.EXAMPLE
    npm run dev -- -Seed
    Arranca y ademas fuerza la resiembra de los datos de demo.
#>
[CmdletBinding()]
param(
    [switch]$Seed,
    [switch]$NoSeed,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$WebDir = Join-Path $WorkspaceRoot "apps\web"
$ApiDir = Join-Path $WorkspaceRoot "apps\api"
$VenvPython = Join-Path $ApiDir ".venv\Scripts\python.exe"

# Modelo de Ollama dimensionado para 4 GB de VRAM. Debe coincidir con el
# OLLAMA_MODEL de apps/api/.env y apps/web/.env.
$OllamaModel = "qwen2.5:3b-instruct"

function Write-Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }
function Write-Ok($message) { Write-Host "    OK  $message" -ForegroundColor Green }
function Write-Info($message) { Write-Host "    ..  $message" -ForegroundColor DarkGray }
function Write-Fail($message) { Write-Host "    ERROR  $message" -ForegroundColor Red }

# --- 1. Requisitos ---------------------------------------------------------

Write-Step "Comprobando requisitos"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Fail "Node.js no esta instalado o no esta en el PATH. Instala Node 20 o superior."
    exit 1
}
$nodeVersion = (node --version).TrimStart("v")
$nodeMajor = [int]($nodeVersion.Split(".")[0])
if ($nodeMajor -lt 20) {
    Write-Fail "Node $nodeVersion es demasiado antiguo. Hace falta Node 20 o superior."
    exit 1
}
Write-Ok "Node $nodeVersion"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Fail "npm no esta disponible en el PATH."
    exit 1
}
Write-Ok "npm $(npm --version)"

# El servicio de inferencia necesita Python 3.14: las dependencias fijadas en
# apps/api/requirements.txt solo publican wheels para esa serie.
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Fail "Python no esta en el PATH. Instala Python 3.14 desde python.org."
    exit 1
}
$pythonVersion = (python --version) -replace "Python ", ""
Write-Ok "Python $pythonVersion"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker no esta instalado o no esta en el PATH. Instala Docker Desktop."
    exit 1
}
Write-Ok "Docker $((docker --version) -replace 'Docker version ', '')"

# --- 2. Motor de Docker ----------------------------------------------------

Write-Step "Comprobando el motor de Docker"

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Info "El motor no responde. Lanzando Docker Desktop..."
    $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
        Start-Process $dockerDesktop
    } else {
        Write-Fail "No se encuentra Docker Desktop en $dockerDesktop. Arrancalo a mano."
        exit 1
    }

    $esperaMaxima = 120
    $transcurrido = 0
    while ($transcurrido -lt $esperaMaxima) {
        Start-Sleep -Seconds 5
        $transcurrido += 5
        docker info *> $null
        if ($LASTEXITCODE -eq 0) { break }
        Write-Info "Esperando al motor de Docker... ${transcurrido}s"
    }

    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Docker Desktop no ha arrancado en $esperaMaxima segundos. Revisalo y reintenta."
        exit 1
    }
}
Write-Ok "Motor de Docker operativo"

# --- 3. Infraestructura ----------------------------------------------------

Write-Step "Levantando PostgreSQL y Ollama"

Push-Location $WorkspaceRoot
try {
    # Postgres tiene healthcheck, asi que --wait bloquea hasta que este listo
    # de verdad para aceptar conexiones, no solo hasta que arranque el contenedor.
    docker compose up -d --wait postgres
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "No se ha podido levantar PostgreSQL."
        exit 1
    }
    Write-Ok "PostgreSQL listo en localhost:5433"

    docker compose up -d ollama
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "No se ha podido levantar Ollama."
        exit 1
    }

    # Ollama no declara healthcheck en el compose, asi que se sondea su API.
    $ollamaListo = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 | Out-Null
            $ollamaListo = $true
            break
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    if ($ollamaListo) {
        Write-Ok "Ollama listo en localhost:11434"
    } else {
        Write-Info "Ollama no responde todavia. La generacion de phishing usara el fallback determinista."
    }

    # Descargar el modelo si aun no esta. Sin el, la API sigue funcionando pero
    # cae siempre en las plantillas de respaldo.
    if ($ollamaListo) {
        $modelos = docker compose exec -T ollama ollama list
        if ($modelos -match [regex]::Escape($OllamaModel)) {
            Write-Ok "Modelo $OllamaModel disponible"
        } else {
            Write-Info "Descargando el modelo $OllamaModel (~2 GB, solo la primera vez)..."
            docker compose exec -T ollama ollama pull $OllamaModel
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Modelo $OllamaModel descargado"
            } else {
                Write-Info "No se ha podido descargar el modelo. Se usara el fallback determinista."
            }
        }

        # Precalentado. La primera inferencia tiene que cargar el modelo en VRAM
        # y puede tardar mas que el timeout de 60 s del cliente de Ollama, con
        # lo que la primera generacion de phishing caeria en el fallback sin que
        # se entienda por que. Se lanza aqui una peticion minima para dejarlo
        # cargado antes de que el usuario toque nada.
        Write-Info "Precalentando el modelo..."
        try {
            $cuerpo = @{ model = $OllamaModel; prompt = "hola"; stream = $false } | ConvertTo-Json
            Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post `
                -ContentType "application/json" -Body $cuerpo -TimeoutSec 300 | Out-Null
            Write-Ok "Modelo cargado y listo para inferencia"
        } catch {
            Write-Info "No se ha podido precalentar el modelo. La primera generacion puede caer en el fallback."
        }
    }
} finally {
    Pop-Location
}

# --- 4. Dependencias -------------------------------------------------------

Write-Step "Comprobando dependencias"

if (-not (Test-Path (Join-Path $WorkspaceRoot "node_modules"))) {
    Write-Info "Instalando dependencias de npm (workspaces)..."
    Push-Location $WorkspaceRoot
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "npm install ha fallado."
            exit 1
        }
    } finally {
        Pop-Location
    }
}
Write-Ok "Dependencias de npm instaladas"

# El venv se comprueba ejecutandolo: en Windows un venv copiado de otra ruta o
# creado con un interprete que ya no existe deja el ejecutable ahi pero roto.
$venvValido = $false
if (Test-Path $VenvPython) {
    & $VenvPython --version *> $null
    if ($LASTEXITCODE -eq 0) { $venvValido = $true }
}

if (-not $venvValido) {
    Write-Info "Creando el entorno virtual de Python del servicio de inferencia..."
    if (Test-Path (Join-Path $ApiDir ".venv")) {
        Remove-Item -Recurse -Force (Join-Path $ApiDir ".venv")
    }
    Push-Location $ApiDir
    try {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "No se ha podido crear el entorno virtual."
            exit 1
        }
        & $VenvPython -m pip install --upgrade pip --quiet
        Write-Info "Instalando dependencias (incluye PyTorch, ~122 MB: la primera vez tarda)."
        # --only-binary hace que pip falle en vez de compilar si faltara un wheel.
        & $VenvPython -m pip install --only-binary=:all: -r requirements.txt
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "No se han podido instalar las dependencias de Python."
            exit 1
        }
    } finally {
        Pop-Location
    }
}
Write-Ok "Entorno de Python listo"

# --- 5. Base de datos ------------------------------------------------------

Write-Step "Preparando la base de datos"

Push-Location $WebDir
try {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "prisma generate ha fallado."
        exit 1
    }
    Write-Ok "Cliente de Prisma generado"

    # migrate deploy aplica las migraciones pendientes sin preguntar nada, que
    # es lo que corresponde en un arranque automatizado. Antes esto era
    # "db push", que sincronizaba el esquema a la fuerza y sin dejar historial.
    npx prisma migrate deploy
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "prisma migrate deploy ha fallado."
        exit 1
    }
    Write-Ok "Migraciones aplicadas en PostgreSQL"
} finally {
    Pop-Location
}

if ($NoSeed) {
    Write-Info "Siembra omitida (-NoSeed)"
} else {
    $debeSembrar = $Seed.IsPresent
    if (-not $debeSembrar) {
        Push-Location $WorkspaceRoot
        try {
            # Se consulta directamente contra el contenedor para no pagar el
            # arranque de un proceso de Node solo para contar filas. Si la tabla
            # aun no existe o la consulta falla, se siembra.
            # Las comillas del identificador van escapadas: sin la barra,
            # PowerShell se las come al pasar el argumento al ejecutable nativo
            # y psql pliega "Company" a minusculas, que no es el nombre real.
            $salida = docker compose exec -T postgres psql -U nexusguard -d nexusguard -tAc 'SELECT count(*) FROM \"Company\"'
            $conteo = 0
            if ($LASTEXITCODE -ne 0) {
                $debeSembrar = $true
            } elseif (-not [int]::TryParse(($salida | Out-String).Trim(), [ref]$conteo)) {
                $debeSembrar = $true
            } elseif ($conteo -eq 0) {
                $debeSembrar = $true
            }
        } finally {
            Pop-Location
        }
    }

    if ($debeSembrar) {
        Push-Location $WebDir
        try {
            npx prisma db seed
            if ($LASTEXITCODE -ne 0) {
                Write-Fail "El seed ha fallado."
                exit 1
            }
            Write-Ok "Datos de demo sembrados"
        } finally {
            Pop-Location
        }
    } else {
        Write-Ok "La base de datos ya tiene datos (usa -Seed para resembrar)"
    }
}

# --- 6. Servicios ----------------------------------------------------------

if ($NoStart) {
    Write-Step "Entorno preparado (-NoStart: no se arrancan los servicios)"
    exit 0
}

Write-Step "Arrancando los servicios"

# El CORS del servicio de inferencia solo admite http://localhost:3000, por eso
# el frontend arranca con el puerto fijado y no con el que Next elija libre.
$comandoApi = "Set-Location '$ApiDir'; & '$VenvPython' -m uvicorn app.main:app --reload --port 8010"
$comandoWeb = "Set-Location '$WebDir'; npm run dev"

Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", $comandoApi
Write-Ok "Servicio de inferencia arrancando en http://localhost:8010"

Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", $comandoWeb
Write-Ok "Frontend arrancando en http://localhost:3000"

Write-Host ""
Write-Host "NexusGuard AI en marcha:" -ForegroundColor Cyan
Write-Host "  Web         http://localhost:3000"
Write-Host "  API (docs)  http://localhost:8010/docs"
Write-Host "  Ollama      http://localhost:11434"
Write-Host "  PostgreSQL  localhost:5433 (usuario nexusguard, base nexusguard)"
Write-Host ""
Write-Host "  Prisma Studio:  npm run prisma:studio" -ForegroundColor DarkGray
Write-Host "  Parar Docker:   docker compose down" -ForegroundColor DarkGray
Write-Host ""
