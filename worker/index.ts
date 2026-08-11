/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { queryBigQuery } from "./bigquery";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  INTEGRATIONS_HUB_CLIENT_ID?: string;
  INTEGRATIONS_HUB_CLIENT_SECRET?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "Access-Control-Allow-Origin": "*" } });
const failure = (code: string, error: unknown) => json({ error: code, message: error instanceof Error ? error.message : String(error) }, 500);

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/broker-commission" && request.method === "GET") {
      try {
        const monthEnd = url.searchParams.get("month_end") || "2026-06-30";
        const query = `SELECT COALESCE(NULLIF(TRIM(Partner_Name__c), ''), 'Direct') AS broker, COUNT(*) AS funded_loans, SUM(CASE WHEN COALESCE(Requested_Top_Up_Amount__c, 0) > 0 THEN Requested_Top_Up_Amount__c ELSE COALESCE(genesis__Loan_Amount__c, 0) END) AS funded_amount, SUM(COALESCE(Broker_Fee__c, 0)) AS broker_fees FROM \`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c\` WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c <= DATE('${monthEnd}') GROUP BY broker ORDER BY funded_amount DESC LIMIT 500`;
        const rows = await queryBigQuery(env, query);
        return new Response(JSON.stringify({ month_end: monthEnd, source_table: "nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c", query_timestamp: new Date().toISOString(), rows }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
      } catch (error) { return new Response(JSON.stringify({ error: "broker_commission_fetch_failed", message: String(error instanceof Error ? error.message : error) }), { status: 500, headers: { "content-type": "application/json" } }); }
    }

    if (url.pathname === "/api/broker-underlying" && request.method === "GET") {
      try {
        const monthEnd = url.searchParams.get("month_end") || "2026-06-30";
        const query = `SELECT Name AS application, COALESCE(NULLIF(TRIM(Partner_Name__c), ''), 'Direct') AS broker, Funding_Date__c AS funding_date, Requested_Top_Up_Amount__c AS top_up_amount, genesis__Loan_Amount__c AS original_loan_amount, CASE WHEN COALESCE(Requested_Top_Up_Amount__c, 0) > 0 THEN Requested_Top_Up_Amount__c ELSE COALESCE(genesis__Loan_Amount__c, 0) END AS amount_funded, Broker_Fee__c AS broker_fee FROM \`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c\` WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c BETWEEN DATE_TRUNC(DATE('${monthEnd}'), MONTH) AND DATE('${monthEnd}') ORDER BY Funding_Date__c, broker, application`;
        return json({ month_end: monthEnd, rows: await queryBigQuery(env, query) });
      } catch (error) { return failure("broker_underlying_fetch_failed", error); }
    }

    if (url.pathname === "/api/broker-clawbacks" && request.method === "GET") {
      try {
        const query = `SELECT a.Name AS application, l.Name AS contract, a.Partner_Name__c AS broker, a.Funding_Date__c AS funding_date, l.CreatedDate AS contract_created_date, l.loan__Closed_Date__c AS paid_off_date, DATE_DIFF(l.loan__Closed_Date__c, DATE(l.CreatedDate), DAY) AS days_to_paid_off, CASE WHEN COALESCE(a.Requested_Top_Up_Amount__c,0) > 0 THEN a.Requested_Top_Up_Amount__c ELSE COALESCE(a.genesis__Loan_Amount__c,0) END AS commission_base FROM \`nectar-marketing-insights.salesforce_data_incremental.loan__Loan_Account__c\` l JOIN \`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c\` a ON l.Application__c = a.Id WHERE a.Status_funded_trigger__c = TRUE AND a.Partner_Name__c IS NOT NULL AND TRIM(a.Partner_Name__c) != '' AND l.loan__Closed_Date__c IS NOT NULL AND DATE_DIFF(l.loan__Closed_Date__c, DATE(l.CreatedDate), DAY) < 182.5 AND DATE(l.loan__Closed_Date__c) >= DATE(a.Funding_Date__c) AND a.Funding_Date__c >= DATE('2026-01-01') ORDER BY l.loan__Closed_Date__c, a.Partner_Name__c, a.Name`;
        return json({ rows: await queryBigQuery(env, query) });
      } catch (error) { return failure("broker_clawback_fetch_failed", error); }
    }

    if (url.pathname === "/api/broker-waiver" && request.method === "GET") {
      try {
        const query = `SELECT new_app.Name AS application, new_app.Partner_Name__c AS broker, new_app.Funding_Date__c AS funding_date, old_loan.Name AS old_contract, old_loan.Protect_Paid__c AS old_nrw_collected, new_loan.loan__Protect_fee_amount__c AS new_nrw_premium, CASE WHEN old_loan.Id IS NULL THEN COALESCE(new_loan.loan__Protect_fee_amount__c,0) WHEN new_loan.loan__Protect_fee_amount__c > COALESCE(old_loan.Protect_Paid__c,0) THEN new_loan.loan__Protect_fee_amount__c - old_loan.Protect_Paid__c ELSE 0 END AS incremental_nrw, CASE WHEN old_loan.Id IS NULL THEN COALESCE(new_loan.loan__Protect_fee_amount__c,0) ELSE CASE WHEN new_loan.loan__Protect_fee_amount__c > COALESCE(old_loan.Protect_Paid__c,0) THEN new_loan.loan__Protect_fee_amount__c - old_loan.Protect_Paid__c ELSE 0 END END * 0.35 AS waiver_commission FROM \`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c\` new_app JOIN \`nectar-marketing-insights.salesforce_data_incremental.loan__Loan_Account__c\` new_loan ON new_loan.Application__c = new_app.Id LEFT JOIN \`nectar-marketing-insights.salesforce_data_incremental.loan__Loan_Account__c\` old_loan ON new_app.Previous_Contract__c = old_loan.Id WHERE new_app.Status_funded_trigger__c = TRUE AND new_app.Partner_Name__c IS NOT NULL AND TRIM(new_app.Partner_Name__c) != '' AND new_loan.loan__Protect_fee_amount__c IS NOT NULL AND new_app.Funding_Date__c >= DATE('2026-01-01') ORDER BY new_app.Funding_Date__c, new_app.Partner_Name__c, new_app.Name`;
        return json({ waiver_rate: 0.35, rows: await queryBigQuery(env, query) });
      } catch (error) { return failure("broker_waiver_fetch_failed", error); }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
