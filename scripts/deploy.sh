#!/usr/bin/env bash
# WARP Railway deployment script — Section 8 checklist
# Run from the repo root: ./scripts/deploy.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Step 1: Railway login ==="
railway login

echo "=== Step 2: Create Railway project ==="
railway init --name warp

echo "=== Step 3: Link project (sets project ID in railway config) ==="
# After init this is already linked; skip if already linked

echo ""
echo "=== IMPORTANT: Set environment variables in Railway dashboard before continuing ==="
echo "  Required vars (copy from .env.example and fill in real values):"
echo "    MONGODB_URI, MONGODB_DB, API_SECRET, WEBHOOK_SECRET, SELF_NUMBER"
echo "    WA_SESSION_DATA_PATH=/data/session"
echo "    WEBHOOK_URL=http://warp-api.railway.internal/ingest/event"
echo "    POSTHOG_API_KEY (optional)"
echo ""
echo "Press Enter when env vars are set in Railway dashboard..."
read -r

echo "=== Step 4: Deploy warp-api ==="
railway up --service warp-api --detach

echo "=== Step 5: Verify /health ==="
echo "Check Railway dashboard for warp-api URL, then run:"
echo "  curl https://<warp-api-url>/health"
echo ""
echo "Press Enter when warp-api /health returns 200..."
read -r

echo "=== Step 6: Deploy warp-wa-listener ==="
echo "NOTE: Add volume to warp-wa-listener FIRST in Railway dashboard:"
echo "  Service → Volumes → Add volume → mount path: /data/session"
echo "Press Enter when volume is added..."
read -r
railway up --service warp-wa-listener --detach

echo "=== Step 7: Watch for QR code in listener logs ==="
echo "Run: railway logs --service warp-wa-listener"
echo "Scan the QR code with WhatsApp on your phone."
echo ""
echo "Press Enter after scanning QR and seeing 'WA session ready' in logs..."
read -r

echo "=== Step 8: Deploy warp-worker ==="
railway up --service warp-worker --detach

echo "=== Step 9: Cloudflare CNAME ==="
echo "In Railway dashboard: warp-api → Settings → Networking → Add custom domain: warp.belavadi.com"
echo "In Cloudflare dashboard: DNS → Add record:"
echo "  Type: CNAME"
echo "  Name: warp"
echo "  Target: <warp-api-url>.up.railway.app"
echo "  Proxy: Enabled (orange cloud)"

echo ""
echo "=== Deployment complete ==="
echo "Verification queries — run in MongoDB shell:"
cat << 'EOF'
  db.messages.countDocuments()
  db.messages.findOne({}, {wa_message_id:1, from_number:1, body:1, direction:1})
  db.contacts.findOne({}, {number:1, display_names:1, message_count:1, tier:1})
  db.edges.findOne({}, {from_number:1, to_number:1, messages_sent:1, messages_received:1, decay_score:1})
EOF
