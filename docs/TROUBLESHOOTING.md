# Troubleshooting

## Common Runtime Errors

### `401 Unauthorized`

**Cause:** The OAuth 2.0 Bearer token has expired or is invalid.

**Fix:**
1. Refresh the token using your OAuth client credentials.
2. Update the `beartoken` Flowise variable with the new token.
3. Bearer tokens typically expire after 1 hour — consider automating token refresh.

### `403 Forbidden`

**Cause:** The Integration System User (ISU) lacks the required domain security policies.

**Fix:**
1. In Workday, navigate to the Security Group associated with your ISU.
2. Add the necessary domain security policy permissions (GET/POST/PUT/DELETE) for the relevant functional area.
3. Activate the pending security policy changes.
4. Common domains: `Staffing - Workers`, `Procurement - Requisitions`, `Absence Management`, etc.

### `404 Not Found`

**Cause:** The resource ID or API path is incorrect.

**Fix:**
- Verify the ID parameter is a valid Workday instance ID (WID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
- Check the API base path matches your tenant configuration.
- Confirm the API version in the tool matches what your tenant supports.

### `503 Service Unavailable`

**Cause:** The Workday tenant is temporarily unavailable, under maintenance, or experiencing high load.

**Fix:**
- Wait and retry after a few minutes.
- Check the [Workday Status Page](https://status.workday.com/) for known outages.
- If persistent, contact your Workday administrator.

### `Request failed: getaddrinfo ENOTFOUND`

**Cause:** The `suv_name` Flowise variable contains an invalid hostname.

**Fix:**
- Set `suv_name` to the hostname only — no `https://` prefix, no path suffix.
- Correct: `wd5-impl-services1.workday.com`
- Wrong: `https://wd5-impl-services1.workday.com/super/d/home.htmld`

### `NodeVM Execution Error: ReferenceError: $id is not defined`

**Cause:** A tool input variable was referenced but not provided.

**Fix:**
- All generated tools use safe `typeof` checks for optional parameters. If you see this error on a custom tool, wrap the variable access:
  ```javascript
  const id = typeof $id !== 'undefined' ? $id : null;
  ```

### `NodeVM Execution Error: ReferenceError: fetch is not defined`

**Cause:** The `fetch` API is not available in Flowise's NodeVM sandbox.

**Fix:**
- All generated tools use Node.js `https` module instead of `fetch`. If you wrote a custom tool, replace `fetch()` with `https.request()`.

## Pipeline / Publishing Errors

### `HTTP 401` when running `04-publish-tools.js`

**Cause:** The `FLOWISE_API_KEY` in `.env` is missing or incorrect.

**Fix:**
1. Open Flowise → Settings → API Keys.
2. Copy or create an API key.
3. Set it in `.env`:
   ```
   FLOWISE_API_KEY=your-key-here
   ```

### `Invalid 'tools[0].function.name'` error in chatflow

**Cause:** A tool name contains spaces or special characters not matching `^[a-zA-Z0-9_-]+$`.

**Fix:**
- All auto-generated tool names are sanitized. If you manually created a tool, ensure its name uses only letters, numbers, hyphens, and underscores.

### Schema download 404 errors

**Cause:** Workday may have updated schema filenames or the REST directory structure.

**Fix:**
1. Re-run the indexer to discover current schema URLs:
   ```bash
   npm run index-services
   ```
2. Then re-download:
   ```bash
   npm run download-schemas
   ```

## Corporate Proxy Issues

If running behind a corporate proxy:

- **npm installs fail:** Create a local `.npmrc` pointing to the public registry:
  ```
  registry=https://registry.npmjs.org/
  ```
- **Schema downloads fail:** The download script uses Node.js `https` module which respects `HTTPS_PROXY` environment variables. Set or unset as needed.

## Getting Help

1. Check the [Workday REST API documentation](https://community.workday.com/sites/default/files/file-hosting/restapi/index.html).
2. Review the tool's generated JavaScript source in `tools/{serviceName}/{toolName}.js`.
3. Test API endpoints directly using `curl` to isolate whether the issue is in Workday or in the tool code.
