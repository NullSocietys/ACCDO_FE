# syntax=docker/dockerfile:1

# ═══════════════════════════════════════════════════════════════
#  FRONTEND — Chicote de Oro (Angular 22 + Nginx)
#  Build:  docker build --build-arg API_URL=https://api.tudominio.com -t carloscaycho/chicote-frontend ./ACCDO_FE
#  Run:    docker run -p 4200:80 carloscaycho/chicote-frontend
#  API_URL se inyecta en build-time en environment.ts (scripts/generate-env.mjs).
#  Para Vercel basta definir API_URL en el dashboard del proyecto.
# ═══════════════════════════════════════════════════════════════

########## Etapa 1 — build Angular ##########
FROM node:22-alpine AS build
WORKDIR /app

ARG API_URL
ENV API_URL=$API_URL

# Cache de dependencias (requiere package-lock.json)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

########## Etapa 2 — nginx ##########
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Solo el navegador (SPA): dist/chicote-oro/browser
COPY --from=build /app/dist/chicote-oro/browser ./

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1
