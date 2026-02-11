const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const billingStatus = typeof $billingStatus !== 'undefined' ? $billingStatus : null;
const customer = typeof $customer !== 'undefined' ? $customer : null;
const fromDate = typeof $fromDate !== 'undefined' ? $fromDate : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;
const phase = typeof $phase !== 'undefined' ? $phase : null;
const project = typeof $project !== 'undefined' ? $project : null;
const spendCategory = typeof $spendCategory !== 'undefined' ? $spendCategory : null;
const task = typeof $task !== 'undefined' ? $task : null;
const timeCode = typeof $timeCode !== 'undefined' ? $timeCode : null;
const toDate = typeof $toDate !== 'undefined' ? $toDate : null;
const transactionSource = typeof $transactionSource !== 'undefined' ? $transactionSource : null;
const worker = typeof $worker !== 'undefined' ? $worker : null;

const apiPath = '/revenue/v1/billableTransactions';
const qParts = [];
(function buildQuery(params) {
    if (billingStatus !== null && billingStatus !== undefined) params.push(`billingStatus=${encodeURIComponent(billingStatus)}`);
    if (customer !== null && customer !== undefined) params.push(`customer=${encodeURIComponent(customer)}`);
    if (fromDate !== null && fromDate !== undefined) params.push(`fromDate=${encodeURIComponent(fromDate)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
    if (phase !== null && phase !== undefined) params.push(`phase=${encodeURIComponent(phase)}`);
    if (project !== null && project !== undefined) params.push(`project=${encodeURIComponent(project)}`);
    if (spendCategory !== null && spendCategory !== undefined) params.push(`spendCategory=${encodeURIComponent(spendCategory)}`);
    if (task !== null && task !== undefined) params.push(`task=${encodeURIComponent(task)}`);
    if (timeCode !== null && timeCode !== undefined) params.push(`timeCode=${encodeURIComponent(timeCode)}`);
    if (toDate !== null && toDate !== undefined) params.push(`toDate=${encodeURIComponent(toDate)}`);
    if (transactionSource !== null && transactionSource !== undefined) params.push(`transactionSource=${encodeURIComponent(transactionSource)}`);
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
    403: "Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group has permissions on the Revenue domain.",
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