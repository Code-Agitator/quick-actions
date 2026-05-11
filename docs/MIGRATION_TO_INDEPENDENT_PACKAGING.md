# Migration to Independent Plugin Packaging

## Background

Quick Actions has migrated from centralized plugin packaging to independent plugin packaging. Each plugin now has its own packaging capability and no longer depends on the root directory scripts.

## What Changed

### Before (Centralized)
```
plugins/uuid-generator/
├── package.json  ← "pack": "node ../../scripts/pack-plugin.js"
└── ...

scripts/
└── pack-plugin.js  ← All plugins depend on this
```

### After (Independent)
```
plugins/uuid-generator/
├── scripts/
│   └── pack-plugin.js  ← Independent packaging script
├── package.json  ← "pack": "node ./scripts/pack-plugin.js"
└── ...
```

## Migration Steps

### For Existing Plugins

If you're updating an existing Quick Actions project:

1. **Update to latest code**
   ```bash
   git pull
   ```

2. **Install new dependencies**
   ```bash
   pnpm install
   ```
   This will automatically install `archiver` for all plugins.

3. **Use new pack command**
   ```bash
   cd plugins/your-plugin
   pnpm pack
   ```

### For New Plugins

New plugins created with `node scripts/create-plugin.js` automatically include:
- ✅ Independent pack script in `scripts/pack-plugin.js`
- ✅ Updated `package.json` with correct pack command
- ✅ `archiver` dependency in devDependencies

## Usage

### Packing a Plugin

```bash
cd plugins/my-plugin
pnpm build    # Build first
pnpm pack     # Create ZIP file
```

This creates `{plugin-id}-{version}.zip` in the plugin root directory.

### What's Included in ZIP

- `dist/` - Built plugin files
- `plugin.json` - Plugin metadata
- `README.md` - Documentation (if exists)

## Benefits

✅ **Complete Independence**: Plugins can be packaged anywhere, even outside the monorepo  
✅ **Easy Distribution**: Share plugins without requiring the full project  
✅ **Simplified Workflow**: No need to reference root directory scripts  
✅ **Better Maintenance**: Each plugin manages its own packaging  

## FAQ

### Q: Can I still use the old script?

A: Yes, but it will show a deprecation warning. The old script at `scripts/pack-plugin.js` is kept for backward compatibility but will be removed in a future version.

### Q: Do I need to do anything manually?

A: No, running `pnpm install` at the root will automatically install `archiver` for all plugins.

### Q: What if I want to move a plugin to another location?

A: You can now copy the entire plugin directory to any location and run:
```bash
cd /path/to/copied/plugin
pnpm install
pnpm build
pnpm pack
```
It will work independently!

### Q: How do I update the pack script for all plugins?

A: If we update the template in `scripts/templates/pack-plugin-standalone.js`, you can re-copy it to all plugins:
```bash
# PowerShell
$plugins = @("uuid-generator", "everything-search", "js-console", "json-explorer", "process-manager", "qa-test-plugin")
foreach ($plugin in $plugins) {
    Copy-Item "scripts\templates\pack-plugin-standalone.js" "plugins\$plugin\scripts\pack-plugin.js" -Force
}
```

## Rollback Plan

If you encounter issues, you can temporarily use the old script:

```bash
cd plugins/your-plugin
node ../../scripts/pack-plugin.js your-plugin
```

## Troubleshooting

### Error: "archiver module not found"

**Solution**: Run `pnpm install` at the project root.

### Error: "dist/ directory not found"

**Solution**: Run `pnpm build` before packing.

### Error: "plugin.json not found"

**Solution**: Make sure you're in the correct plugin directory and `plugin.json` exists.

---

**Migration Date**: 2026-05-09  
**Version**: v1.0
