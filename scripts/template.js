/**
 * Tool function template derived from the canonical get_workers Flowise tool.
 *
 * This module exports a function that generates the JS source code for a
 * Flowise custom tool, following get_workers conventions:
 *   - CommonJS (const https = require('https'))
 *   - $vars?.suv_name for hostname, $vars?.beartoken?.trim() for token
 *   - typeof $param !== 'undefined' for optional inputs
 *   - https.request with hostname/path/method/headers
 *   - ERROR_MAP with Workday-specific messages
 *   - resolve raw body on 2xx, formatted error on non-2xx
 */

const { generateErrorMapSource, toFunctionalArea } = require('./utils');

/**
 * Generate a Flowise custom tool function body.
 *
 * @param {object} opts
 * @param {string} opts.serviceName - e.g. "procurement"
 * @param {string} opts.method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} opts.pathTemplate - e.g. "/requisitions/{id}"
 * @param {string} opts.apiBasePath - e.g. "/ccx/api/procurement/v5/super"
 * @param {Array}  opts.pathParams - [{name, required, description}]
 * @param {Array}  opts.queryParams - [{name, required, description, type}]
 * @param {boolean} opts.hasRequestBody - whether the operation accepts a body
 * @param {string} opts.requestBodyDescription - description for the body param
 * @returns {string} The JS function source code
 */
function generateToolFunction(opts) {
  const {
    serviceName,
    method,
    pathTemplate,
    apiBasePath,
    pathParams = [],
    queryParams = [],
    hasRequestBody = false,
    requestBodyDescription = '',
  } = opts;

  const functionalArea = toFunctionalArea(serviceName);
  const httpMethod = method.toUpperCase();
  const allParams = [...pathParams, ...queryParams];
  if (hasRequestBody) {
    allParams.push({ name: 'requestBody', required: false });
  }

  // Build variable declarations for each input parameter
  const paramDeclarations = allParams.map(p => {
    const varName = p.name;
    return `const ${varName} = typeof $${varName} !== 'undefined' ? $${varName} : null;`;
  }).join('\n');

  // Build path with interpolation
  let pathConstruction;
  if (pathParams.length > 0) {
    // Replace {param} with ${param} for template literal
    const templatePath = pathTemplate.replace(/\{(\w+)\}/g, (_, name) => `\${${name}}`);
    pathConstruction = `const apiPath = \`${apiBasePath}${templatePath}\`;`;
  } else {
    pathConstruction = `const apiPath = '${apiBasePath}${pathTemplate}';`;
  }

  // Build query string assembly
  let queryAssembly = '';
  if (queryParams.length > 0) {
    const qLines = queryParams.map(q => {
      return `    if (${q.name} !== null && ${q.name} !== undefined) params.push(\`${q.name}=\${encodeURIComponent(${q.name})}\`);`;
    }).join('\n');
    queryAssembly = `
const qParts = [];
(function buildQuery(params) {
${qLines}
})(qParts);
const queryString = qParts.length > 0 ? '?' + qParts.join('&') : '';`;
  }

  const fullPath = queryParams.length > 0 ? 'apiPath + queryString' : 'apiPath';

  // Build request body handling
  let bodySetup = '';
  let writeBody = '';
  if (hasRequestBody && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
    bodySetup = `
let bodyData = null;
if (requestBody !== null) {
    bodyData = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
}`;
    writeBody = `
    if (bodyData) {
        req.write(bodyData);
    }`;
  }

  // Content-Length header for body requests
  const extraHeaders = (hasRequestBody && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH'))
    ? `\n        ...(bodyData ? { "Content-Length": Buffer.byteLength(bodyData) } : {}),`
    : '';

  const errorMapSource = generateErrorMapSource(functionalArea);

  return `const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

${paramDeclarations}

${pathConstruction}${queryAssembly}${bodySetup}

const options = {
    hostname: hostname,
    path: ${fullPath},
    method: "${httpMethod}",
    headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${accessToken}\`${extraHeaders}
    }
};

${errorMapSource}

return new Promise((resolve) => {
    const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
            } else {
                const hint = ERROR_MAP[res.statusCode] || \`HTTP \${res.statusCode} error.\`;
                let detail = "";
                try { detail = JSON.parse(body)?.error || body.substring(0, 300); } catch(e) { detail = body.substring(0, 300); }
                resolve(\`Workday API error \${res.statusCode}: \${hint}\\nResponse: \${detail}\`);
            }
        });
    });
    req.on("error", (err) => {
        resolve(\`Request failed: \${err.message}. Verify the 'suv_name' variable contains a valid Workday hostname.\`);
    });${writeBody}
    req.end();
});`;
}

/**
 * Generate the Flowise schema array for a tool's input parameters.
 *
 * @param {Array} pathParams - [{name, required, description, type}]
 * @param {Array} queryParams - [{name, required, description, type}]
 * @param {boolean} hasRequestBody
 * @param {string} requestBodyDescription
 * @returns {Array} Flowise schema array
 */
function generateToolSchema(pathParams, queryParams, hasRequestBody, requestBodyDescription) {
  const schema = [];

  for (const p of pathParams) {
    schema.push({
      name: p.name,
      type: p.type || 'string',
      description: p.description || `Path parameter: ${p.name}`,
      required: p.required !== false,
    });
  }

  for (const q of queryParams) {
    schema.push({
      name: q.name,
      type: q.type || 'string',
      description: q.description || `Query parameter: ${q.name}`,
      required: q.required === true,
    });
  }

  if (hasRequestBody) {
    schema.push({
      name: 'requestBody',
      type: 'string',
      description: requestBodyDescription || 'JSON request body.',
      required: false,
    });
  }

  return schema;
}

module.exports = { generateToolFunction, generateToolSchema };
