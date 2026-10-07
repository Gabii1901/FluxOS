#!/bin/bash
# Script de deploy do FluxOS na VPS.
# Uso: na VPS, dentro de /var/www/fluxos, rode: bash deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> Repositório: $(pwd)"

echo "==> Puxando mudanças do GitHub"
git pull origin main

echo "==> Backend: instalando dependências"
cd backend
npm install

echo "==> Backend: aplicando migrations pendentes"
npx prisma migrate deploy
npx prisma generate

echo "==> Backend: build"
npm run build

echo "==> Backend: reiniciando serviço"
sudo systemctl restart fluxos-backend
sudo systemctl status fluxos-backend --no-pager -l | head -10

cd ../frontend
echo "==> Frontend: instalando dependências"
npm install

echo "==> Frontend: build"
npm run build

echo "==> Deploy concluído."
curl -sf https://fluxosapp.tech/api/health && echo " — backend respondendo OK"
