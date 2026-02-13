#!/bin/bash

# Villa Hadad SQLite Database Cleanup
# Usage: ./cleanup-sqlite.sh [--execute]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🏛️  Villa Hadad - SQLite Database Cleanup"
echo ""

# Check if better-sqlite3 is installed
if ! node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "📦 Installing better-sqlite3..."
    npm install better-sqlite3
fi

# Parse arguments
if [ "$1" == "--execute" ]; then
    echo "⚠️  Mode: EXECUTE (will actually delete data!)"
    echo ""
    node scripts/cleanup-sqlite.js --execute
else
    echo "🔍 Mode: DRY RUN (preview only - no data will be deleted)"
    echo "   Run with --execute to actually delete data"
    echo ""
    node scripts/cleanup-sqlite.js
fi
