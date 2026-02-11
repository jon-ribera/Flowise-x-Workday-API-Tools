#!/usr/bin/env node
/**
 * 02-download-schemas.js
 *
 * Downloads OpenAPI schemas for all Production services listed in service-index.json.
 * Tries multiple URL patterns since the exact hosting pattern varies.
 *
 * Output: schemas/{serviceName}_{version}.json for each service
 *
 * Usage: node scripts/02-download-schemas.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { readServiceIndex, ensureDir, ROOT } = require('./utils');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const SCHEMAS_DIR = path.join(ROOT, 'schemas');
const DELAY_MS = parseInt(process.env.SCHEMA_DOWNLOAD_DELAY_MS || '1500', 10);

/**
 * Generate candidate URLs to try for a service's OpenAPI schema.
 */
function getCandidateUrls(name, version) {
  const base = 'https://community.workday.com/sites/default/files/file-hosting/restapi';
  const v = version.replace('v', '');

  return [
    `${base}/${name}/${version}/${name}.json`,
    `${base}/${name}/${version}/openapi.json`,
    `${base}/${name}/${version}/schema.json`,
    `${base}/${name}/${version}/swagger.json`,
    `${base}/${name}/${version}/${name}_${version}.json`,
    `${base}/${name}/v${v}/${name}.json`,
    `${base}/${name}/${version}/api.json`,
  ];
}

/**
 * Download a URL, following redirects.
 */
function downloadUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 30000 }, (res) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        resolve(downloadUrl(redirectUrl, maxRedirects - 1));
        return;
      }

      if (res.statusCode !== 200) {
        // Consume the response body to free resources
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Validate that content looks like an OpenAPI schema.
 */
function isValidSchema(content) {
  try {
    const json = JSON.parse(content);
    return !!(json.openapi || json.swagger || json.paths || json.info);
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Workday OpenAPI Schema Downloader ===');
  const services = readServiceIndex();
  ensureDir(SCHEMAS_DIR);

  let downloaded = 0;
  let failed = 0;
  const failedServices = [];

  for (let i = 0; i < services.length; i++) {
    const svc = services[i];
    const outFile = path.join(SCHEMAS_DIR, `${svc.name}_${svc.version}.json`);
    console.log(`\n[${i + 1}/${services.length}] ${svc.name} ${svc.version}`);

    // Skip if already downloaded
    if (fs.existsSync(outFile)) {
      const existing = fs.readFileSync(outFile, 'utf-8');
      if (isValidSchema(existing)) {
        console.log(`  Already downloaded (valid schema). Skipping.`);
        downloaded++;
        continue;
      }
    }

    // Try schemaUrl first if available
    const urls = [];
    if (svc.schemaUrl) {
      urls.push(svc.schemaUrl);
    }
    urls.push(...getCandidateUrls(svc.name, svc.version));

    let success = false;
    for (const url of urls) {
      try {
        console.log(`  Trying: ${url}`);
        const content = await downloadUrl(url);
        if (isValidSchema(content)) {
          // Pretty-print and save
          const formatted = JSON.stringify(JSON.parse(content), null, 2);
          fs.writeFileSync(outFile, formatted);
          console.log(`  SUCCESS: saved to ${path.basename(outFile)}`);
          // Update the service index with the working URL
          svc.schemaUrl = url;
          downloaded++;
          success = true;
          break;
        } else {
          console.log(`  Content is not a valid OpenAPI schema.`);
        }
      } catch (err) {
        console.log(`  Failed: ${err.message}`);
      }
    }

    if (!success) {
      console.log(`  FAILED: Could not download schema for ${svc.name} ${svc.version}`);
      failed++;
      failedServices.push(`${svc.name} ${svc.version}`);
    }

    // Throttle
    if (i < services.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Update service-index.json with discovered schemaUrls
  const indexPath = path.join(ROOT, 'service-index.json');
  fs.writeFileSync(indexPath, JSON.stringify(services, null, 2));

  console.log('\n=== Summary ===');
  console.log(`Downloaded: ${downloaded}/${services.length}`);
  console.log(`Failed: ${failed}/${services.length}`);
  if (failedServices.length > 0) {
    console.log(`Failed services: ${failedServices.join(', ')}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
