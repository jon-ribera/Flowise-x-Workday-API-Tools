const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const additionalWorktags = typeof $additionalWorktags !== 'undefined' ? $additionalWorktags : null;
const allStandaloneTypes = typeof $allStandaloneTypes !== 'undefined' ? $allStandaloneTypes : null;
const commodityCode = typeof $commodityCode !== 'undefined' ? $commodityCode : null;
const company = typeof $company !== 'undefined' ? $company : null;
const currency = typeof $currency !== 'undefined' ? $currency : null;
const existingWorktags = typeof $existingWorktags !== 'undefined' ? $existingWorktags : null;
const itemDescription = typeof $itemDescription !== 'undefined' ? $itemDescription : null;
const itemSpendCategory = typeof $itemSpendCategory !== 'undefined' ? $itemSpendCategory : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;
const procurementItem = typeof $procurementItem !== 'undefined' ? $procurementItem : null;
const reqTypeBillOnly = typeof $reqTypeBillOnly !== 'undefined' ? $reqTypeBillOnly : null;
const reqTypeConsignment = typeof $reqTypeConsignment !== 'undefined' ? $reqTypeConsignment : null;
const reqTypeInvReplenishment = typeof $reqTypeInvReplenishment !== 'undefined' ? $reqTypeInvReplenishment : null;
const reqTypeJustInTime = typeof $reqTypeJustInTime !== 'undefined' ? $reqTypeJustInTime : null;
const reqTypeParReplenishment = typeof $reqTypeParReplenishment !== 'undefined' ? $reqTypeParReplenishment : null;
const reqTypeShowAllTypes = typeof $reqTypeShowAllTypes !== 'undefined' ? $reqTypeShowAllTypes : null;
const reqTypeSupplierContract = typeof $reqTypeSupplierContract !== 'undefined' ? $reqTypeSupplierContract : null;
const requester = typeof $requester !== 'undefined' ? $requester : null;
const requisition = typeof $requisition !== 'undefined' ? $requisition : null;
const requisitionDate = typeof $requisitionDate !== 'undefined' ? $requisitionDate : null;
const requisitionLine = typeof $requisitionLine !== 'undefined' ? $requisitionLine : null;
const requisitionType = typeof $requisitionType !== 'undefined' ? $requisitionType : null;
const resourceProviderContract = typeof $resourceProviderContract !== 'undefined' ? $resourceProviderContract : null;
const selectedWorktags = typeof $selectedWorktags !== 'undefined' ? $selectedWorktags : null;
const supplier = typeof $supplier !== 'undefined' ? $supplier : null;
const typesWithoutService = typeof $typesWithoutService !== 'undefined' ? $typesWithoutService : null;
const validForRequestingEntity = typeof $validForRequestingEntity !== 'undefined' ? $validForRequestingEntity : null;
const worktagType = typeof $worktagType !== 'undefined' ? $worktagType : null;

const apiPath = '/procurement/v5/values/requisitionsGroup/unitOfMeasure/';
const qParts = [];
(function buildQuery(params) {
    if (additionalWorktags !== null && additionalWorktags !== undefined) params.push(`additionalWorktags=${encodeURIComponent(additionalWorktags)}`);
    if (allStandaloneTypes !== null && allStandaloneTypes !== undefined) params.push(`allStandaloneTypes=${encodeURIComponent(allStandaloneTypes)}`);
    if (commodityCode !== null && commodityCode !== undefined) params.push(`commodityCode=${encodeURIComponent(commodityCode)}`);
    if (company !== null && company !== undefined) params.push(`company=${encodeURIComponent(company)}`);
    if (currency !== null && currency !== undefined) params.push(`currency=${encodeURIComponent(currency)}`);
    if (existingWorktags !== null && existingWorktags !== undefined) params.push(`existingWorktags=${encodeURIComponent(existingWorktags)}`);
    if (itemDescription !== null && itemDescription !== undefined) params.push(`itemDescription=${encodeURIComponent(itemDescription)}`);
    if (itemSpendCategory !== null && itemSpendCategory !== undefined) params.push(`itemSpendCategory=${encodeURIComponent(itemSpendCategory)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
    if (procurementItem !== null && procurementItem !== undefined) params.push(`procurementItem=${encodeURIComponent(procurementItem)}`);
    if (reqTypeBillOnly !== null && reqTypeBillOnly !== undefined) params.push(`reqTypeBillOnly=${encodeURIComponent(reqTypeBillOnly)}`);
    if (reqTypeConsignment !== null && reqTypeConsignment !== undefined) params.push(`reqTypeConsignment=${encodeURIComponent(reqTypeConsignment)}`);
    if (reqTypeInvReplenishment !== null && reqTypeInvReplenishment !== undefined) params.push(`reqTypeInvReplenishment=${encodeURIComponent(reqTypeInvReplenishment)}`);
    if (reqTypeJustInTime !== null && reqTypeJustInTime !== undefined) params.push(`reqTypeJustInTime=${encodeURIComponent(reqTypeJustInTime)}`);
    if (reqTypeParReplenishment !== null && reqTypeParReplenishment !== undefined) params.push(`reqTypeParReplenishment=${encodeURIComponent(reqTypeParReplenishment)}`);
    if (reqTypeShowAllTypes !== null && reqTypeShowAllTypes !== undefined) params.push(`reqTypeShowAllTypes=${encodeURIComponent(reqTypeShowAllTypes)}`);
    if (reqTypeSupplierContract !== null && reqTypeSupplierContract !== undefined) params.push(`reqTypeSupplierContract=${encodeURIComponent(reqTypeSupplierContract)}`);
    if (requester !== null && requester !== undefined) params.push(`requester=${encodeURIComponent(requester)}`);
    if (requisition !== null && requisition !== undefined) params.push(`requisition=${encodeURIComponent(requisition)}`);
    if (requisitionDate !== null && requisitionDate !== undefined) params.push(`requisitionDate=${encodeURIComponent(requisitionDate)}`);
    if (requisitionLine !== null && requisitionLine !== undefined) params.push(`requisitionLine=${encodeURIComponent(requisitionLine)}`);
    if (requisitionType !== null && requisitionType !== undefined) params.push(`requisitionType=${encodeURIComponent(requisitionType)}`);
    if (resourceProviderContract !== null && resourceProviderContract !== undefined) params.push(`resourceProviderContract=${encodeURIComponent(resourceProviderContract)}`);
    if (selectedWorktags !== null && selectedWorktags !== undefined) params.push(`selectedWorktags=${encodeURIComponent(selectedWorktags)}`);
    if (supplier !== null && supplier !== undefined) params.push(`supplier=${encodeURIComponent(supplier)}`);
    if (typesWithoutService !== null && typesWithoutService !== undefined) params.push(`typesWithoutService=${encodeURIComponent(typesWithoutService)}`);
    if (validForRequestingEntity !== null && validForRequestingEntity !== undefined) params.push(`validForRequestingEntity=${encodeURIComponent(validForRequestingEntity)}`);
    if (worktagType !== null && worktagType !== undefined) params.push(`worktagType=${encodeURIComponent(worktagType)}`);
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