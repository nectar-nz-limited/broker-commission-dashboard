import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const apiSource = await readFile(new URL("../worker-api/index.ts", import.meta.url), "utf8");
const frontendSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("Broker Commission API is Hub-only and pins the approved broker endpoint", () => {
  assert.match(apiSource, /integrations\.flightcontrol\.co\.nz\/api\/v1\/broker\/bigquery\/readonly-job/);
  assert.match(apiSource, /action:\s*"bigquery\.job\.create\.readonly"/);
  assert.match(apiSource, /location:\s*"US"/);
  assert.match(apiSource, /INTEGRATIONS_HUB_CLIENT_ID/);
  assert.match(apiSource, /INTEGRATIONS_HUB_CLIENT_SECRET/);
  assert.doesNotMatch(apiSource, /googleapis\.com|service[_ -]?account|private[_ -]?key/i);
});

test("Broker Commission API uses only the three approved Salesforce tables", () => {
  const tables = [...apiSource.matchAll(/nectar-marketing-insights\.(?:salesforce_data_incremental|salesforce_data)\.[A-Za-z0-9_]+/g)].map((match) => match[0]);
  assert.deepEqual([...new Set(tables)].sort(), [
    "nectar-marketing-insights.salesforce_data_incremental.genesis__Applications__c",
    "nectar-marketing-insights.salesforce_data_incremental.loan__Loan_Account__c",
  ]);
});

test("Frontend uses only the Broker Commission API Worker", () => {
  assert.match(frontendSource, /https:\/\/broker-commission-dashboard-api\.edward-bell\.workers\.dev/);
  assert.doesNotMatch(frontendSource, /performance-reporting\.edward-bell\.workers\.dev/);
});
