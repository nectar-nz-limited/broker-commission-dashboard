type BqEnv = { INTEGRATIONS_HUB_CLIENT_ID?: string; INTEGRATIONS_HUB_CLIENT_SECRET?: string };

type AnyRecord = Record<string, any>;

function findResult(value: any): AnyRecord | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value.rows) || Array.isArray(value.jobComplete) || value.schema) return value;
  for (const key of ["result", "data", "response", "queryResult", "query_results", "job", "results"]) {
    const found = findResult(value[key]);
    if (found) return found;
  }
  return null;
}

function rowsFromPayload(payload: AnyRecord | null, root: AnyRecord) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : Array.isArray(root.rows) ? root.rows : [];
  const schema = payload?.schema?.fields || root.schema?.fields || payload?.fields || root.fields || [];
  return rows.map((row: any) => {
    if (!row?.f) return row;
    return Object.fromEntries(schema.map((field: any, index: number) => [field.name, row.f[index]?.v ?? null]));
  });
}

export async function queryBigQuery(env: BqEnv, query: string) {
  if (!env.INTEGRATIONS_HUB_CLIENT_ID || !env.INTEGRATIONS_HUB_CLIENT_SECRET) throw new Error("Integrations Hub credentials are not configured");
  const response = await fetch("https://integrations.flightcontrol.co.nz/api/v1/broker/bigquery/readonly-job", {
    method: "POST",
    headers: { "CF-Access-Client-ID": env.INTEGRATIONS_HUB_CLIENT_ID, "CF-Access-Client-Secret": env.INTEGRATIONS_HUB_CLIENT_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "bigquery.job.create.readonly", query, useLegacySql: false, projectId: "nectar-marketing-insights", location: "australia-southeast1", maxBytesBilled: 50000000000, maxRows: 5000 }),
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error(`Integrations Hub unavailable (${response.status})`);
  const body = await response.json() as AnyRecord;
  if (!response.ok) throw new Error(body.message || body.error || `Integrations Hub query failed (${response.status})`);
  return rowsFromPayload(findResult(body), body);
}
