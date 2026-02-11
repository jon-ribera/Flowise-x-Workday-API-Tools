const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const billToCustomer = typeof $billToCustomer !== 'undefined' ? $billToCustomer : null;
const company = typeof $company !== 'undefined' ? $company : null;
const fromDueDate = typeof $fromDueDate !== 'undefined' ? $fromDueDate : null;
const fromInvoiceDate = typeof $fromInvoiceDate !== 'undefined' ? $fromInvoiceDate : null;
const invoiceStatus = typeof $invoiceStatus !== 'undefined' ? $invoiceStatus : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;
const paymentStatus = typeof $paymentStatus !== 'undefined' ? $paymentStatus : null;
const toDueDate = typeof $toDueDate !== 'undefined' ? $toDueDate : null;
const toInvoiceDate = typeof $toInvoiceDate !== 'undefined' ? $toInvoiceDate : null;
const transactionType = typeof $transactionType !== 'undefined' ? $transactionType : null;

const apiPath = '/customerAccounts/v1/invoices';
const qParts = [];
(function buildQuery(params) {
    if (billToCustomer !== null && billToCustomer !== undefined) params.push(`billToCustomer=${encodeURIComponent(billToCustomer)}`);
    if (company !== null && company !== undefined) params.push(`company=${encodeURIComponent(company)}`);
    if (fromDueDate !== null && fromDueDate !== undefined) params.push(`fromDueDate=${encodeURIComponent(fromDueDate)}`);
    if (fromInvoiceDate !== null && fromInvoiceDate !== undefined) params.push(`fromInvoiceDate=${encodeURIComponent(fromInvoiceDate)}`);
    if (invoiceStatus !== null && invoiceStatus !== undefined) params.push(`invoiceStatus=${encodeURIComponent(invoiceStatus)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
    if (paymentStatus !== null && paymentStatus !== undefined) params.push(`paymentStatus=${encodeURIComponent(paymentStatus)}`);
    if (toDueDate !== null && toDueDate !== undefined) params.push(`toDueDate=${encodeURIComponent(toDueDate)}`);
    if (toInvoiceDate !== null && toInvoiceDate !== undefined) params.push(`toInvoiceDate=${encodeURIComponent(toInvoiceDate)}`);
    if (transactionType !== null && transactionType !== undefined) params.push(`transactionType=${encodeURIComponent(transactionType)}`);
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
    403: "Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group has permissions on the CustomerAccounts domain.",
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