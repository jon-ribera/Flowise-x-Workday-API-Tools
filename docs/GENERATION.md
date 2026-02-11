# Generation Workflow

This document describes how the tool generation pipeline works and how to re-run it to pick up new Workday API versions or services.

## Pipeline Overview

```
┌─────────────────────┐    ┌────────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│ 01-index-services   │───▶│ 02-download-schemas│───▶│ 03-generate-tools    │───▶│ 04-publish-tools │
│                     │    │                    │    │                      │    │                  │
│ Builds service      │    │ Downloads OpenAPI  │    │ Parses schemas and   │    │ Creates/updates  │
│ index from Workday  │    │ JSON schemas from  │    │ generates Flowise    │    │ tools in Flowise │
│ REST directory SPA  │    │ Workday Community  │    │ custom tool JS files │    │ via API          │
└─────────────────────┘    └────────────────────┘    └──────────────────────┘    └──────────────────┘
        ▼                          ▼                          ▼                          ▼
  service-index.json         schemas/*.json           tools/{service}/*.js        Flowise instance
                                                      tools/{service}/manifest.json
```

## Step 1: Index Services (`01-index-services.js`)

**Input:** Workday REST Services Directory SPA
**Output:** `service-index.json`

This script discovers all Production Workday REST services and their OpenAPI schema URLs. It works by:

1. Fetching the Workday REST directory HTML page.
2. Downloading the SPA's JavaScript bundle.
3. Extracting the master service index filename (e.g., `services2026.06.json`) from the bundle.
4. Downloading and parsing the master index to build a list of Production services with their schema URLs.

The resulting `service-index.json` contains entries like:

```json
{
  "name": "absenceManagement",
  "displayName": "Absence Management",
  "version": "v4",
  "schemaUrl": "https://community.workday.com/.../absenceManagement_v4_20260207_oas2.json"
}
```

**When to re-run:** When Workday releases new API versions or adds new services (typically with major Workday releases).

## Step 2: Download Schemas (`02-download-schemas.js`)

**Input:** `service-index.json`
**Output:** `schemas/{serviceName}_{version}.json`

Downloads each OpenAPI schema file from the URLs in `service-index.json`. Includes a configurable delay between downloads (default 500ms) to avoid rate limiting.

Schemas are stored in both Swagger 2.0 and OpenAPI 3.x formats depending on what Workday provides. The generator handles both.

**When to re-run:** After re-indexing, or if schema files are missing/corrupted.

## Step 3: Generate Tools (`03-generate-tools.js`)

**Input:** `schemas/*.json`, `service-index.json`
**Output:** `tools/{serviceName}/{toolName}.js`, `tools/{serviceName}/manifest.json`

For each operation (HTTP method + path) in each schema, this script generates:

1. **A JavaScript file** — The Flowise custom tool function source code.
2. **A manifest entry** — Tool name, description, schema (input parameters), and metadata.

### Tool Function Pattern

Every generated tool follows the canonical pattern established by the `get_workers` reference tool:

```javascript
const https = require('https');

// Read Flowise global variables
const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

// Validate configuration
if (!hostname || !accessToken) {
    return "Error: Workday connection not configured...";
}

// Safely read input parameters
const id = typeof $id !== 'undefined' ? $id : null;

// Build API path
const basePath = '/ccx/api/{service}/{version}/super';
let apiPath = basePath + '/resource';
if (id) apiPath += '/' + encodeURIComponent(id);

// Build query string for optional parameters
const queryParts = [];
if (typeof $limit !== 'undefined' && $limit !== null) queryParts.push('limit=' + encodeURIComponent($limit));
const queryString = queryParts.length > 0 ? '?' + queryParts.join('&') : '';

// HTTP request options
const options = {
    hostname, path: apiPath + queryString, method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken }
};

// Workday-specific error map
const ERROR_MAP = { 400: '...', 401: '...', 403: '...', 404: '...', 500: '...', 503: '...' };

// Execute request
return new Promise((resolve) => {
    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
            } else {
                const hint = ERROR_MAP[res.statusCode] || 'HTTP ' + res.statusCode;
                let detail = '';
                try { detail = JSON.parse(body)?.error || body.substring(0, 300); } catch(e) { detail = body.substring(0, 300); }
                resolve('Workday API error ' + res.statusCode + ': ' + hint + '\nResponse: ' + detail);
            }
        });
    });
    req.on('error', (err) => {
        resolve('Request failed: ' + err.message + '. Verify the suv_name variable.');
    });
    // Write body for POST/PUT/PATCH
    if (requestBody) req.write(requestBody);
    req.end();
});
```

