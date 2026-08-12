export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function monthBounds(value: string) {
  const end = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) throw new Error("Invalid month-end selection");
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return { start: start.toISOString().slice(0, 10), end: value };
}

export async function GET(request: Request) {
  const monthEnd = new URL(request.url).searchParams.get("month_end") || "2026-06-30";
  try {
    const { start, end } = monthBounds(monthEnd);
    const query = `SELECT Partner_Name__c AS broker, COUNT(*) AS funded_loans, SUM(COALESCE(Amount_Financed__c, 0)) AS funded_amount, SUM(COALESCE(Broker_Fee__c, 0)) AS broker_fees FROM \`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c\` WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c BETWEEN DATE('${start}') AND DATE('${end}') GROUP BY broker ORDER BY funded_amount DESC LIMIT 500`;
    const clientId = process.env.INTEGRATIONS_HUB_CLIENT_ID;
    const clientSecret = process.env.INTEGRATIONS_HUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Integrations Hub credentials are not configured");
    const response = await fetch("https://integrations.flightcontrol.co.nz/api/v1/broker/bigquery/readonly-job", { method: "POST", headers: { "CF-Access-Client-Id": clientId, "CF-Access-Client-Secret": clientSecret, "Content-Type": "application/json" }, body: JSON.stringify({ query, useLegacySql: false }) });
    const body = await response.json() as any;
    if (!response.ok) throw new Error(body?.message || body?.error || `Integrations Hub query failed (${response.status})`);
    const payload = body.result || body.data || body.response || body;
    const fields = payload.schema?.fields || body.schema?.fields || [];
    const rows = (payload.rows || body.rows || []).map((row: any) => row.f ? Object.fromEntries(fields.map((field: any, index: number) => [field.name, row.f?.[index]?.v ?? null])) : row);
    return Response.json({ month_end: monthEnd, source_table: "nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c", query_timestamp: new Date().toISOString(), rows }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "broker_commission_fetch_failed", message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
