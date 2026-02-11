/**
 * Shared utilities for the Workday REST API tool generation pipeline.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Convert a service name to PascalCase functional area.
 * e.g. "absenceManagement" -> "AbsenceManagement"
 */
function toFunctionalArea(serviceName) {
  return serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
}

/**
 * Convert a displayName to a compact PascalCase area name (no spaces).
 * e.g. "Absence Management" -> "AbsenceManagement"
 *       "ASOR" -> "ASOR"
 *       "Custom Object Data (multi-instance)" -> "CustomObjectDataMultiInstance"
 */
function displayNameToArea(displayName) {
  if (!displayName) return '';
  return displayName
    .replace(/[()]/g, '')          // remove parens
    .replace(/-/g, ' ')            // hyphens to spaces
    .split(/\s+/)
    .filter(Boolean)
    .map(w => {
      // Preserve all-caps words like "ASOR", "WQL"
      if (w === w.toUpperCase() && w.length > 1) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join('');
}

/**
 * Extract the primary resource name from an API path.
 * Takes the first non-parameter segment and PascalCases it.
 * e.g. "/workers/{ID}/leavesOfAbsence" -> "Workers"
 *      "/agentDefinition" -> "AgentDefinition"
 *      "/balances/{ID}" -> "Balances"
 *      "/values/timeOff/status/" -> "Values"
 */
function extractResource(pathStr) {
  const segments = pathStr
    .split('/')
    .filter(s => s && !s.startsWith('{'));

  if (segments.length === 0) return 'Root';

  const first = segments[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Generate a deterministic tool name from operation metadata.
 * Format: {FunctionalArea}-{Resource}-{METHOD}-{OperationName}
 *
 * FunctionalArea: from displayName (e.g. "AbsenceManagement", "ASOR")
 * Resource: first path segment PascalCased (e.g. "Workers", "AgentDefinition")
 * METHOD: HTTP method uppercase
 * OperationName: operationId or derived from path
 */
function generateToolName(serviceName, method, operationId, pathStr, displayName) {
  const area = displayName ? displayNameToArea(displayName) : toFunctionalArea(serviceName);
  const resource = extractResource(pathStr);
  const httpMethod = method.toUpperCase();
  let opName;

  if (operationId) {
    // Clean operationId: remove any non-alphanumeric characters except underscores
    opName = operationId.replace(/[^a-zA-Z0-9_]/g, '');
  } else {
    // Derive from path: take last meaningful segments
    const segments = pathStr
      .replace(/\{[^}]+\}/g, '') // remove path params
      .split('/')
      .filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'root';
    opName = method.toLowerCase() + lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
  }

  return `${area}-${resource}-${httpMethod}-${opName}`;
}

/**
 * Sanitize a tool name for OpenAI function calling compatibility.
 * Must match: ^[a-zA-Z0-9_-]+$
 */
function sanitizeToolName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Map of Workday-specific HTTP error messages.
 * Used as a constant in every generated tool.
 */
const WORKDAY_ERROR_MAP = {
  400: 'Bad Request — The request is malformed or contains invalid parameters.',
  401: 'Unauthorized — The OAuth 2.0 access token is expired or invalid. Refresh the token and update the beartoken Flowise variable.',
  403: 'Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group permissions.',
  404: 'Not Found — The requested resource or endpoint does not exist. Verify the ID and API path.',
  409: 'Conflict — The request conflicts with a Workday business rule or constraint.',
  500: 'Internal Server Error — A server-side error occurred in Workday. Retry or check service status.',
  503: 'Service Unavailable — The Workday tenant is temporarily unavailable or under maintenance. Retry later.',
};

/**
 * Generate the ERROR_MAP JS source string for embedding in tool functions.
 */
function generateErrorMapSource(functionalArea) {
  const lines = Object.entries(WORKDAY_ERROR_MAP).map(([code, msg]) => {
    // Customize 403 message with the functional area
    const customMsg = code === '403'
      ? msg.replace('Verify the Security Group permissions.', `Verify the Security Group has permissions on the ${functionalArea} domain.`)
      : msg;
    return `    ${code}: "${customMsg}"`;
  });
  return `const ERROR_MAP = {\n${lines.join(',\n')}\n};`;
}

/**
 * Deduplicate tool names by appending _N suffix.
 */
function deduplicateNames(names) {
  const counts = {};
  return names.map(name => {
    if (counts[name] === undefined) {
      counts[name] = 0;
      return name;
    }
    counts[name]++;
    return `${name}_${counts[name]}`;
  });
}

/**
 * Read service-index.json.
 */
function readServiceIndex() {
  const indexPath = path.join(ROOT, 'service-index.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error('service-index.json not found. Run 01-index-services.js first.');
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

/**
 * Ensure a directory exists.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  ROOT,
  toFunctionalArea,
  displayNameToArea,
  extractResource,
  generateToolName,
  sanitizeToolName,
  WORKDAY_ERROR_MAP,
  generateErrorMapSource,
  deduplicateNames,
  readServiceIndex,
  ensureDir,
};
