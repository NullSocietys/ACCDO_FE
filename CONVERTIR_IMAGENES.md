# 🖼️ Guía para Convertir Imágenes a WebP

## ¿Por qué WebP?
El formato WebP reduce el tamaño de las imágenes entre 25-35% sin pérdida visible de calidad, mejorando significativamente el rendimiento de la landing page.

## 📋 Imágenes a Convertir

### Logo (carpeta `public/logo/`)
- ✅ `logo.png` → `logo.webp`
- ✅ `eslogan.png` → `eslogan.webp`

### Carrusel (carpeta `public/carrusel-img/`)
- ✅ `background1.png` → `background1.webp`
- ✅ `background2.png` → `background2.webp`
- ✅ `background3.png` → `background3.webp`
- ✅ `background4.png` → `background4.webp`
- ✅ `background5.png` → `background5.webp`
- ✅ `background6.png` → `background6.webp`
- ✅ `background7.png` → `background7.webp`
- ✅ `background8.png` → `background8.webp`

### Fotos - Ballets (carpeta `public/fotos/ballets/`)
- ✅ `ballet1.png` → `ballet1.webp`
- ✅ `ballet2.png` → `ballet2.webp`
- ✅ `ballet3.png` → `ballet3.webp`
- ✅ `ballet4.png` → `ballet4.webp`

### Fotos - Parejas (carpeta `public/fotos/parejas/`)
- ✅ `pareja1.png` → `pareja1.webp`
- ✅ `pareja2.png` → `pareja2.webp`
- ✅ `pareja3.png` → `pareja3.webp`
- ✅ `pareja4.png` → `pareja4.webp`

### Fotos - Unipersonal (carpeta `public/fotos/unipersonal/`)
- ✅ `unipersonal-M.png` → `unipersonal-M.webp`
- ✅ `unipersonal-V1.png` → `unipersonal-V1.webp`
- ✅ `unipersonal-v2.png` → `unipersonal-v2.webp`
- ✅ `unipersonal-V3.png` → `unipersonal-V3.webp`

---

## 🛠️ Métodos de Conversión

### Opción 1: Herramienta Online (Más Fácil)
1. Ir a https://cloudconvert.com/png-to-webp
2. Subir las imágenes PNG
3. Configurar calidad: 85-90%
4. Descargar las versiones WebP
5. Colocarlas en las mismas carpetas que las originales

### Opción 2: Con Node.js (Automatizado)
```bash
# Instalar dependencia
npm install sharp

# Crear y ejecutar script
node convertir-imagenes.js
```

### Opción 3: Photoshop / GIMP
1. Abrir imagen en Photoshop o GIMP
2. Exportar como WebP
3. Calidad: 85-90%
4. Guardar en la misma carpeta

### Opción 4: Herramienta de línea de comandos
```bash
# Instalar cwebp (Google)
# Windows: descargar desde https://developers.google.com/speed/webp/download

# Convertir una imagen
cwebp -q 85 input.png -o output.webp

# Convertir todas las imágenes de una carpeta
for %f in (*.png) do cwebp -q 85 %f -o %~nf.webp
```

---

## 📝 Script de Conversión Automática

Aquí tienes un script que puedes usar con Node.js:

```javascript
// convertir-imagenes.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const folders = [
  'public/logo',
  'public/carrusel-img',
  'public/fotos/ballets',
  'public/fotos/parejas',
  'public/fotos/unipersonal'
];

async function convertirImagenes() {
  for (const folder of folders) {
    const files = fs.readdirSync(folder);
    
    for (const file of files) {
      if (file.endsWith('.png')) {
        const inputPath = path.join(folder, file);
        const outputPath = path.join(folder, file.replace('.png', '.webp'));
        
        try {
          await sharp(inputPath)
            .webp({ quality: 85 })
            .toFile(outputPath);
          
          console.log(`✅ Convertido: ${file} → ${file.replace('.png', '.webp')}`);
        } catch (error) {
          console.error(`❌ Error en ${file}:`, error.message);
        }
      }
    }
  }
  
  console.log('\n🎉 ¡Conversión completada!');
}

convertirImagenes();
```

Para ejecutarlo:
```bash
npm install sharp
node convertir-imagenes.js
```

---

## ✅ Verificación

Después de convertir las imágenes:

1. ✅ Verifica que todos los archivos .webp estén en sus carpetas
2. ✅ Compara los tamaños (deben ser 25-35% más pequeños)
3. ✅ Prueba la landing page en el navegador
4. ✅ Verifica que las imágenes se vean correctamente
5. ✅ Opcional: elimina los PNG originales si todo funciona

---

## 🔄 Sistema de Fallback

El código HTML ya está preparado con el elemento `<picture>` que:
- Intenta cargar WebP primero (navegadores modernos)
- Si no es compatible, carga PNG automáticamente
- **No necesitas eliminar los PNG originales** para que funcione

---

## 📊 Beneficios Esperados

- ⚡ **Carga 30-40% más rápida**
- 💾 **Ahorro de 60-70% de ancho de banda**
- 🚀 **Mejor puntuación en Lighthouse/PageSpeed**
- 📱 **Experiencia móvil más fluida**

---

## 🆘 Problemas Comunes

**P: Las imágenes no se ven**
R: Verifica que los archivos .webp estén en la misma carpeta que los .png

**P: La calidad se ve mal**
R: Aumenta el parámetro de calidad a 90-95

**P: El navegador no soporta WebP**
R: El sistema de fallback cargará automáticamente los PNG

---

## 📝 Notas Importantes

- ⚠️ **Mantén los PNG originales** hasta verificar que todo funcione
- 🎨 **Calidad recomendada:** 85% para fotos, 90% para gráficos
- 📏 **No cambies los nombres** de los archivos
- ✨ **Las imágenes ya están optimizadas** en el código HTML
