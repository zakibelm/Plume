#!/bin/bash
set -e

# ── Plume — Script de déploiement VPS ────────────────────────────────────────
# Usage : ./deploy.sh
# Prérequis : Docker, Docker Compose, Node 20, Nginx, Certbot installés

DOMAIN="plume.optigenius.pro"
FRONTEND_DIST="/var/www/plume/dist"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "→ Mise à jour du code..."
git pull origin claude/build-plume-engine-6T72W

# ── Frontend build ────────────────────────────────────────────────────────────
echo "→ Build du frontend..."
cd "$REPO_DIR/frontend"

# Créer .env.production si inexistant
if [ ! -f .env.production ]; then
  cat > .env.production <<EOF
VITE_API_URL=https://$DOMAIN
VITE_SUPABASE_URL=https://purfxlkhgzdbtjabnbno.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cmZ4bGtoZ3pkYnRqYWJuYm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODk1NjIsImV4cCI6MjA5MzA2NTU2Mn0.4BX69oBiqNQ1_tjbWuAoVS_TCHAFL708SKHYFlbOn5I
EOF
  echo "  .env.production créé"
fi

npm install --silent
npm run build

# Copier le build vers Nginx
echo "→ Déploiement du frontend vers $FRONTEND_DIST..."
sudo mkdir -p "$FRONTEND_DIST"
sudo cp -r dist/* "$FRONTEND_DIST/"
sudo chown -R www-data:www-data "$FRONTEND_DIST"

# ── Backend Docker ────────────────────────────────────────────────────────────
echo "→ Build et démarrage du backend..."
cd "$REPO_DIR"

# Vérifier que .env existe
if [ ! -f .env ]; then
  echo "⚠ Fichier .env manquant à la racine. Copier .env.example et compléter."
  exit 1
fi

docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "→ Configuration Nginx..."
sudo cp "$REPO_DIR/nginx/plume.conf" /etc/nginx/sites-available/plume.optigenius.pro
sudo ln -sf /etc/nginx/sites-available/plume.optigenius.pro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ── SSL (si pas encore configuré) ────────────────────────────────────────────
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "→ Génération du certificat SSL..."
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@optigenius.pro
fi

echo ""
echo "✓ Déploiement terminé"
echo "  Frontend : https://$DOMAIN"
echo "  Backend  : https://$DOMAIN/api"
echo "  Health   : https://$DOMAIN/health"
