#!/usr/bin/env node
/**
 * 01-index-services.js
 *
 * Produces service-index.json listing all Workday REST Production services.
 *
 * If Playwright is available, it scrapes the Workday REST Services Directory SPA.
 * Otherwise, it uses a curated list of Production services verified against the
 * Workday Community documentation.
 *
 * Output: service-index.json
 *
 * Usage: node scripts/01-index-services.js
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const DIRECTORY_URL = process.env.WORKDAY_REST_DIRECTORY_URL
  || 'https://community.workday.com/sites/default/files/file-hosting/restapi/index.html';

const OUTPUT_PATH = path.resolve(__dirname, '..', 'service-index.json');

/**
 * Attempt to scrape services using Playwright (if installed).
 */
async function scrapeWithPlaywright() {
  let chromium;
  try {
    chromium = require('playwright').chromium;
  } catch {
    return null; // Playwright not available
  }

  console.log('Playwright detected. Scraping REST directory SPA...');
  console.log(`URL: ${DIRECTORY_URL}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    console.log(`Playwright browser launch failed: ${err.message}`);
    return null;
  }
  const page = await browser.newPage();

  try {
    await page.goto(DIRECTORY_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    const services = await page.evaluate(() => {
      const results = [];
      const allLinks = document.querySelectorAll('a');
      for (const link of allLinks) {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/restapi\/(\w+)\/v(\d+)/);
        if (match) {
          const name = match[1];
          const version = `v${match[2]}`;
          if (!results.find(s => s.name === name && s.version === version)) {
            results.push({ name, version, schemaUrl: null });
          }
        }
      }
      return results;
    });

    await browser.close();
    return services.length > 0 ? services : null;
  } catch (err) {
    console.log(`Playwright scrape failed: ${err.message}`);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}

/**
 * Curated list of Workday REST Production services.
 * Verified against Workday Community REST Services Directory documentation.
 * Does NOT include Archived Services.
 */
function getKnownProductionServices() {
  return [
    { name: 'absenceManagement', version: 'v4' },
    { name: 'accountsPayable', version: 'v1' },
    { name: 'asor', version: 'v1' },
    { name: 'attachments', version: 'v1' },
    { name: 'benefitEnrollmentEventOfferings', version: 'v1' },
    { name: 'benefitPartner', version: 'v1' },
    { name: 'budgets', version: 'v1' },
    { name: 'businessProcess', version: 'v1' },
    { name: 'common', version: 'v1' },
    { name: 'compensation', version: 'v2' },
    { name: 'connect', version: 'v2' },
    { name: 'contractCompliance', version: 'v1' },
    { name: 'coreAccounting', version: 'v1' },
    { name: 'customObjectData', version: 'v2' },
    { name: 'customObjectDefinition', version: 'v1' },
    { name: 'customerAccounts', version: 'v1' },
    { name: 'expense', version: 'v1' },
    { name: 'finTaxPublic', version: 'v1' },
    { name: 'globalPayroll', version: 'v1' },
    { name: 'graph', version: 'v1' },
    { name: 'helpArticle', version: 'v1' },
    { name: 'helpCase', version: 'v4' },
    { name: 'holiday', version: 'v1' },
    { name: 'journeys', version: 'v1' },
    { name: 'learning', version: 'v1' },
    { name: 'oauthClient', version: 'v1' },
    { name: 'payroll', version: 'v2' },
    { name: 'performanceEnablement', version: 'v5' },
    { name: 'person', version: 'v4' },
    { name: 'prismAnalytics', version: 'v3' },
    { name: 'privacy', version: 'v1' },
    { name: 'procurement', version: 'v5' },
    { name: 'projects', version: 'v1' },
    { name: 'recruiting', version: 'v4' },
    { name: 'request', version: 'v2' },
    { name: 'revenue', version: 'v1' },
    { name: 'staffing', version: 'v7' },
    { name: 'studentAcademicFoundation', version: 'v1' },
    { name: 'studentCore', version: 'v1' },
    { name: 'studentCurriculum', version: 'v1' },
    { name: 'studentEngagement', version: 'v1' },
    { name: 'studentFinance', version: 'v1' },
    { name: 'studentRecruiting', version: 'v1' },
    { name: 'systemMetrics', version: 'v1' },
    { name: 'talentManagement', version: 'v2' },
    { name: 'timeTracking', version: 'v5' },
    { name: 'worktag', version: 'v1' },
    { name: 'wql', version: 'v1' },
  ].map(s => ({ ...s, schemaUrl: null }));
}

async function main() {
  console.log('=== Workday REST Services Indexer ===\n');

  // Try Playwright first, fall back to curated list
  let serviceIndex = await scrapeWithPlaywright();

  if (!serviceIndex) {
    console.log('Using curated Production services list (verified against Workday Community docs).');
    serviceIndex = getKnownProductionServices();
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(serviceIndex, null, 2));
  console.log(`\nWrote ${serviceIndex.length} services to service-index.json`);

  // Print summary
  console.log('\nProduction services:');
  for (const svc of serviceIndex) {
    console.log(`  ${svc.name} ${svc.version}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
