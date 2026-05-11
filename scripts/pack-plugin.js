#!/usr/bin/env node

/**
 * ⚠️  DEPRECATED: This script is deprecated.
 * 
 * Each plugin now has its own independent pack script.
 * Please use: cd plugins/<plugin-name> && pnpm pack
 * 
 * This script will be removed in a future version.
 */

console.warn('⚠️  WARNING: This script is deprecated.');
console.warn('💡 Each plugin now has its own independent pack script.');
console.warn('💡 Usage: cd plugins/<plugin-name> && pnpm pack\n');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate plugin directory and read metadata
 * @param {string} pluginDir - Absolute path to plugin directory
 * @returns {Object} Plugin metadata with id and version
 * @throws {Error} If plugin.json is missing or invalid (exits with code 1)
 */
function loadPluginMetadata(pluginDir) {
  console.log('📂 Reading plugin metadata...');
  const pluginJsonPath = path.join(pluginDir, 'plugin.json');

  if (!fs.existsSync(pluginJsonPath)) {
    console.error(`❌ Error: plugin.json not found in ${pluginDir}`);
    process.exit(1);
  }

  let pluginMeta;
  try {
    const pluginJsonContent = fs.readFileSync(pluginJsonPath, 'utf-8');
    pluginMeta = JSON.parse(pluginJsonContent);
  } catch (error) {
    console.error(`❌ Error: Invalid plugin.json format - ${error.message}`);
    process.exit(1);
  }

  const pluginId = pluginMeta.id;
  const version = pluginMeta.version;

  if (!pluginId || !version) {
    console.error('❌ Error: plugin.json must contain "id" and "version" fields');
    process.exit(1);
  }

  console.log(`✅ Plugin ID: ${pluginId}`);
  console.log(`✅ Version: ${version}`);

  return { pluginId, version, pluginJsonPath };
}

/**
 * Validate build output directory exists
 * @param {string} pluginDir - Absolute path to plugin directory
 * @throws {Error} If dist/ directory does not exist (exits with code 1)
 */
function validateBuildOutput(pluginDir) {
  console.log('✅ Validating build output...');
  const distDir = path.join(pluginDir, 'dist');

  if (!fs.existsSync(distDir)) {
    console.error("❌ Error: dist/ directory not found. Run 'pnpm build' first.");
    process.exit(1);
  }

  // Check if dist is empty
  const distFiles = fs.readdirSync(distDir);
  if (distFiles.length === 0) {
    console.warn('⚠️  Warning: dist/ directory is empty. Consider running "pnpm build" first.');
  }

  return distDir;
}

/**
 * Create ZIP archive from plugin files
 * @param {string} zipFilePath - Path for the output ZIP file
 * @param {string} distDir - Path to dist directory
 * @param {string} pluginJsonPath - Path to plugin.json
 * @param {string} pluginDir - Path to plugin root directory
 * @param {string} zipFileName - Name of the ZIP file for logging
 * @returns {Promise<void>}
 */
function createZipArchive(zipFilePath, distDir, pluginJsonPath, pluginDir, zipFileName) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    // Handle stream close event
    output.on('close', () => {
      const sizeBytes = archive.pointer();
      const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
      console.log('✅ Plugin packed successfully!');
      console.log(`📦 File: ${zipFileName}`);
      console.log(`📊 Size: ${sizeMB} MB`);
      resolve();
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error(`❌ Error: Failed to create ZIP archive - ${err.message}`);
      reject(err);
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add dist/ directory
    archive.directory(distDir, 'dist');

    // Add plugin.json
    archive.file(pluginJsonPath, { name: 'plugin.json' });

    // Add README.md if it exists
    const readmePath = path.join(pluginDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      archive.file(readmePath, { name: 'README.md' });
    }

    // Finalize the archive
    archive.finalize().catch((err) => {
      console.error(`❌ Error: Failed to finalize archive - ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Pack a plugin into a ZIP file
 * @param {string} pluginName - The name of the plugin directory
 * @throws {Error} If packing fails (exits with code 1)
 * @returns {Promise<void>}
 */
async function packPlugin(pluginName) {
  console.log(`🚀 Packing plugin: ${pluginName}`);

  // Resolve plugin directory
  const pluginDir = path.resolve(__dirname, '..', 'plugins', pluginName);

  // Validate plugin directory exists
  if (!fs.existsSync(pluginDir)) {
    console.error(`❌ Error: Plugin directory not found: ${pluginDir}`);
    process.exit(1);
  }

  // Load and validate plugin metadata
  const { pluginId, version, pluginJsonPath } = loadPluginMetadata(pluginDir);

  // Validate build output
  const distDir = validateBuildOutput(pluginDir);

  // Generate ZIP file path
  const zipFileName = `${pluginId}-${version}.zip`;
  const zipFilePath = path.join(pluginDir, zipFileName);

  // Warn if ZIP file already exists
  if (fs.existsSync(zipFilePath)) {
    console.warn(`⚠️  Overwriting existing ZIP file: ${zipFileName}`);
  }

  console.log(`📦 Creating ZIP file: ${zipFileName}`);

  // Create ZIP archive
  await createZipArchive(zipFilePath, distDir, pluginJsonPath, pluginDir, zipFileName);
}

// Parse command line arguments
const pluginArg = process.argv[2];

if (!pluginArg) {
  console.error('❌ Usage: node scripts/pack-plugin.js <plugin-name>');
  console.error('   Example: node scripts/pack-plugin.js uuid-generator');
  process.exit(1);
}

// Execute packing
packPlugin(pluginArg).catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`);
  process.exit(1);
});
