type BqEnv = { INTEGRATIONS_HUB_CLIENT_ID?: string; INTEGRATIONS_HUB_CLIENT_SECRET?: string };

type AnyRecord = Record<string, any>;

const ENVELOPE_KEYS = [
  "result",
  "data",
  "response",
  "queryResult",
  "queryResults",
  "query_results",
  "job",
  "results",
  "body",
  "payload",
];

function hasRows(value: any): value is AnyRecord {
  return Boolean(value && typeof value === "object" && Array.isArray(value.rows));
}

function findResult(value: any, seen = new Set<any>()): AnyRecord | null {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (hasRows(value)) return value;
  for (const key of ENVELOPE_KEYS) {
    const found = findResult(value[key], seen);
    if (found) return found;
  }
  for (const valueItem of Object.values(value)) {
    const found = findResult(valueItem, seen);
    if (found) return found;
  }
  return null;
}

function schemaFields(payload: AnyRecord | null, root: AnyRecord): any[] {
  const candidates = [
    payload?.schema?.fields,
    payload?.fields,
    payload?.queryResult?.schema?.fields,
    root.schema?.fields,
    root.fields,
  ];
  return candidates.find((value) => Array.isArray(value)) || [];
}

function rowsFromPayload(payload: AnyRecord | null, root: AnyRecord) {
  const rows = payload?.rows || root.rows || [];
  const schema = schemaFields(payload, root);
  return rows.map((row: any) => {
    if (!row || Array.isArray(row)) {
      return row;
    }
    if (!Array.isArray(row.f)) {
      return row;
    }
    return Object.fromEntries(
      schema.map((field: any, index: number) => [
        field.name,
        row.f[index]?.v ?? null,
      ]),
    );
  });
}

export async function queryBigQuery(env: BqEnv, query: string) {
  if (!env.INTEGRATIONS_HUB_CLIENT_ID || !env.INTEGRATIONS_HUB_CLIENT_SECRET) {
    throw new Error("Integrations Hub credentials are not configured");
  }

  const response = await fetch(
    "https://integrations.flightcontrol.co.nz/api/v1/broker/bigquery/readonly-job",
    {
      method: "POST",
      headers: {
        "CF-Access-Client-Id": env.INTEGRATIONS_HUB_CLIENT_ID,
        "CF-Access-Client-Secret": env.INTEGRATIONS_HUB_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "bigquery.job.create.readonly",
        query,
        useLegacySql: false,
        projectId: "nectar-marketing-insights",
        location: "australia-southeast1",
        maxBytesBilled: 50000000000,
        maxRows: 5000,
      }),
    },
  );

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Integrations Hub unavailable (${response.status})`);
  }

  const body = await response.json() as AnyRecord;
  if (!response.ok) {
    throw new Error(body.message || body.error || `Integrations Hub query failed (${response.status})`);
  }

  return rowsFromPayload(findResult(body), body);
}
