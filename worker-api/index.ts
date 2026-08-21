interface Env {
  INTEGRATIONS_HUB_CLIENT_ID?: string;
  INTEGRATIONS_HUB_CLIENT_SECRET?: string;
  FRONTEND_ORIGIN?: string;
  INTEGRATIONS_HUB_URL?: string;
}

const DEFAULT_FRONTEND_ORIGIN = "https://broker-commission-dashboard.edward-bell.workers.dev";
const DEFAULT_HUB_URL = "https://integrations.flightcontrol.co.nz/api/v1/broker/bigquery/readonly-job";
const APP_TABLE = "`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c`";
const LOAN_TABLE = "`nectar-marketing-insights.salesforce_data_incremental.loan__Loan_Account__c`";

function frontendOrigin(env: Env) {
  return env.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN;
}

function json(body: unknown, status: number, env: Env, origin = frontendOrigin(env)) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
      vary: "Origin",
    },
  });
}

function monthEnd(request: Request) {
  const value = new URL(request.url).searchParams.get("month_end") || "2026-06-30";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("Invalid month_end");
  }
  return value;
}

type BigQueryField = { name?: string };
type BigQueryCell = { v?: unknown };
type BigQueryRow = { f?: BigQueryCell[] };
type BigQueryPayload = { rows?: unknown[]; schema?: { fields?: BigQueryField[] } };

function asPayload(value: unknown): BigQueryPayload {
  return value && typeof value === "object" ? value as BigQueryPayload : {};
}

function rowsFromPayload(payloadValue: unknown, rootValue: unknown) {
  const payload = asPayload(payloadValue);
  const root = asPayload(rootValue);
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const first = rows[0] as BigQueryRow | undefined;
  if (!first?.f) return rows;
  const fields = payload.schema?.fields || root.schema?.fields || [];
  return rows.map((rowValue) => {
    const row = rowValue as BigQueryRow;
    return Object.fromEntries(fields.map((field, index) => [field.name || `column_${index}`, row.f?.[index]?.v ?? null]));
  });
}

