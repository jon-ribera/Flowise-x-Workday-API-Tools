#!/usr/bin/env node
/**
 * 03-generate-tools.js
 *
 * Parses downloaded OpenAPI schemas and generates Flowise custom tool JS files
 * for every operation in every Production service.
 *
 * Output: tools/{serviceName}/{toolName}.js and tools/{serviceName}/manifest.json
 *
 * Usage: node scripts/03-generate-tools.js
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  ensureDir,
  generateToolName,
  sanitizeToolName,
  toFunctionalArea,
  displayNameToArea,
  readServiceIndex,
} = require('./utils');
const { generateToolFunction, generateToolSchema } = require('./template');

const SCHEMAS_DIR = path.join(ROOT, 'schemas');
const TOOLS_DIR = path.join(ROOT, 'tools');

/**
 * Parse OpenAPI 3.x or Swagger 2.0 schema and extract operations.
 */
function extractOperations(schema, serviceName, displayName) {
  const operations = [];
  const paths = schema.paths || {};

  // Determine base path for the API
  // OpenAPI 3.x: servers[0].url, Swagger 2.0: basePath
  let apiBasePath = '';
  if (schema.openapi && schema.servers && schema.servers[0]) {
    // OpenAPI 3.x - extract path portion from server URL
    try {
      const serverUrl = schema.servers[0].url;
      // Server URL might be relative or contain {tenant} variable
      if (serverUrl.startsWith('/')) {
        apiBasePath = serverUrl;
      } else if (serverUrl.startsWith('http')) {
        apiBasePath = new URL(serverUrl).pathname;
      } else {
        apiBasePath = serverUrl;
      }
    } catch {
      apiBasePath = '';
    }
  } else if (schema.swagger && schema.basePath) {
    apiBasePath = schema.basePath;
  }

  // Normalize: replace tenant placeholder, ensure no trailing slash
  apiBasePath = apiBasePath
    .replace(/\{[^}]*tenant[^}]*\}/gi, 'super')
    .replace(/\/$/, '');

  // If no base path detected, construct from serviceName and version
  if (!apiBasePath || apiBasePath === '/') {
    const version = (schema.info?.version || 'v1').replace(/^(\d)/, 'v$1');
    apiBasePath = `/ccx/api/${serviceName}/${version}/super`;
  }

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    // Common parameters at path level
    const pathLevelParams = pathItem.parameters || [];

    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationId = operation.operationId || null;
      const summary = operation.summary || '';
      const description = operation.description || summary;

      // Merge path-level and operation-level parameters
      const allParams = [...pathLevelParams, ...(operation.parameters || [])];

      // Separate path vs query params
      const pathParams = [];
      const queryParams = [];

      for (const param of allParams) {
        // Resolve $ref if present
        const resolved = param.$ref ? resolveRef(schema, param.$ref) : param;
        if (!resolved) continue;

        const paramObj = {
          name: resolved.name,
          type: mapSchemaType(resolved.schema || resolved),
          description: resolved.description || `${resolved.in} parameter: ${resolved.name}`,
          required: resolved.required || false,
        };

        if (resolved.in === 'path') {
          paramObj.required = true; // path params are always required
          pathParams.push(paramObj);
        } else if (resolved.in === 'query') {
          queryParams.push(paramObj);
        }
      }

      // Check for request body (OpenAPI 3.x)
      let hasRequestBody = false;
      let requestBodyDescription = '';
      if (operation.requestBody) {
        hasRequestBody = true;
        requestBodyDescription = operation.requestBody.description
          || 'JSON request body for this operation.';
      }
      // Swagger 2.0: body parameter
      const bodyParam = allParams.find(p => (p.in || p.$ref) === 'body' || p.in === 'body');
      if (bodyParam && !hasRequestBody) {
        hasRequestBody = true;
        requestBodyDescription = bodyParam.description || 'JSON request body.';
      }

      // Generate tool name
      const toolName = sanitizeToolName(generateToolName(serviceName, method, operationId, pathStr, displayName));

      operations.push({
        toolName,
        serviceName,
        displayName,
        method: method.toUpperCase(),
        path: pathStr,
        operationId,
        summary,
        description,
        pathParams,
        queryParams,
        hasRequestBody,
        requestBodyDescription,
        apiBasePath,
      });
    }
  }

  return operations;
}

