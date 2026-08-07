/**
 * Script para convertir todas las imágenes PNG a WebP
 * Uso: node convertir-imagenes.js
 * 
 * Requisitos: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Carpetas con imágenes a convertir
const folders = [
  'public/logo',
  'public/carrusel-img',
  'public/fotos/ballets',
  'public/fotos/parejas',
  'public/fotos/unipersonal'
];

// Configuración de conversión
const config = {
  quality: 85,        // Calidad de 0-100 (85 es buen balance)
  effort: 6,          // Esfuerzo de compresión 0-6 (6 es máximo)
  lossless: false     // false = menor tamaño, true = sin pérdida
};

async function convertirImagenes() {
  console.log('🚀 Iniciando conversión de imágenes a WebP...\n');
  
  let totalConvertidas = 0;
  let totalErrores = 0;
  let ahorroTotal = 0;

  for (const folder of folders) {
    const folderPath = path.resolve(__dirname, folder);
    
    // Verificar que la carpeta existe
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Carpeta no encontrada: ${folder}`);
      continue;
    }

    console.log(`\n📁 Procesando: ${folder}`);
    console.log('─'.repeat(50));

    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      // Solo procesar archivos PNG
      if (!file.toLowerCase().endsWith('.png')) {
        continue;
      }

      const inputPath = path.join(folderPath, file);
      const outputFile = file.replace(/\.png$/i, '.webp');
      const outputPath = path.join(folderPath, outputFile);

      try {
        // Obtener tamaño original
        const statsOriginal = fs.statSync(inputPath);
        const sizeOriginal = (statsOriginal.size / 1024).toFixed(2);

        // Convertir a WebP
        await sharp(inputPath)
          .webp({ 
            quality: config.quality,
            effort: config.effort,
            lossless: config.lossless
          })
          .toFile(outputPath);

        // Obtener tamaño nuevo
        const statsNuevo = fs.statSync(outputPath);
        const sizeNuevo = (statsNuevo.size / 1024).toFixed(2);
        const porcentajeAhorro = ((1 - statsNuevo.size / statsOriginal.size) * 100).toFixed(1);
        
        ahorroTotal += (statsOriginal.size - statsNuevo.size);

        console.log(`✅ ${file}`);
        console.log(`   ${sizeOriginal} KB → ${sizeNuevo} KB (ahorro: ${porcentajeAhorro}%)`);

        totalConvertidas++;
      } catch (error) {
        console.error(`❌ Error en ${file}:`, error.message);
        totalErrores++;
      }
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE CONVERSIÓN');
  console.log('='.repeat(50));
  console.log(`✅ Imágenes convertidas: ${totalConvertidas}`);
  console.log(`❌ Errores: ${totalErrores}`);
  console.log(`💾 Ahorro total: ${(ahorroTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log('\n🎉 ¡Conversión completada!\n');
  console.log('💡 Consejo: Prueba la landing page para verificar que todo funciona correctamente.');
}

// Verificar que sharp está instalado
try {
  require.resolve('sharp');
  convertirImagenes();
} catch (error) {
  console.error('❌ Error: Sharp no está instalado.');
  console.log('\n📦 Para instalar Sharp, ejecuta:');
  console.log('   npm install sharp\n');
  process.exit(1);
}