### Tool Naming Convention

```
{FunctionalArea}-{Resource}-{METHOD}-{OperationName}
```

- **FunctionalArea**: Derived from the service's `displayName`, PascalCased (e.g., `AbsenceManagement`, `Asor`)
- **Resource**: First non-parameter path segment, PascalCased (e.g., `Workers`, `AgentDefinition`)
- **METHOD**: HTTP method in uppercase (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- **OperationName**: The `operationId` from the OpenAPI spec, or derived from the path if absent

Duplicate names are disambiguated with `_1`, `_2` suffixes.

### Flowise Schema

Input parameters are extracted from the OpenAPI spec:
- **Path parameters** → Required string inputs (e.g., `$ID`, `$subresourceID`)
- **Query parameters** → Optional string inputs (e.g., `$limit`, `$offset`, `$search`)
- **Request body** → Optional string input `$requestBody` for POST/PUT/PATCH

### Template Engine

The core generation logic lives in `scripts/template.js`:
- `generateToolFunction()` — Builds the JS source code
- `generateToolSchema()` — Builds the Flowise input parameter schema

Shared utilities in `scripts/utils.js`:
- `generateToolName()` — Deterministic name generation
- `displayNameToArea()` — Display name to PascalCase conversion
- `extractResource()` — Path to resource name extraction
- `generateErrorMapSource()` — Workday error map generation

## Step 4: Publish Tools (`04-publish-tools.js`)

**Input:** `tools/{serviceName}/manifest.json`, `tools/{serviceName}/*.js`
**Output:** Tools created/updated in Flowise

This script:
1. Fetches all existing tools from Flowise.
2. Cleans up old-pattern tools (from previous generation runs with different naming).
3. For each tool in the manifests:
   - If the tool name already exists → **updates** it.
   - If the tool name is new → **creates** it.
4. Saves checkpoint state to `publish-state.json` for resumability.

The publisher is **idempotent** — safe to re-run at any time. It preserves manually-created tools (e.g., `get_workers`, `Retrieve_Requisitions`).

## Re-generation Workflow

To update tools when Workday releases new API versions:

```bash
# 1. Re-index to discover new services/versions
npm run index-services

# 2. Download updated schemas
npm run download-schemas

# 3. Regenerate all tools
npm run generate-tools

# 4. Publish to Flowise (creates new, updates existing, cleans old)
npm run publish-tools
```

Or run everything at once:

```bash
npm run pipeline
```

## File Structure

```
Flowise-x-Workday-API-Tools/
├── .env.template              # Environment variable template
├── .gitignore                 # Git ignore rules
├── .npmrc                     # npm registry config
├── package.json               # Dependencies and scripts
├── README.md                  # Project overview
├── service-index.json         # Discovered service catalog
├── docs/
│   ├── SETUP.md               # Setup and prerequisites
│   ├── TROUBLESHOOTING.md     # Common errors and fixes
│   └── GENERATION.md          # This file
├── schemas/                   # Downloaded OpenAPI schemas
│   ├── absenceManagement_v4.json
│   ├── staffing_v7.json
│   └── ...
├── scripts/                   # Pipeline scripts
│   ├── 01-index-services.js
│   ├── 02-download-schemas.js
│   ├── 03-generate-tools.js
│   ├── 04-publish-tools.js
│   ├── template.js            # Tool code/schema generation
│   └── utils.js               # Shared utilities
└── tools/                     # Generated tool files
    ├── generation-summary.json
    ├── absenceManagement/
    │   ├── manifest.json
    │   ├── AbsenceManagement-Workers-GET-getWorkers.js
    │   └── ...
    ├── staffing/
    │   ├── manifest.json
    │   ├── Staffing-Workers-GET-getWorkers.js
    │   └── ...
    └── ...
```
