/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const target = process.env.VITE_APP_TARGET || 'default';

const configs = {
  manager: {
    appId: "com.villahadad.manager",
    productName: "VH Manager",
    files: ["dist-manager/**/*", "electron/**/*", "package.json"],
    directories: { output: "release/manager" }
  },
  reception: {
    appId: "com.villahadad.reception",
    productName: "VH Reception",
    files: ["dist-reception/**/*", "electron/**/*", "package.json"],
    directories: { output: "release/reception" }
  },
  admin: {
    appId: "com.villahadad.admin",
    productName: "VH Admin",
    files: ["dist-admin/**/*", "electron/**/*", "package.json"],
    directories: { output: "release/admin" }
  },
  production: {
    appId: "com.villahadad.production",
    productName: "VH Production",
    files: ["dist-production/**/*", "electron/**/*", "package.json"],
    directories: { output: "release/production" }
  },
  printer: {
    appId: "com.villahadad.printer",
    productName: "VH Printer",
    files: ["dist-printer/**/*", "electron/**/*", "package.json"],
    directories: { output: "release/printer" }
  },
  default: {
    appId: "com.villahadad.app",
    productName: "Villa Hadad",
    files: ["dist/**/*", "electron/**/*", "package.json"],
    directories: { output: "release/standard" }
  }
};

const config = configs[target] || configs.default;

module.exports = {
  ...config,
  mac: {
    target: [
      { target: "dmg", arch: ["arm64", "x64"] },
      { target: "zip", arch: ["arm64", "x64"] }
    ],
    category: "public.app-category.business",
    icon: "build/icon.icns",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist"
  },
  
  
  // ✅ Auto-Update Configuration - GitHub Releases
  publish: {
    provider: "github",
    owner: "mohammedalkhldiy",
    repo: "VillahadadUpdate",
    releaseType: "release"
  },
  
  // Generate latest.yml for auto-updater
  generateUpdatesFilesForAllChannels: true,
  
  asar: true,
  asarUnpack: [
    "**/node_modules/better-sqlite3/**/*"
  ],
  beforePack: async (_context) => {
    const { execSync } = require('child_process');
    
    console.log('\n🔧 Rebuilding better-sqlite3 for Electron...');
    
    try {
      execSync(
        'npx @electron/rebuild -f -w better-sqlite3',
        {
          cwd: process.cwd(),
          stdio: 'inherit',
          shell: true
        }
      );
      
      console.log('✅ better-sqlite3 rebuilt successfully!\n');
    } catch (error) {
      console.error('❌ Rebuild failed:', error);
      throw error;
    }
  }
};
