#!/bin/bash
# Quick deployment script for Synology

echo "📦 Creating deployment package..."

# Create tarball (ضغط ملفات السيرفر)
cd villahadad-api
tar -czf ../villahadad-api.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  .

cd ..

echo "✅ Package created: villahadad-api.tar.gz"
echo ""

echo "📤 Upload to Synology (Using VilaApp):"
# 👇 الأمر الصحيح للرفع باستخدام المستخدم الجديد
scp villahadad-api.tar.gz VilaApp@192.168.68.107:/volume1/docker/

echo ""
echo "🔧 Then SSH and extract:"
# 👇 الأمر الصحيح للدخول للسيرفر
echo "ssh VilaApp@192.168.68.107"

echo "---------------------------------------------------"
echo "📌 Once inside Synology, run these commands:"
echo "1. cd /volume1/docker"
echo "2. tar -xzf villahadad-api.tar.gz"
echo "3. cd villahadad-api"
echo "4. npm install --production"
echo "5. pm2 restart all  (OR: node server.js)"
echo "---------------------------------------------------"