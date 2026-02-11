# Flowise x Workday API Tools

Auto-generated Flowise custom tools for **all Workday REST Production API services**, driven by OpenAPI schemas scraped from the [Workday REST Services Directory](https://community.workday.com/sites/default/files/file-hosting/restapi/index.html).

## Overview

This repository contains:

- **`schemas/`** — Downloaded OpenAPI JSON schemas (one per Workday REST service) for traceability and regeneration
- **`tools/`** — Generated Flowise custom tool JavaScript files, organized by functional area/service
- **`scripts/`** — Pipeline scripts to index services, download schemas, generate tools, and publish to Flowise
- **`docs/`** — Setup, troubleshooting, and generation workflow documentation

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/Flowise-x-Workday-API-Tools.git
cd Flowise-x-Workday-API-Tools

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.template .env
# Edit .env with your Flowise URL and API key

# 4. Run the full pipeline (index → download → generate → publish)
npm run pipeline
```

## Pipeline Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `01-index-services.js` | `npm run index-services` | Scrapes Workday REST SPA to enumerate Production services and schema URLs |
| `02-download-schemas.js` | `npm run download-schemas` | Downloads OpenAPI schemas to `schemas/` |
| `03-generate-tools.js` | `npm run generate-tools` | Parses schemas and generates Flowise tool JS files in `tools/` |
| `04-publish-tools.js` | `npm run publish-tools` | Creates/updates tools in Flowise via API (idempotent) |

## Flowise Variables Required

The generated tools expect these Flowise global variables to be configured:

| Variable | Description |
|----------|-------------|
| `suv_name` | Workday tenant hostname (e.g., `wd5-impl-services1.workday.com`) |
| `beartoken` | Valid OAuth 2.0 Bearer access token |

## Tool Naming Convention

```
{FunctionalArea}-{Resource}-{METHOD}-{OperationName}
```

- **FunctionalArea** — Service display name in PascalCase (e.g., `AbsenceManagement`, `Asor`, `WQL`)
- **Resource** — Primary resource from the API path, PascalCased first segment (e.g., `Workers`, `AgentDefinition`, `Data`)
- **METHOD** — HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- **OperationName** — `operationId` from the OpenAPI spec, or derived from the path

Examples:
- `AbsenceManagement-Workers-GET-getLeavesOfAbsence`
- `Asor-AgentDefinition-GET-getAgentDefinition`
- `Procurement-Requisitions-GET-getRequisitions`
- `Staffing-Workers-GET-getWorkers`
- `Wql-Data-GET-getData`

## Statistics

- **49** Workday Production REST services covered
- **884** Flowise custom tools generated
- **0** Archived services included

## Documentation

- [Setup Guide](docs/SETUP.md) — Prerequisites and Flowise variable configuration
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Common errors (401/403, hostname, maintenance)
- [Generation Workflow](docs/GENERATION.md) — How to re-index, regenerate, and republish

## License

MIT
