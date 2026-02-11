#!/usr/bin/env node
/**
 * 04-publish-tools.js
 *
 * Creates or updates Flowise custom tools from the generated tool files.
 * Idempotent: safe to re-run. Uses tool name for deduplication.
 *
 * Usage: node scripts/04-publish-tools.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { ROOT, ensureDir } = require('./utils');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const FLOWISE_API_URL = process.env.FLOWISE_API_URL || 'http://localhost:3000';
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || '';
const TOOLS_DIR = path.join(ROOT, 'tools');
const STATE_FILE = path.join(ROOT, 'publish-state.json');

// Color palette for tool cards
const COLORS = [
  'linear-gradient(rgb(66,165,245), rgb(38,166,154))',
  'linear-gradient(rgb(90,184,229), rgb(221,56,47))',
  'linear-gradient(rgb(156,39,176), rgb(233,30,99))',
  'linear-gradient(rgb(255,152,0), rgb(244,67,54))',
  'linear-gradient(rgb(76,175,80), rgb(139,195,74))',
  'linear-gradient(rgb(0,150,136), rgb(0,188,212))',
  'linear-gradient(rgb(63,81,181), rgb(100,181,246))',
  'linear-gradient(rgb(121,85,72), rgb(161,136,127))',
];

/**
 * Make an HTTP request to the Flowise API.
 */
function flowiseRequest(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, FLOWISE_API_URL);
    const client = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(FLOWISE_API_KEY ? { 'Authorization': `Bearer ${FLOWISE_API_KEY}` } : {}),
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Load checkpoint state.
 */
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return { published: {}, lastRun: null };
}

/**
 * Save checkpoint state.
 */
function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Delete old auto-generated tools that don't match new naming convention.
 * Preserves manually-created tools (get_workers, Retrieve_Requisitions, etc.).
 */
async function cleanupOldTools(existingTools, newToolNames) {
  const KEEP_TOOLS = new Set(['get_workers', 'Retrieve_Requisitions']);
  const toDelete = existingTools.filter(t => {
    if (KEEP_TOOLS.has(t.name)) return false;
    if (newToolNames.has(t.name)) return false; // will be updated, not deleted
    // Delete old auto-generated tools (4-segment pattern with hyphens)
    const parts = t.name.split('-');
    if (parts.length >= 4) return true;
    return false;
  });

  if (toDelete.length === 0) {
    console.log('No old tools to clean up.');
    return;
  }

  console.log(`\nCleaning up ${toDelete.length} old-pattern tools...`);
  let deleted = 0;
  let deleteFailed = 0;

  for (const tool of toDelete) {
    try {
      const res = await flowiseRequest('DELETE', `/api/v1/tools/${tool.id}`);
      if (res.status === 200 || res.status === 204) {
        deleted++;
      } else {
        console.log(`  Failed to delete ${tool.name}: HTTP ${res.status}`);
        deleteFailed++;
      }
    } catch (err) {
      console.log(`  Error deleting ${tool.name}: ${err.message}`);
      deleteFailed++;
    }
  }

  console.log(`Deleted: ${deleted}, Failed: ${deleteFailed}`);
}

async function main() {
  console.log('=== Flowise Tool Publisher ===');
  console.log(`Flowise API: ${FLOWISE_API_URL}`);

  // Load existing tools from Flowise for deduplication
  console.log('\nFetching existing tools from Flowise...');
  const existingRes = await flowiseRequest('GET', '/api/v1/tools');
  if (existingRes.status !== 200) {
    console.error(`Failed to list existing tools: HTTP ${existingRes.status}`);
    console.error(existingRes.data);
    process.exit(1);
  }

  const existingTools = existingRes.data;
  const existingByName = {};
  for (const tool of existingTools) {
    existingByName[tool.name] = tool;
  }
  console.log(`Found ${existingTools.length} existing tools in Flowise.`);

  // Collect all new tool names from manifests
  const newToolNamesSet = new Set();
  const serviceDirsPreScan = fs.readdirSync(TOOLS_DIR).filter(d => {
    const dirPath = path.join(TOOLS_DIR, d);
    return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'manifest.json'));
  });
  for (const serviceDir of serviceDirsPreScan) {
    const manifest = JSON.parse(fs.readFileSync(path.join(TOOLS_DIR, serviceDir, 'manifest.json'), 'utf-8'));
    manifest.forEach(e => newToolNamesSet.add(e.name));
  }

  // Cleanup old tools before publishing new ones
  await cleanupOldTools(existingTools, newToolNamesSet);

  // Re-fetch after cleanup
  const refreshRes = await flowiseRequest('GET', '/api/v1/tools');
  const refreshedTools = refreshRes.status === 200 ? refreshRes.data : [];
  const refreshedByName = {};
  for (const tool of refreshedTools) {
    refreshedByName[tool.name] = tool;
  }
  console.log(`\nAfter cleanup: ${refreshedTools.length} tools in Flowise.`);

  // Load checkpoint state
  const state = loadState();

  // Find all service manifests
  const serviceDirs = serviceDirsPreScan;

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let colorIndex = 0;

  for (const serviceDir of serviceDirs) {
    const manifestPath = path.join(TOOLS_DIR, serviceDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    console.log(`\n--- ${serviceDir} (${manifest.length} tools) ---`);

    for (const entry of manifest) {
      const toolFile = path.join(TOOLS_DIR, serviceDir, entry.file);
      if (!fs.existsSync(toolFile)) {
        console.log(`  SKIP: ${entry.name} — file not found`);
        skipped++;
        continue;
      }

      const funcSource = fs.readFileSync(toolFile, 'utf-8');
      const schemaStr = JSON.stringify(entry.schema);
      const color = COLORS[colorIndex % COLORS.length];
      colorIndex++;

      const existing = refreshedByName[entry.name];

      try {
        if (existing) {
          // Update existing tool
          const res = await flowiseRequest('PUT', `/api/v1/tools/${existing.id}`, {
            name: entry.name,
            description: entry.description,
            schema: schemaStr,
            func: funcSource,
            color: color,
          });

          if (res.status === 200) {
            console.log(`  UPDATED: ${entry.name}`);
            updated++;
            state.published[entry.name] = { id: existing.id, action: 'updated', timestamp: new Date().toISOString() };
          } else {
            console.log(`  FAILED to update ${entry.name}: HTTP ${res.status}`);
            failed++;
          }
        } else {
          // Create new tool
          const res = await flowiseRequest('POST', '/api/v1/tools', {
            name: entry.name,
            description: entry.description,
            schema: schemaStr,
            func: funcSource,
            color: color,
          });

          if (res.status === 200 || res.status === 201) {
            console.log(`  CREATED: ${entry.name}`);
            created++;
            const newId = res.data?.id || 'unknown';
            refreshedByName[entry.name] = res.data;
            state.published[entry.name] = { id: newId, action: 'created', timestamp: new Date().toISOString() };
          } else {
            console.log(`  FAILED to create ${entry.name}: HTTP ${res.status}`);
            failed++;
          }
        }
      } catch (err) {
        console.log(`  ERROR: ${entry.name} — ${err.message}`);
        failed++;
      }

      // Save state periodically
      saveState(state);
    }
  }

  saveState(state);

  console.log('\n=== Publish Summary ===');
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${created + updated + skipped + failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