async function queryBigQuery(env: Env, query: string) {
  if (!env.INTEGRATIONS_HUB_CLIENT_ID || !env.INTEGRATIONS_HUB_CLIENT_SECRET) {
    throw new Error("Integrations Hub credentials are not configured");
  }
  const response = await fetch(env.INTEGRATIONS_HUB_URL || DEFAULT_HUB_URL, {
    method: "POST",
    headers: {
      "CF-Access-Client-ID": env.INTEGRATIONS_HUB_CLIENT_ID,
      "CF-Access-Client-Secret": env.INTEGRATIONS_HUB_CLIENT_SECRET,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "bigquery.job.create.readonly",
      query,
      useLegacySql: false,
      projectId: "nectar-marketing-insights",
      location: "australia-southeast1",
      maxBytesBilled: 50_000_000_000,
      maxResults: 5_000,
    }),
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Integrations Hub returned non-JSON (${response.status})`);
  }
  const body: unknown = await response.json();
  const errorBody = body && typeof body === "object" ? body as { message?: unknown; error?: unknown } : {};
  if (!response.ok) throw new Error(String(errorBody.message || errorBody.error || `Integrations Hub query failed (${response.status})`));
  const successBody = body && typeof body === "object" ? body as { result?: unknown; data?: unknown; response?: unknown } : {};
  // The Hub returns its synchronous BigQuery result inside `data.result.query`.
  // Keep the fallback shapes so the dashboard remains compatible with a direct
  // BigQuery-shaped broker response, but do not mistake the outer Hub envelope
  // for a result set (which silently produced an empty dashboard).
  const data = asPayload(successBody.data);
  const result = asPayload(data.result || successBody.result || successBody.response || body);
  const queryResult = asPayload(result.query || result);
  return rowsFromPayload(queryResult, result);
}

function commissionQuery(end: string) {
  return `SELECT COALESCE(NULLIF(TRIM(Partner_Name__c), ''), 'Direct') AS broker, COUNT(*) AS funded_loans, SUM(CASE WHEN COALESCE(Requested_Top_Up_Amount__c, 0) > 0 THEN Requested_Top_Up_Amount__c ELSE COALESCE(genesis__Loan_Amount__c, 0) END) AS funded_amount, SUM(COALESCE(Broker_Fee__c, 0)) AS broker_fees FROM ${APP_TABLE} WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c BETWEEN DATE_TRUNC(DATE('${end}'), MONTH) AND DATE('${end}') GROUP BY broker ORDER BY funded_amount DESC LIMIT 500`;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/health" && request.method === "GET") {
    return json({ status: "ok", service: "broker-commission-dashboard-api" }, 200, env);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": frontendOrigin(env), "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "content-type" } });
  }
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, env);
  const origin = request.headers.get("Origin");
  if (origin !== frontendOrigin(env)) return json({ error: "forbidden", message: "Browser origin is not authorized" }, 403, env);
  try {
    if (url.pathname === "/api/broker-commission") {
      const end = monthEnd(request);
      return json({ month_end: end, source_table: APP_TABLE.slice(1, -1), query_timestamp: new Date().toISOString(), rows: await queryBigQuery(env, commissionQuery(end)) }, 200, env, origin);
    }
    if (url.pathname === "/api/broker-underlying") {
      const end = monthEnd(request);
      const query = `SELECT Name AS application, COALESCE(NULLIF(TRIM(Partner_Name__c), ''), 'Direct') AS broker, Funding_Date__c AS funding_date, Requested_Top_Up_Amount__c AS top_up_amount, genesis__Loan_Amount__c AS original_loan_amount, CASE WHEN COALESCE(Requested_Top_Up_Amount__c, 0) > 0 THEN Requested_Top_Up_Amount__c ELSE COALESCE(genesis__Loan_Amount__c, 0) END AS amount_funded, Broker_Fee__c AS broker_fee FROM ${APP_TABLE} WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c BETWEEN DATE_TRUNC(DATE('${end}'), MONTH) AND DATE('${end}') ORDER BY Funding_Date__c, broker, application`;
      return json({ month_end: end, rows: await queryBigQuery(env, query) }, 200, env, origin);
    }
    if (url.pathname === "/api/broker-clawbacks") {
      const query = `SELECT a.Name AS application, l.Name AS contract, a.Partner_Name__c AS broker, a.Funding_Date__c AS funding_date, DATE(l.CreatedDate) AS contract_created_date, l.loan__Closed_Date__c AS paid_off_date, DATE_DIFF(l.loan__Closed_Date__c, DATE(l.CreatedDate), DAY) AS days_to_paid_off, CASE WHEN COALESCE(a.Requested_Top_Up_Amount__c,0) > 0 THEN a.Requested_Top_Up_Amount__c ELSE COALESCE(a.genesis__Loan_Amount__c,0) END AS commission_base FROM ${LOAN_TABLE} l JOIN ${APP_TABLE} a ON l.Application__c = a.Id WHERE a.Status_funded_trigger__c = TRUE AND a.Partner_Name__c IS NOT NULL AND TRIM(a.Partner_Name__c) != '' AND l.loan__Closed_Date__c IS NOT NULL AND DATE_DIFF(l.loan__Closed_Date__c, DATE(l.CreatedDate), DAY) < 182.5 AND DATE(l.loan__Closed_Date__c) >= DATE(a.Funding_Date__c) AND a.Funding_Date__c >= DATE('2026-01-01') ORDER BY l.loan__Closed_Date__c, a.Partner_Name__c, a.Name`;
      return json({ rows: await queryBigQuery(env, query) }, 200, env, origin);
    }
    if (url.pathname === "/api/broker-waiver") {
      const query = `SELECT new_app.Name AS application, new_app.Partner_Name__c AS broker, new_app.Funding_Date__c AS funding_date, old_loan.Name AS old_contract, old_loan.Protect_Paid__c AS old_nrw_collected, new_loan.loan__Protect_fee_amount__c AS new_nrw_premium, CASE WHEN old_loan.Id IS NULL THEN COALESCE(new_loan.loan__Protect_fee_amount__c,0) WHEN new_loan.loan__Protect_fee_amount__c > COALESCE(old_loan.Protect_Paid__c,0) THEN new_loan.loan__Protect_fee_amount__c - old_loan.Protect_Paid__c ELSE 0 END AS incremental_nrw, CASE WHEN old_loan.Id IS NULL THEN COALESCE(new_loan.loan__Protect_fee_amount__c,0) ELSE CASE WHEN new_loan.loan__Protect_fee_amount__c > COALESCE(old_loan.Protect_Paid__c,0) THEN new_loan.loan__Protect_fee_amount__c - old_loan.Protect_Paid__c ELSE 0 END END * 0.35 AS waiver_commission FROM ${APP_TABLE} new_app JOIN ${LOAN_TABLE} new_loan ON new_loan.Application__c = new_app.Id LEFT JOIN ${LOAN_TABLE} old_loan ON new_app.Previous_Contract__c = old_loan.Id WHERE new_app.Status_funded_trigger__c = TRUE AND new_app.Partner_Name__c IS NOT NULL AND TRIM(new_app.Partner_Name__c) != '' AND new_loan.loan__Protect_fee_amount__c IS NOT NULL AND new_app.Funding_Date__c >= DATE('2026-01-01') ORDER BY new_app.Funding_Date__c, new_app.Partner_Name__c, new_app.Name`;
      return json({ waiver_rate: 0.35, rows: await queryBigQuery(env, query) }, 200, env, origin);
    }
    if (url.pathname === "/api/broker-trends") {
      const query = `SELECT DATE_TRUNC(Funding_Date__c, MONTH) AS month_start, COALESCE(NULLIF(TRIM(Partner_Name__c), ''), 'Direct') AS broker, COUNT(*) AS funded_loans, SUM(CASE WHEN COALESCE(Requested_Top_Up_Amount__c, 0) > 0 THEN Requested_Top_Up_Amount__c ELSE COALESCE(genesis__Loan_Amount__c, 0) END) AS funded_base FROM ${APP_TABLE} WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 12 MONTH) GROUP BY month_start, broker ORDER BY month_start, broker LIMIT 5000`;
      return json({ rows: await queryBigQuery(env, query) }, 200, env, origin);
    }
    if (url.pathname === "/api/broker-weekly") {
      const end = monthEnd(request);
      const query = `SELECT DATE_TRUNC(Funding_Date__c, WEEK(MONDAY)) AS week_start, COALESCE(NULLIF(TRIM(Partner_Name__c), ''), 'Direct') AS broker, COUNT(*) AS funded_loans, SUM(CASE WHEN COALESCE(Requested_Top_Up_Amount__c, 0) > 0 THEN Requested_Top_Up_Amount__c ELSE COALESCE(genesis__Loan_Amount__c, 0) END) AS funded_base FROM ${APP_TABLE} WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c BETWEEN DATE_TRUNC(DATE('${end}'), MONTH) AND DATE('${end}') GROUP BY week_start, broker ORDER BY week_start, broker LIMIT 5000`;
      return json({ rows: await queryBigQuery(env, query) }, 200, env, origin);
    }
    return json({ error: "not_found" }, 404, env, origin);
  } catch (error) {
    return json({ error: "backend_request_failed", message: error instanceof Error ? error.message : "Request failed" }, 502, env, origin);
  }
}

export default { fetch: handleApi };
