#!/bin/bash
# Plume — Installation complète VPS (Ubuntu 22/24)
# Une seule commande depuis la console Hostinger :
#   bash <(curl -sL https://raw.githubusercontent.com/zakibelm/Plume/claude/build-plume-engine-6T72W/setup-vps.sh)

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
die()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

DOMAIN="plume.optigenius.pro"
REPO="https://github.com/zakibelm/Plume"
BRANCH="claude/build-plume-engine-6T72W"
APP_DIR="/opt/plume"
FRONTEND_DIST="/var/www/plume/dist"
EMAIL="admin@optigenius.pro"

echo ""
echo "  ██████╗ ██╗     ██╗   ██╗███╗   ███╗███████╗"
echo "  ██╔══██╗██║     ██║   ██║████╗ ████║██╔════╝"
echo "  ██████╔╝██║     ██║   ██║██╔████╔██║█████╗  "
echo "  ██╔═══╝ ██║     ██║   ██║██║╚██╔╝██║██╔══╝  "
echo "  ██║     ███████╗╚██████╔╝██║ ╚═╝ ██║███████╗"
echo "  ╚═╝     ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝"
echo "  Installation VPS → $DOMAIN"
echo ""

# ── Clés requises (lire depuis env si déjà définies) ─────────────────────────
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  read -rsp "→ SUPABASE_SERVICE_ROLE_KEY : " SUPABASE_SERVICE_ROLE_KEY; echo
fi
if [ -z "$OPENROUTER_API_KEY" ]; then
  read -rsp "→ OPENROUTER_API_KEY        : " OPENROUTER_API_KEY; echo
fi
echo ""

[ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && die "SUPABASE_SERVICE_ROLE_KEY requis"
[ -z "$OPENROUTER_API_KEY" ]        && die "OPENROUTER_API_KEY requis"

# ── Dépendances système ───────────────────────────────────────────────────────
log "Mise à jour du système..."
apt-get update -qq && apt-get upgrade -y -qq

log "Installation des dépendances..."
apt-get install -y -qq \
  git curl wget gnupg2 ca-certificates \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban

# Node.js 20
if ! command -v node &>/dev/null || [[ "$(node -v)" < "v20" ]]; then
  log "Installation Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -qq
  apt-get install -y -qq nodejs
fi

# Docker
if ! command -v docker &>/dev/null; then
  log "Installation Docker..."
  curl -fsSL https://get.docker.com | sh -qq
  systemctl enable docker && systemctl start docker
fi

log "Node $(node -v) | Docker $(docker --version | cut -d' ' -f3)"

# ── Firewall ──────────────────────────────────────────────────────────────────
log "Configuration firewall (UFW)..."
ufw --force reset -qq
ufw default deny incoming -qq
ufw default allow outgoing -qq
ufw allow 22/tcp   comment 'SSH'    -qq
ufw allow 80/tcp   comment 'HTTP'   -qq
ufw allow 443/tcp  comment 'HTTPS'  -qq
ufw --force enable -qq

# ── Fail2ban SSH ──────────────────────────────────────────────────────────────
log "Configuration fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled  = true
port     = ssh
filter   = sshd
maxretry = 5
bantime  = 1h
findtime = 10m
EOF
systemctl enable fail2ban && systemctl restart fail2ban

# ── Clé SSH (désactiver auth par mot de passe) ───────────────────────────────
warn "Pour accès SSH sécurisé, ajoute ta clé publique dans ~/.ssh/authorized_keys"
warn "Puis exécute : sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart sshd"

# ── Repo ─────────────────────────────────────────────────────────────────────
log "Clonage du repo..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git fetch origin && git checkout "$BRANCH" && git pull origin "$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ── .env backend ─────────────────────────────────────────────────────────────
log "Création du .env backend..."
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000

SUPABASE_URL=https://purfxlkhgzdbtjabnbno.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1cmZ4bGtoZ3pkYnRqYWJuYm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODk1NjIsImV4cCI6MjA5MzA2NTU2Mn0.4BX69oBiqNQ1_tjbWuAoVS_TCHAFL708SKHYFlbOn5I
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

CORS_ORIGIN=https://${DOMAIN}
LOG_LEVEL=info
LOG_DIR=/app/logs
LLM_TIMEOUT_MS=30000
LLM_MAX_RETRIES=2
DEFAULT_MAX_COST_USD=2.00
DEFAULT_MAX_LLM_CALLS=60
EOF

# ── Frontend build ────────────────────────────────────────────────────────────
log "Build du frontend React..."
cd "$APP_DIR/frontend"
npm install --silent
npm run build

log "Déploiement des fichiers statiques..."
mkdir -p "$FRONTEND_DIST"
cp -r dist/* "$FRONTEND_DIST/"
chown -R www-data:www-data "$FRONTEND_DIST"

# ── Backend Docker ────────────────────────────────────────────────────────────
log "Build et démarrage du backend Docker..."
cd "$APP_DIR"
docker compose down --remove-orphans 2>/dev/null || true
docker compose build --no-cache -q
docker compose up -d
sleep 5

HEALTH=$(curl -s http://localhost:3000/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "?")
log "Backend health : $HEALTH"

# ── Nginx ─────────────────────────────────────────────────────────────────────
log "Configuration Nginx..."
cp "$APP_DIR/nginx/plume.conf" "/etc/nginx/sites-available/$DOMAIN"
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default

# Config temporaire HTTP pour Certbot
cat > "/etc/nginx/sites-available/$DOMAIN" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $FRONTEND_DIST;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
    location /api/ { proxy_pass http://localhost:3000; proxy_set_header Host \$host; }
    location /health { proxy_pass http://localhost:3000; }
}
EOF
nginx -t && systemctl reload nginx

# ── SSL Certbot ───────────────────────────────────────────────────────────────
log "Génération du certificat SSL..."
certbot --nginx -d "$DOMAIN" \
  --non-interactive --agree-tos \
  -m "$EMAIL" \
  --redirect \
  --quiet

# Restaurer config Nginx complète (avec SSL)
cp "$APP_DIR/nginx/plume.conf" "/etc/nginx/sites-available/$DOMAIN"
nginx -t && systemctl reload nginx

# Renouvellement auto
echo "0 3 * * * root certbot renew --quiet && systemctl reload nginx" > /etc/cron.d/certbot-plume

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Plume déployé avec succès !${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  🌐 Frontend : https://$DOMAIN"
echo "  🔌 API      : https://$DOMAIN/api"
echo "  💓 Health   : https://$DOMAIN/health"
echo ""
echo "  Logs backend : docker logs plume-backend -f"
echo "  Mise à jour  : cd $APP_DIR && git pull && ./deploy.sh"
echo ""
