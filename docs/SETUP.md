# Setup Guide

## Prerequisites

- **Node.js** 18+ (tested with v20)
- **Flowise** instance running and accessible (default: `http://localhost:3000`)
- **Workday tenant** with REST API access and an Integration System User (ISU)

## 1. Clone and Install

```bash
git clone https://github.com/<your-org>/Flowise-x-Workday-API-Tools.git
cd Flowise-x-Workday-API-Tools
npm install
```

## 2. Configure Environment

```bash
cp .env.template .env
```

Edit `.env` with your values:

| Variable | Description | Example |
|----------|-------------|---------|
| `FLOWISE_API_URL` | URL of your Flowise instance | `http://localhost:3000` |
| `FLOWISE_API_KEY` | Flowise API key (from Settings → API Keys) | `abc123...` |

## 3. Configure Flowise Variables

The generated tools reference two Flowise global variables at runtime. Set these in **Flowise → Settings → Variables**:

| Variable | Type | Description |
|----------|------|-------------|
| `suv_name` | `string` | Workday tenant hostname only — no protocol, no path. Example: `wd5-impl-services1.workday.com` |
| `beartoken` | `string` | Valid OAuth 2.0 Bearer access token for the Workday ISU |

### Getting a Bearer Token

1. Register an API Client in Workday (Integrations → API Client Registration).
2. Grant the ISU appropriate domain security policies for the services you need.
3. Use the OAuth 2.0 token endpoint to obtain a Bearer token:
   ```
   POST https://<tenant-hostname>/ccx/oauth2/<tenant>/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=client_credentials&client_id=<id>&client_secret=<secret>
   ```
4. Copy the `access_token` value and set it as the `beartoken` Flowise variable.

### Important Notes on `suv_name`

- Use **only the hostname**, not a full URL.
- Correct: `wd5-impl-services1.workday.com`
- Wrong: `https://wd5-impl-services1.workday.com/super/d/home.htmld`

## 4. Run the Pipeline

```bash
# Full pipeline (index → download → generate → publish)
npm run pipeline

# Or run individual steps:
npm run index-services      # Step 1: Build service-index.json
npm run download-schemas    # Step 2: Download OpenAPI schemas
npm run generate-tools      # Step 3: Generate tool JS files
npm run publish-tools       # Step 4: Publish to Flowise
```

## 5. Verify

After publishing, open Flowise and navigate to **Tools**. You should see 884 custom tools organized by Workday service area. Each tool name follows the pattern:

```
{FunctionalArea}-{Resource}-{METHOD}-{OperationName}
```

You can test any tool by adding it to a chatflow and sending a relevant query.
