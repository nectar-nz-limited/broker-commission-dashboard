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
        const query = `SELECT Partner_Name__c AS broker, COUNT(*) AS funded_loans, SUM(COALESCE(Amount_Financed__c, 0)) AS funded_amount, SUM(COALESCE(Broker_Fee__c, 0)) AS broker_fees FROM \`nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c\` WHERE Status_funded_trigger__c = TRUE AND Funding_Date__c <= DATE('${monthEnd}') GROUP BY broker ORDER BY funded_amount DESC LIMIT 500`;
        const rows = await queryBigQuery(env, query);
        return new Response(JSON.stringify({ month_end: monthEnd, source_table: "nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c", query_timestamp: new Date().toISOString(), rows }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
      } catch (error) { return new Response(JSON.stringify({ error: "broker_commission_fetch_failed", message: String(error instanceof Error ? error.message : error) }), { status: 500, headers: { "content-type": "application/json" } }); }
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
