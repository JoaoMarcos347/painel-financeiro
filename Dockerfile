# syntax=docker/dockerfile:1.7
# Painel Financeiro (Next.js 16, output: standalone)
#
# Build (lê o .env.local como SECRET, sem gravá-lo na imagem):
#   docker build --secret id=envlocal,src=.env.local -t painel-financeiro .
#
# Run (passa as variáveis em tempo de execução):
#   docker run --env-file .env.local -p 3000:3000 painel-financeiro
#
# ⚠️ O build pré-renderiza as páginas (ISR) -> precisa do .env.local válido E do
#    Supabase no ar no momento do build.

# ---- deps: instala dependências ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: gera o build standalone ----
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=secret,id=envlocal,target=/app/.env.local \
    npm run build

# ---- runner: imagem final enxuta ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
