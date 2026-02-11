const https = require('https');

const hostname = $vars?.suv_name;
const accessToken = $vars?.beartoken?.trim();

if (!hostname || !accessToken) {
    return "Error: Workday connection not configured. Set the 'suv_name' and 'beartoken' variables in Flowise.";
}

const closeMentorshipReason = typeof $closeMentorshipReason !== 'undefined' ? $closeMentorshipReason : null;
const closed = typeof $closed !== 'undefined' ? $closed : null;
const inProgress = typeof $inProgress !== 'undefined' ? $inProgress : null;
const limit = typeof $limit !== 'undefined' ? $limit : null;
const mentee = typeof $mentee !== 'undefined' ? $mentee : null;
const mentor = typeof $mentor !== 'undefined' ? $mentor : null;
const mentorType = typeof $mentorType !== 'undefined' ? $mentorType : null;
const offset = typeof $offset !== 'undefined' ? $offset : null;

const apiPath = '/talentManagement/v2/mentorships';
const qParts = [];
(function buildQuery(params) {
    if (closeMentorshipReason !== null && closeMentorshipReason !== undefined) params.push(`closeMentorshipReason=${encodeURIComponent(closeMentorshipReason)}`);
    if (closed !== null && closed !== undefined) params.push(`closed=${encodeURIComponent(closed)}`);
    if (inProgress !== null && inProgress !== undefined) params.push(`inProgress=${encodeURIComponent(inProgress)}`);
    if (limit !== null && limit !== undefined) params.push(`limit=${encodeURIComponent(limit)}`);
    if (mentee !== null && mentee !== undefined) params.push(`mentee=${encodeURIComponent(mentee)}`);
    if (mentor !== null && mentor !== undefined) params.push(`mentor=${encodeURIComponent(mentor)}`);
    if (mentorType !== null && mentorType !== undefined) params.push(`mentorType=${encodeURIComponent(mentorType)}`);
    if (offset !== null && offset !== undefined) params.push(`offset=${encodeURIComponent(offset)}`);
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
    403: "Forbidden — The Integration System User (ISU) lacks required domain security policies. Verify the Security Group has permissions on the TalentManagement domain.",
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