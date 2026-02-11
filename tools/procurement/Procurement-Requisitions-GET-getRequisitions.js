const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const externalSourceableId = typeof $externalSourceableId !== 'undefined' ? $externalSourceableId : null;
const externalSystemId = typeof $externalSystemId !== 'undefined' ? $externalSystemId : null;
const fromDate = typeof $fromDate !== 'undefined' ? $fromDate : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;
const requester = typeof $requester !== 'undefined' ? $requester : null;
const requisitionType = typeof $requisitionType !== 'undefined' ? $requisitionType : null;
const submittedBy = typeof $submittedBy !== 'undefined' ? $submittedBy : null;
const submittedByPerson = typeof $submittedByPerson !== 'undefined' ? $submittedByPerson : null;
const submittedBySupplier = typeof $submittedBySupplier !== 'undefined' ? $submittedBySupplier : null;
const toDate = typeof $toDate !== 'undefined' ? $toDate : null;

const apiPath = '/procurement/v5/requisitions';
const qParts = [];
(function buildQuery(params) {
    if (externalSourceableId !== null && externalSourceableId !== undefined) params.push(`externalSourceableId=${encodeURIComponent(externalSourceableId)}`);
    if (externalSystemId !== null && externalSystemId !== undefined) params.push(`externalSystemId=${encodeURIComponent(externalSystemId)}`);
    if (fromDate !== null && fromDate !== undefined) params.push(`fromDate=${encodeURIComponent(fromDate)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
    if (requester !== null && requester !== undefined) params.push(`requester=${encodeURIComponent(requester)}`);
    if (requisitionType !== null && requisitionType !== undefined) params.push(`requisitionType=${encodeURIComponent(requisitionType)}`);
    if (submittedBy !== null && submittedBy !== undefined) params.push(`submittedBy=${encodeURIComponent(submittedBy)}`);
    if (submittedByPerson !== null && submittedByPerson !== undefined) params.push(`submittedByPerson=${encodeURIComponent(submittedByPerson)}`);
    if (submittedBySupplier !== null && submittedBySupplier !== undefined) params.push(`submittedBySupplier=${encodeURIComponent(submittedBySupplier)}`);
    if (toDate !== null && toDate !== undefined) params.push(`toDate=${encodeURIComponent(toDate)}`);
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
    403: "Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group has permissions on the Procurement domain.",
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