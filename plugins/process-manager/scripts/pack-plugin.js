#!/usr/bin/env node

/**
 * Standalone Plugin Packager
 * 
 * This script packs a plugin into a ZIP file for distribution.
 * It is designed to be self-contained within each plugin project.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin root directory (parent of scripts/)
const pluginDir = path.resolve(__dirname, '..');

/**
 * Load plugin metadata from plugin.json
 * @param {string} pluginDir - Absolute path to plugin directory
 * @returns {Object} Plugin metadata with id and version
 * @throws {Error} If plugin.json is missing or invalid (exits with code 1)
 */
function loadPluginMetadata(pluginDir) {
  const pluginJsonPath = path.join(pluginDir, 'plugin.json');
  
  if (!fs.existsSync(pluginJsonPath)) {
    console.error('❌ Error: plugin.json not found in', pluginDir);
    console.error('💡 Make sure you are running this script from the plugin root directory.');
    process.exit(1);
  }
  
  try {
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
    
    if (!pluginJson.id || !pluginJson.version) {
      console.error('❌ Error: plugin.json must contain "id" and "version" fields');
      process.exit(1);
    }
    
    return {
      id: pluginJson.id,
      version: pluginJson.version
    };
  } catch (error) {
    console.error('❌ Error: Failed to parse plugin.json:', error.message);
    process.exit(1);
  }
}

/**
 * Validate build output directory exists
 * @param {string} pluginDir - Absolute path to plugin directory
 * @throws {Error} If dist/ directory does not exist (exits with code 1)
 */
function validateBuildOutput(pluginDir) {
  const distDir = path.join(pluginDir, 'dist');
  
  if (!fs.existsSync(distDir)) {
    console.error('❌ Error: dist/ directory not found');
    console.error('💡 Please run "pnpm build" before packing.');
    process.exit(1);
  }
}

/**
 * Create ZIP archive of the plugin
 * @param {string} pluginDir - Absolute path to plugin directory
 * @param {string} zipFilePath - Absolute path to output ZIP file
 * @param {Object} metadata - Plugin metadata (id, version)
 * @returns {Promise<void>}
 */
async function createZipArchive(pluginDir, zipFilePath, metadata) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`✅ Plugin packed successfully!`);
      console.log(`📦 File: ${path.basename(zipFilePath)}`);
      console.log(`📊 Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add dist/ directory
    archive.directory(path.join(pluginDir, 'dist'), 'dist');
    
    // Add plugin.json
    archive.file(path.join(pluginDir, 'plugin.json'), { name: 'plugin.json' });
    
    // Add README.md if exists
    const readmePath = path.join(pluginDir, 'README.md');
    if (fs.existsSync(readmePath)) {
      archive.file(readmePath, { name: 'README.md' });
    }
    
    archive.finalize();
  });
}

/**
 * Main function to pack a plugin
 * @returns {Promise<void>}
 */
async function packPlugin() {
  console.log('🚀 Packing plugin...');
  
  // Load metadata
  console.log('📂 Reading plugin metadata...');
  const metadata = loadPluginMetadata(pluginDir);
  console.log(`✅ Plugin ID: ${metadata.id}`);
  console.log(`✅ Version: ${metadata.version}`);
  
  // Validate build output
  console.log('✅ Validating build output...');
  validateBuildOutput(pluginDir);
  
  // Generate ZIP file path
  const zipFileName = `${metadata.id}-${metadata.version}.zip`;
  const zipFilePath = path.join(pluginDir, zipFileName);
  
  // Check if ZIP file already exists
  if (fs.existsSync(zipFilePath)) {
    console.warn(`⚠️  Overwriting existing ZIP file: ${zipFileName}`);
  }
  
  // Create ZIP archive
  console.log(`📦 Creating ZIP file: ${zipFileName}`);
  try {
    await createZipArchive(pluginDir, zipFilePath, metadata);
  } catch (error) {
    console.error('❌ Error: Failed to create ZIP file:', error.message);
    process.exit(1);
  }
}

// Execute
packPlugin().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
