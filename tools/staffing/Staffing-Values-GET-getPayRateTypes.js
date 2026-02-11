const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const effectiveDate = typeof $effectiveDate !== 'undefined' ? $effectiveDate : null;
const job = typeof $job !== 'undefined' ? $job : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const location = typeof $location !== 'undefined' ? $location : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;
const proposedManager = typeof $proposedManager !== 'undefined' ? $proposedManager : null;
const staffingEvent = typeof $staffingEvent !== 'undefined' ? $staffingEvent : null;
const worker = typeof $worker !== 'undefined' ? $worker : null;

const apiPath = '/staffing/v7/values/jobChangesGroup/payRateTypes/';
const qParts = [];
(function buildQuery(params) {
    if (effectiveDate !== null && effectiveDate !== undefined) params.push(`effectiveDate=${encodeURIComponent(effectiveDate)}`);
    if (job !== null && job !== undefined) params.push(`job=${encodeURIComponent(job)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (location !== null && location !== undefined) params.push(`location=${encodeURIComponent(location)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
    if (proposedManager !== null && proposedManager !== undefined) params.push(`proposedManager=${encodeURIComponent(proposedManager)}`);
    if (staffingEvent !== null && staffingEvent !== undefined) params.push(`staffingEvent=${encodeURIComponent(staffingEvent)}`);
    if (worker !== null && worker !== undefined) params.push(`worker=${encodeURIComponent(worker)}`);
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
    403: "Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group has permissions on the Staffing domain.",
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