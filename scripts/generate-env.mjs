import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ═══════════════════════════════════════════════════════════
//  Genera src/environments/environment.ts en BUILD-TIME desde API_URL.
//  · Vercel: define API_URL en el dashboard del proyecto.
//  · Docker: docker build --build-arg API_URL=https://...
//  · Local: usa el fallback http://localhost:8080 si no está seteada.
// ═══════════════════════════════════════════════════════════

const apiUrl = process.env.API_URL || 'http://localhost:8080';

const content = `// Generado en build-time desde la variable API_URL (scripts/generate-env.mjs).
// Vercel: defínela en el dashboard. Docker: --build-arg API_URL=...
export const environment = {
  production: false,
  apiUrl: '${apiUrl}',
};
`;

const target = join(process.cwd(), 'src', 'environments', 'environment.ts');
writeFileSync(target, content);
console.log(`[generate-env] ${target} -> apiUrl=${apiUrl}`);
