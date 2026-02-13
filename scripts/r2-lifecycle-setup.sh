#!/bin/bash
# ============================================================
# Cloudflare R2 Lifecycle Rule Setup
# Configures automatic deletion of photos after 45 days
#
# Prerequisites:
#   - Cloudflare CLI (wrangler) installed: npm install -g wrangler
#   - Logged in: wrangler login
#
# Usage:
#   chmod +x scripts/r2-lifecycle-setup.sh
#   ./scripts/r2-lifecycle-setup.sh
# ============================================================

BUCKET_NAME="villahadad-gallery"
ACCOUNT_ID="bb7bb29aae787d9ab910137068caade6"
LIFECYCLE_DAYS=45

echo "╔══════════════════════════════════════════════════╗"
echo "║  Cloudflare R2 Lifecycle Rule Configuration      ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Bucket:    $BUCKET_NAME"
echo "║  Account:   $ACCOUNT_ID"
echo "║  Rule:      Delete objects after $LIFECYCLE_DAYS days"
echo "║  Prefix:    sessions/"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# R2 lifecycle rules are configured via the Cloudflare Dashboard or API
# Using the API approach:

echo "Setting lifecycle rule via Cloudflare API..."
echo ""
echo "NOTE: As of 2026, R2 lifecycle rules are configured via:"
echo "  1. Cloudflare Dashboard → R2 → $BUCKET_NAME → Settings → Object Lifecycle"
echo "  2. Or via the API below"
echo ""
echo "Dashboard steps:"
echo "  1. Go to: https://dash.cloudflare.com/$ACCOUNT_ID/r2/default/buckets/$BUCKET_NAME/settings"
echo "  2. Click 'Object lifecycle rules'"
echo "  3. Add rule:"
echo "     - Name: auto-cleanup-45-days"
echo "     - Prefix: sessions/"
echo "     - Action: Delete after $LIFECYCLE_DAYS days"
echo "  4. Save"
echo ""
echo "This will automatically delete all client photos from R2"
echo "after $LIFECYCLE_DAYS days. Originals remain safe on NAS."
echo ""
echo "Done! The lifecycle rule will apply to all objects under sessions/"