/**
 * Resolve a $ref pointer in the schema.
 */
function resolveRef(schema, ref) {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.replace('#/', '').split('/');
  let current = schema;
  for (const part of parts) {
    current = current?.[part];
    if (!current) return null;
  }
  return current;
}

/**
 * Map OpenAPI schema type to a simple type string.
 */
function mapSchemaType(schemaObj) {
  if (!schemaObj) return 'string';
  const type = schemaObj.type;
  if (type === 'integer' || type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'string'; // Flowise schema uses string for complex types
  if (type === 'object') return 'string';
  return 'string';
}

/**
 * Generate tool description from operation metadata.
 */
function generateDescription(op) {
  const area = op.displayName || toFunctionalArea(op.serviceName);
  const parts = [`[${area}] ${op.method} ${op.path}`];
  if (op.summary) parts.push(op.summary);
  else if (op.description) parts.push(op.description.substring(0, 200));
  return parts.join(' — ');
}

async function main() {
  console.log('=== Workday Flowise Tool Generator ===');

  const services = readServiceIndex();
  ensureDir(TOOLS_DIR);

  let totalOps = 0;
  let totalTools = 0;
  const serviceStats = [];

  for (const svc of services) {
    const schemaFile = path.join(SCHEMAS_DIR, `${svc.name}_${svc.version}.json`);

    if (!fs.existsSync(schemaFile)) {
      console.log(`\nSkipping ${svc.name} ${svc.version} — no schema file found.`);
      continue;
    }

    console.log(`\n=== ${svc.name} ${svc.version} ===`);
    const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
    const operations = extractOperations(schema, svc.name, svc.displayName);

    if (operations.length === 0) {
      console.log(`  No operations found in schema.`);
      continue;
    }

    // Deduplicate tool names
    const names = operations.map(op => op.toolName);
    const counts = {};
    for (const op of operations) {
      if (counts[op.toolName] === undefined) {
        counts[op.toolName] = 0;
      } else {
        counts[op.toolName]++;
        op.toolName = `${op.toolName}_${counts[op.toolName]}`;
      }
    }

    // Create service tools directory
    const svcToolsDir = path.join(TOOLS_DIR, svc.name);
    ensureDir(svcToolsDir);

    const manifest = [];

    for (const op of operations) {
      // Generate the tool function source
      const funcSource = generateToolFunction({
        serviceName: op.serviceName,
        method: op.method,
        pathTemplate: op.path,
        apiBasePath: op.apiBasePath,
        pathParams: op.pathParams,
        queryParams: op.queryParams,
        hasRequestBody: op.hasRequestBody,
        requestBodyDescription: op.requestBodyDescription,
      });

      // Generate Flowise schema
      const toolSchema = generateToolSchema(
        op.pathParams,
        op.queryParams,
        op.hasRequestBody,
        op.requestBodyDescription
      );

      // Write tool JS file
      const toolFile = path.join(svcToolsDir, `${op.toolName}.js`);
      fs.writeFileSync(toolFile, funcSource);

      // Add to manifest
      manifest.push({
        name: op.toolName,
        description: generateDescription(op),
        schema: toolSchema,
        method: op.method,
        path: op.path,
        operationId: op.operationId,
        file: `${op.toolName}.js`,
      });

      totalTools++;
    }

    totalOps += operations.length;

    // Write manifest
    const manifestFile = path.join(svcToolsDir, 'manifest.json');
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log(`  Generated ${manifest.length} tools`);

    serviceStats.push({ name: svc.name, version: svc.version, tools: manifest.length });
  }

  // Write global summary
  const summaryFile = path.join(TOOLS_DIR, 'generation-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalServices: serviceStats.length,
    totalTools,
    services: serviceStats,
  }, null, 2));

  console.log('\n=== Generation Summary ===');
  console.log(`Services processed: ${serviceStats.length}`);
  console.log(`Total operations: ${totalOps}`);
  console.log(`Total tools generated: ${totalTools}`);
  console.log(`Output: ${TOOLS_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
