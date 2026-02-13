#!/bin/bash

# Villa Hadad Database Cleanup Script
# Usage: ./cleanup.sh [--execute]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🏛️  Villa Hadad - Database Cleanup"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create .env file with your Supabase credentials:"
    echo "   VITE_SUPABASE_URL=your-url"
    echo "   VITE_SUPABASE_ANON_KEY=your-key"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Check for required variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Missing Supabase credentials in .env file"
    exit 1
fi

# Parse arguments
DRY_RUN=true
if [ "$1" == "--execute" ]; then
    DRY_RUN=false
fi

if [ "$DRY_RUN" = true ]; then
    echo "🔍 Mode: DRY RUN (preview only - no data will be deleted)"
    echo "   Run with --execute to actually delete data"
    echo ""
    
    # Run TypeScript preview
    npx ts-node scripts/cleanup-database.ts
else
    echo "⚠️  Mode: EXECUTE (will actually delete data!)"
    echo ""
    
    # Run TypeScript with execute flag
    npx ts-node scripts/cleanup-database.ts --execute
fi
