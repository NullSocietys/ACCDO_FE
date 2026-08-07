# Script de PowerShell para convertir imágenes PNG a WebP
# Uso: .\convertir-imagenes.ps1
# 
# Nota: Requiere tener instalado Node.js y Sharp
# Instalación: npm install sharp

Write-Host "🚀 Iniciando conversión de imágenes a WebP..." -ForegroundColor Cyan
Write-Host ""

# Verificar si Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js no está instalado." -ForegroundColor Red
    Write-Host "   Descarga Node.js desde: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Verificar si Sharp está instalado
$sharpInstalled = npm list sharp 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Sharp no está instalado. Instalando..." -ForegroundColor Yellow
    npm install sharp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al instalar Sharp." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Sharp instalado correctamente." -ForegroundColor Green
    Write-Host ""
}

# Ejecutar el script de conversión
Write-Host "🔄 Ejecutando conversión..." -ForegroundColor Cyan
Write-Host ""

node convertir-imagenes.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✨ ¡Proceso completado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "   1. Verifica que las imágenes .webp estén en las carpetas" -ForegroundColor White
    Write-Host "   2. Prueba la landing page en el navegador" -ForegroundColor White
    Write-Host "   3. Verifica que las imágenes se vean correctamente" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Hubo errores durante la conversión." -ForegroundColor Red
    Write-Host "   Revisa los mensajes anteriores para más detalles." -ForegroundColor Yellow
    Write-Host ""
}

# Pausar para que el usuario pueda leer el resultado
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
