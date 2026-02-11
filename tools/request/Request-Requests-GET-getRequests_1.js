const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const completedOnOrAfter = typeof $completedOnOrAfter !== 'undefined' ? $completedOnOrAfter : null;
const completedOnOrBefore = typeof $completedOnOrBefore !== 'undefined' ? $completedOnOrBefore : null;
const initiatedOnOrAfter = typeof $initiatedOnOrAfter !== 'undefined' ? $initiatedOnOrAfter : null;
const initiatedOnOrBefore = typeof $initiatedOnOrBefore !== 'undefined' ? $initiatedOnOrBefore : null;
const initiator = typeof $initiator !== 'undefined' ? $initiator : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;
const onBehalfOf = typeof $onBehalfOf !== 'undefined' ? $onBehalfOf : null;
const requestId = typeof $requestId !== 'undefined' ? $requestId : null;
const requestSubtype = typeof $requestSubtype !== 'undefined' ? $requestSubtype : null;
const requestType = typeof $requestType !== 'undefined' ? $requestType : null;
const resolution = typeof $resolution !== 'undefined' ? $resolution : null;
const resolutionDetails = typeof $resolutionDetails !== 'undefined' ? $resolutionDetails : null;
const workdayObjectValue = typeof $workdayObjectValue !== 'undefined' ? $workdayObjectValue : null;

const apiPath = '/request/v2/requests';
const qParts = [];
(function buildQuery(params) {
    if (completedOnOrAfter !== null && completedOnOrAfter !== undefined) params.push(`completedOnOrAfter=${encodeURIComponent(completedOnOrAfter)}`);
    if (completedOnOrBefore !== null && completedOnOrBefore !== undefined) params.push(`completedOnOrBefore=${encodeURIComponent(completedOnOrBefore)}`);
    if (initiatedOnOrAfter !== null && initiatedOnOrAfter !== undefined) params.push(`initiatedOnOrAfter=${encodeURIComponent(initiatedOnOrAfter)}`);
    if (initiatedOnOrBefore !== null && initiatedOnOrBefore !== undefined) params.push(`initiatedOnOrBefore=${encodeURIComponent(initiatedOnOrBefore)}`);
    if (initiator !== null && initiator !== undefined) params.push(`initiator=${encodeURIComponent(initiator)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
    if (onBehalfOf !== null && onBehalfOf !== undefined) params.push(`onBehalfOf=${encodeURIComponent(onBehalfOf)}`);
    if (requestId !== null && requestId !== undefined) params.push(`requestId=${encodeURIComponent(requestId)}`);
    if (requestSubtype !== null && requestSubtype !== undefined) params.push(`requestSubtype=${encodeURIComponent(requestSubtype)}`);
    if (requestType !== null && requestType !== undefined) params.push(`requestType=${encodeURIComponent(requestType)}`);
    if (resolution !== null && resolution !== undefined) params.push(`resolution=${encodeURIComponent(resolution)}`);
    if (resolutionDetails !== null && resolutionDetails !== undefined) params.push(`resolutionDetails=${encodeURIComponent(resolutionDetails)}`);
    if (workdayObjectValue !== null && workdayObjectValue !== undefined) params.push(`workdayObjectValue=${encodeURIComponent(workdayObjectValue)}`);
})(qParts);
const queryString = qParts.length > 0 ? '?' + qParts.join('&') : '';

const options = {
    hostname: hostname,
    path: apiPath + queryString,
    method: "GET",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
    }
};

const ERROR_MAP = {
    400: "Bad Request — The request is malformed or contains invalid parameters.",
    401: "Unauthorized — The OAuth 2.0 access token is expired or invalid. Refresh the token and update the beartoken Flowise variable.",
    403: "Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group has permissions on the Request domain.",
    404: "Not Found — The requested resource or endpoint does not exist. Verify the ID and API path.",
    409: "Conflict — The request conflicts with a Workday business rule or constraint.",
    500: "Internal Server Error — A server-side error occurred in Workday. Retry or check service status.",
    503: "Service Unavailable — The Workday tenant is temporarily unavailable or under maintenance. Retry later."
};

return new Promise((resolve) => {
    const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(body);
            } else {
                const hint = ERROR_MAP[res.statusCode] || `HTTP ${res.statusCode} error.`;
                let detail = "";
                try { detail = JSON.parse(body)?.error || body.substring(0, 300); } catch(e) { detail = body.substring(0, 300); }
                resolve(`Workday API error ${res.statusCode}: ${hint}\nResponse: ${detail}`);
            }
        });
    });
    req.on("error", (err) => {
        resolve(`Request failed: ${err.message}. Verify the 'suv_name' variable contains a valid Workday hostname.`);
    });
    req.end();
});