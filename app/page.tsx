"use client";

import { useEffect, useMemo, useState } from "react";

const API_ORIGIN =
  "https://broker-commission-dashboard-api.edward-bell.workers.dev";
const fetch: typeof globalThis.fetch = (input, init) => {
  const target =
    typeof input === "string" &&
    input.includes("performance-reporting.edward-bell.workers.dev")
      ? input.replace(
          "https://broker-commission-dashboard-api.edward-bell.workers.dev",
          API_ORIGIN,
        )
      : input;
  return globalThis.fetch(target, init);
};

function completedMonthEnds(count = 12) {
  const now = new Date();
  const firstOfCurrentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const format = (date: Date) =>
    date.toLocaleDateString("en-NZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Pacific/Auckland",
    });
  const current = format(now);
  return [
    current,
    ...Array.from({ length: count - 1 }, (_, index) => {
      const end = new Date(
        Date.UTC(
          firstOfCurrentMonth.getUTCFullYear(),
          firstOfCurrentMonth.getUTCMonth() - index,
          0,
        ),
      );
      return format(end);
    }),
  ];
}
const months = completedMonthEnds();
const brokers = [
  {
    broker: "The Lending People",
    funded: 1196200,
    gross: 44857.5,
    clawback: 6840,
    ppi: 10642,
    rate: "3.75%",
    status: "Ready",
  },
  {
    broker: "LoanPlace",
    funded: 624800,
    gross: 21868,
    clawback: 3100,
    ppi: 5310,
    rate: "3.50%",
    status: "Review",
  },
  {
    broker: "Loansmart",
    funded: 47000,
    gross: 1645,
    clawback: 0,
    ppi: 1702,
    rate: "3.50%",
    status: "Ready",
  },
  {
    broker: "Platinum Finance",
    funded: 38600,
    gross: 1351,
    clawback: 0,
    ppi: 890,
    rate: "3.50%",
    status: "Ready",
  },
];
const rates = [
  [
    "The Lending People",
    "Amount funded",
    "$1m / $1.5m",
    "3.50% / 3.75% / 4.00%",
    "35%",
    "01 Apr 2026",
    "31 Mar 2027",
  ],
  [
    "LoanPlace",
    "Amount funded",
    "$1m / $1.5m",
    "3.50% / 4.10% / 5.00%",
    "35%",
    "01 Apr 2026",
    "31 Mar 2027",
  ],
  [
    "Loansmart",
    "Amount funded",
    "—",
    "3.50%",
    "35%",
    "01 Apr 2026",
    "31 Mar 2027",
  ],
];
const salesforcePartners = [
  ["LoanPlace", "LoanPlace", "", "", "", "", "4,480 funded"],
  ["The Lending People", "The Lending People", "", "", "", "", "2,943 funded"],
  ["Loansmart", "Loansmart", "", "", "", "", "1,114 funded"],
  ["Learning People", "Learning People", "", "", "", "", "151 funded"],
  ["One Partner", "One Partner", "", "", "", "", "120 funded"],
  ["Platinum Finance", "Platinum Finance", "", "", "", "", "75 funded"],
  ["Max Loans", "Max Loans", "", "", "", "", "65 funded"],
  ["FinGate", "FinGate", "", "", "", "", "56 funded"],
  ["East Bay Finance", "East Bay Finance", "", "", "", "", "55 funded"],
  ["CosMediTour", "CosMediTour", "", "", "", "", "15 funded"],
  ["The Lending Room", "The Lending Room", "", "", "", "", "15 funded"],
  ["Lenny", "Lenny", "", "", "", "", "11 funded"],
  ["Tyre World", "Tyre World", "", "", "", "", "11 funded"],
  ["Car Culture", "Car Culture", "", "", "", "", "8 funded"],
  ["LRU", "LRU", "", "", "", "", "6 funded"],
  ["NZ Beauty School", "NZ Beauty School", "", "", "", "", "5 funded"],
  ["MatchMe Money", "MatchMe Money", "", "", "", "", "4 funded"],
  ["LoanOptions", "LoanOptions", "", "", "", "", "2 funded"],
  ["Lendable", "Lendable", "", "", "", "", "1 funded"],
  [
    "Simply Cremations TGA LTD",
    "Simply Cremations TGA LTD",
    "",
    "",
    "",
    "",
    "1 funded",
  ],
  [
    "Beauty Butler Co., Ltd.",
    "Beauty Butler Co., Ltd.",
    "",
    "",
    "",
    "",
    "0 funded",
  ],
  ["Fyn", "Fyn", "", "", "", "", "0 funded"],
  ["Nomu Finance", "Nomu Finance", "", "", "", "", "0 funded"],
  ["Pinnacle Cover Ltd", "Pinnacle Cover Ltd", "", "", "", "", "0 funded"],
  [
    "Three Pillars Finance",
    "Three Pillars Finance",
    "",
    "",
    "",
    "",
    "0 funded",
  ],
];
salesforcePartners[3][6] = "151 funded · SEPARATE BROKER";
salesforcePartners[5][6] = "75 funded · NEW BROKER";
salesforcePartners[7][6] = "56 funded · CONFIRMED";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(n);
const defaultRates: Record<string, number> = {
  "The Lending People": 0.035,
  LoanPlace: 0.035,
  Loansmart: 0.035,
  "Platinum Finance": 0.035,
};
let activeRates = defaultRates;
const defaultFrequencies: Record<string, "Monthly" | "Weekly"> = {
  "The Lending People": "Monthly",
  LoanPlace: "Weekly",
  Loansmart: "Monthly",
  "Platinum Finance": "Monthly",
};
let activeFrequencies = defaultFrequencies;
let activeHistoricalVolumes: Record<string, number> = {};
function historicalCommissionRate(
  broker: string,
  fundingDate: string,
  fallbackBase: number,
) {
  const key = `${String(fundingDate || "").slice(0, 7)}|${broker.trim()}`;
  const funded = activeHistoricalVolumes[key];
  return funded === undefined
    ? monthlyCommissionRate(broker, fallbackBase)
    : monthlyCommissionRate(broker, funded);
}
function monthlyCommissionRate(broker: string, funded: number) {
  if (
    activeRates[broker] !== undefined &&
    !["The Lending People", "LoanPlace"].includes(broker)
  )
    return activeRates[broker];
  if (broker === "The Lending People")
    return funded >= 1500000 ? 0.04 : funded >= 1000000 ? 0.0375 : 0.035;
  if (broker === "LoanPlace") return funded > 1500000 ? 0.041 : 0.035;
  if (broker === "Loansmart") return 0.035;
  if (broker === "Platinum Finance") return 0.035;
  return 0;
}
let currentOverviewBrokers: Array<{ broker: string; clawback: number }> = [];
let currentOverviewMonth = "";
let currentFundedLoans = "—";

export default function Home() {
  const [month, setMonth] = useState(months[0]);
  const [liveRows, setLiveRows] = useState<Array<{
    broker: string;
    funded_loans: string;
    funded_amount: string;
    broker_fees: string;
  }> | null>(null);
  const [clawbackRows, setClawbackRows] = useState<Array<{
    broker: string;
    funding_date: string;
    paid_off_date: string;
    commission_base: string;
  }> | null>(null);
  const [bqError, setBqError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [rateOverrides, setRateOverrides] =
    useState<Record<string, number>>(defaultRates);
  const [frequencyOverrides, setFrequencyOverrides] =
    useState(defaultFrequencies);
  const [historicalVolumes, setHistoricalVolumes] = useState<
    Record<string, number>
  >({});
  const [liveExceptions, setLiveExceptions] = useState<
    Array<{ control: string; count: number; severity: string }>
  >([]);
  activeFrequencies = frequencyOverrides;
  activeHistoricalVolumes = historicalVolumes;
  activeRates = rateOverrides;
  useEffect(() => {
    try {
      const saved = localStorage.getItem("commission-rate-overrides");
      if (saved) setRateOverrides({ ...defaultRates, ...JSON.parse(saved) });
      const savedFrequencies = localStorage.getItem(
        "commission-payment-frequencies",
      );
      if (savedFrequencies)
        setFrequencyOverrides({
          ...defaultFrequencies,
          ...JSON.parse(savedFrequencies),
        });
    } catch {}
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBqError("");
    setLiveRows(null);
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-commission?month_end=${encodeURIComponent(new Date(month).toISOString().slice(0, 10))}`,
    )
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.message || "BigQuery request failed");
        return body;
      })
      .then((body) => {
        if (!cancelled) setLiveRows(body.rows || []);
      })
      .catch((error) => {
        if (!cancelled)
          setBqError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);
  useEffect(() => {
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-clawbacks",
    )
      .then((r) => r.json())
      .then((body) => setClawbackRows(body.rows || []))
      .catch(() => setClawbackRows([]));
  }, []);
  useEffect(() => {
    const monthEnd = new Date().toISOString().slice(0, 10);
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-trends?month_end=${monthEnd}`,
    )
      .then((r) => r.json())
      .then((body) => {
        const next: Record<string, number> = {};
        for (const row of body.rows || [])
          next[
            `${String(row.month_start).slice(0, 7)}|${String(row.broker).trim()}`
          ] = Number(row.funded_base) || 0;
        setHistoricalVolumes(next);
      })
      .catch(() => setHistoricalVolumes({}));
  }, []);
  useEffect(() => {
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-exceptions?month_end=${encodeURIComponent(new Date(month).toISOString().slice(0, 10))}`,
    )
      .then((r) => r.json())
      .then((body) => setLiveExceptions(body.rows || []))
      .catch(() => setLiveExceptions([]));
  }, [month]);
  const selectedMonthKey = new Date(month).toISOString().slice(0, 7);
  const currentBrokers =
    liveRows !== null
      ? liveRows.map((x) => {
          const broker = x.broker || "Direct";
          const funded = Number(x.funded_amount) || 0;
          const rate = monthlyCommissionRate(broker, funded);
          const clawback = (clawbackRows || [])
            .filter(
              (c) =>
                c.broker === broker &&
                c.paid_off_date?.slice(0, 7) === selectedMonthKey,
            )
            .reduce(
              (sum, c) =>
                sum +
                (Number(c.commission_base) || 0) *
                  historicalCommissionRate(
                    c.broker,
                    c.funding_date,
                    Number(c.commission_base) || 0,
                  ),
              0,
            );
          return {
            broker,
            funded,
            loans: Number(x.funded_loans) || 0,
            gross: funded * rate,
            clawback,
            ppi: 0,
            rate: `${(rate * 100).toFixed(2)}% monthly`,
            status: "Live",
          };
        })
      : brokers.map((x) => ({ ...x, loans: 0 }));
  currentOverviewBrokers = currentBrokers;
  currentOverviewMonth = month;
  const filtered = useMemo(
    () =>
      currentBrokers.filter((x) =>
        x.broker.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, liveRows],
  );
  const totals = currentBrokers.reduce(
    (a, x) => ({
      funded: a.funded + x.funded,
      loans: a.loans + x.loans,
      gross: a.gross + x.gross,
      clawback: a.clawback + x.clawback,
      ppi: a.ppi + x.ppi,
    }),
    { funded: 0, loans: 0, gross: 0, clawback: 0, ppi: 0 },
  );
  const net = totals.gross - totals.clawback + totals.ppi;
  currentFundedLoans = liveRows ? totals.loans.toLocaleString("en-NZ") : "—";
  const exportCsv = () => {
    const csv = [
      "Broker,Funded amount,Gross commission,Clawbacks,PPI commission",
      ...currentBrokers.map((x) =>
        [x.broker, x.funded, x.gross, x.clawback, x.ppi].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `commission-${month}.csv`;
    a.click();
  };
  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="mark">
            <img src="/nectar-humming.png" alt="" />
          </span>
          <span>Nectar Finance</span>
          <small>OPERATIONS / COMMISSION CONTROL</small>
        </div>
        <div className="top-actions">
          <span className="sync">
            <i /> Reference mode · 07 Aug 2026
          </span>
          <button className="ghost" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="primary">Refresh model</button>
        </div>
      </header>
      <div className="shell">
        <aside>
          <div className="eyebrow">Broker commission</div>
          <h1>
            Broker commission
            <br />
            <em>dashboard.</em>
          </h1>
          <p className="intro">
            A transparent view of funded lending, partner rates and draft
            invoice readiness.
          </p>
          <nav>
            {[
              "Overview",
              "Analytics",
              "Weekly detail",
              "Monthly detail",
              "Commission rates",
              "Invoice export",
              "Underlying data",
            ].map((x) => (
              <button
                key={x}
                className={tab === x ? "active" : ""}
                onClick={() => setTab(x)}
              >
                <span className="nav-dot" />
                {x}
              </button>
            ))}
          </nav>
          <div className="side-note">
            <strong>Model status</strong>
            <div className="status review">LIVE BQ</div>
            <p>
              Selected-month figures are refreshed from the Salesforce
              applications table in BigQuery.
            </p>
          </div>
        </aside>
        <section className="content">
          <div className="crumb">
            COMMISSION CONTROL <span>/</span> {tab.toUpperCase()}
          </div>
          <div className="title-row">
            <div>
              <h2>{tab}</h2>
              <p className="sub">
                Month-end outputs and audit controls for the selected close.
              </p>
            </div>
            <label className="month">
              MONTH-END
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {months.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="audit">
            <span>
              <i />{" "}
              {loading
                ? "Refreshing BigQuery data…"
                : liveRows
                  ? "Live BigQuery data active"
                  : "Reference dataset active"}
            </span>
            <span>
              Source: <b>genesis__Applications__c</b>
            </span>
            <span>
              Query timestamp:{" "}
              <b>{liveRows ? "Current request" : "Not available"}</b>
            </span>
            <span>
              Selected close: <b>{month}</b>
            </span>
          </div>
          {bqError && (
            <div className="error-banner">
              BigQuery refresh unavailable: {bqError}. Configure the
              service-account secrets to replace reference data.
            </div>
          )}
          {tab === "Overview" && (
            <>
              <div className="cards">
                <Metric
                  label="Funded loans"
                  value="486"
                  note="Selected month from BQ"
                />
                <Metric
                  label="Total funded"
                  value={fmt(totals.funded)}
                  note="Direct included when partner is blank"
                />
                <Metric
                  label="Gross commission"
                  value={fmt(totals.gross)}
                  note="From BQ broker fee"
                />
                <Metric
                  label="Total clawbacks"
                  value={fmt(totals.clawback)}
                  note="Eligibility review pending"
                />
                <Metric
                  label="Net payable"
                  value={fmt(net)}
                  note="Before GST & fees"
                />
                <Metric
                  label="Exceptions"
                  value="2"
                  note="BQ controls requiring review"
                  alert
                />
              </div>
              <div className="grid two">
                <Panel title="Commission by broker" action="View calculations">
                  <div className="bar-list">
                    {filtered.map((x) => (
                      <div className="bar-row" key={x.broker}>
                        <div className="bar-label">
                          <span>{x.broker}</span>
                          <b>{fmt(x.gross)}</b>
                        </div>
                        <div className="track">
                          <i
                            style={{
                              width: `${Math.max(12, (x.gross / totals.gross) * 100)}%`,
                            }}
                          />
                        </div>
                        <small>
                          {fmt(x.funded)} funded · {x.rate}
                        </small>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Trend by month" action="3 closes">
                  <div className="chart">
                    <div className="chart-labels">
                      <span>Apr</span>
                      <span>May</span>
                      <span>Jun</span>
                    </div>
                    <div className="bars">
                      <i style={{ height: "48%" }} />
                      <i style={{ height: "71%" }} />
                      <i className="selected" style={{ height: "92%" }} />
                    </div>
                    <div className="chart-foot">
                      <b>{fmt(totals.funded)}</b>
                      <span>selected month funded amount</span>
                    </div>
                  </div>
                </Panel>
              </div>
              <div className="grid two lower">
                <Panel title="Exceptions" action="2 open">
                  <table>
                    <thead>
                      <tr>
                        <th>Control</th>
                        <th>Count</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Missing broker mapping</td>
                        <td>0</td>
                        <td>
                          <Badge type="review">Resolved as Direct</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>Missing broker fee</td>
                        <td>1</td>
                        <td>
                          <Badge type="review">Review</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>Previous application/contract</td>
                        <td>430</td>
                        <td>
                          <Badge type="review">Clawback review</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>Duplicate application</td>
                        <td>0</td>
                        <td>
                          <Badge type="review">Clear</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Panel>
                <Panel title="Reconciliation" action="BigQuery source">
                  <div className="recon">
                    <div>
                      <span>Funded amount</span>
                      <b>{fmt(totals.funded)}</b>
                      <em>Selected month refreshed from BigQuery</em>
                    </div>
                    <div>
                      <span>Commission total</span>
                      <b>{fmt(totals.gross)}</b>
                      <em className="green">Broker fees loaded from BQ</em>
                    </div>
                    <div className="model-line">
                      <span>Overall model status</span>
                      <strong>REVIEW</strong>
                    </div>
                  </div>
                </Panel>
              </div>
            </>
          )}
          {tab === "Overview" && (
            <>
              <LiveTrend month={month} />
              <LiveExceptions rows={liveExceptions} />
            </>
          )}
          {tab === "Commission rates" && (
            <RateEditor
              rates={rateOverrides}
              setRates={setRateOverrides}
              frequencies={frequencyOverrides}
              setFrequencies={setFrequencyOverrides}
            />
          )}
          {tab === "Broker details" && (
            <DataTable
              title="Salesforce partner mappings"
              month={month}
              search={search}
              setSearch={setSearch}
              headers={[
                "Broker name",
                "Salesforce partner name",
                "Contact name",
                "Email",
                "Xero contact ID",
                "GST status",
                "BQ funded activity",
              ]}
              rows={salesforcePartners}
            />
          )}
          {tab === "Invoice export" && (
            <InvoiceExport
              month={month}
              brokers={currentBrokers}
              clawbackRows={clawbackRows || []}
            />
          )}
          {tab === "Underlying data" && <UnderlyingData month={month} />}
          {tab !== "Overview" &&
            ![
              "Commission rates",
              "Broker details",
              "Invoice export",
              "Underlying data",
            ].includes(tab) && (
              <DataTable
                title={tab}
                month={month}
                search={search}
                setSearch={setSearch}
                headers={[
                  "Application ID",
                  "Broker",
                  "Funding month",
                  "Amount funded",
                  "Rate",
                  "Gross commission",
                  "Clawback",
                  "Status",
                ]}
                rows={[
                  [
                    "APP-0000346017",
                    "The Lending People",
                    month,
                    "$25,000",
                    "3.50%",
                    "$875",
                    "$0",
                    "Ready",
                  ],
                  [
                    "APP-0000344847",
                    "LoanPlace",
                    month,
                    "$3,500",
                    "3.50%",
                    "$123",
                    "$0",
                    "Ready",
                  ],
                  [
                    "APP-0000347298",
                    "Loansmart",
                    month,
                    "$10,000",
                    "3.50%",
                    "$350",
                    "$0",
                    "Review",
                  ],
                ]}
              />
            )}
          <footer>
            <span>
              Calculation rules: funded only · effective-dated rates · NZ GST
              treatment
            </span>
            <span>Draft invoice mode · no Xero writes</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
function LiveExceptions({
  rows,
}: {
  rows: Array<{ control: string; count: number; severity: string }>;
}) {
  const open = rows.filter((x) => x.count > 0).length;
  return (
    <Panel title="Live exceptions" action={`${open} open`}>
      <table>
        <thead>
          <tr>
            <th>Control</th>
            <th>Count</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.control}>
              <td>{x.control}</td>
              <td>{x.count}</td>
              <td>
                <Badge type={x.count > 0 ? "review" : "review"}>
                  {x.severity}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sub">
        Selected month from BigQuery. Blank partner names are classified as
        Direct.
      </p>
    </Panel>
  );
}
function LiveTrend({ month }: { month: string }) {
  const [rows, setRows] = useState<
    Array<{ month_start: string; funded_base: string }>
  >([]);
  useEffect(() => {
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-trends?month_end=${encodeURIComponent(new Date(month).toISOString().slice(0, 10))}`,
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, [month]);
  const months = Array.from(new Set(rows.map((x) => x.month_start.slice(0, 7))))
    .sort()
    .slice(-3);
  const values = months.map((key) =>
    rows
      .filter((x) => x.month_start.slice(0, 7) === key)
      .reduce((sum, x) => sum + (Number(x.funded_base) || 0), 0),
  );
  const max = Math.max(...values, 1);
  return (
    <Panel title="Trend by month" action="Live BigQuery">
      <div className="chart">
        <div className="chart-labels">
          {months.map((key) => (
            <span key={key}>
              {new Date(`${key}-01T00:00:00Z`).toLocaleString("en-NZ", {
                month: "short",
              })}
            </span>
          ))}
        </div>
        <div className="bars">
          {values.map((value, i) => (
            <i
              key={months[i]}
              className={i === values.length - 1 ? "selected" : undefined}
              style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
            />
          ))}
        </div>
        <div className="chart-foot">
          <b>{fmt(values[values.length - 1] || 0)}</b>
          <span>selected month funded amount</span>
        </div>
      </div>
    </Panel>
  );
}
function RateEditor({
  rates,
  setRates,
  frequencies,
  setFrequencies,
}: {
  rates: Record<string, number>;
  setRates: (x: Record<string, number>) => void;
  frequencies: Record<string, "Monthly" | "Weekly">;
  setFrequencies: (x: Record<string, "Monthly" | "Weekly">) => void;
}) {
  const brokers = [
    "The Lending People",
    "LoanPlace",
    "Loansmart",
    "Platinum Finance",
  ];
  const [effectiveDates, setEffectiveDates] = useState<Record<string, string>>({
    "The Lending People": "2026-01-01",
    LoanPlace: "2026-01-01",
    Loansmart: "2026-01-01",
    "Platinum Finance": "2026-01-01",
  });
  const save = (broker: string, value: string) => {
    const next = { ...rates, [broker]: Math.max(0, Number(value) / 100) };
    setRates(next);
    localStorage.setItem("commission-rate-overrides", JSON.stringify(next));
  };
  const saveDate = (broker: string, value: string) => {
    const next = { ...effectiveDates, [broker]: value };
    setEffectiveDates(next);
    localStorage.setItem(
      "commission-rate-effective-dates",
      JSON.stringify(next),
    );
  };
  const saveFrequency = (broker: string, value: "Monthly" | "Weekly") => {
    const next = { ...frequencies, [broker]: value };
    setFrequencies(next);
    localStorage.setItem(
      "commission-payment-frequencies",
      JSON.stringify(next),
    );
  };
  return (
    <Panel
      title="Effective-dated commission rates"
      action="Used in calculations"
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Broker</th>
              <th>Rate</th>
              <th>Effective from</th>
              <th>Payment frequency</th>
              <th>Calculation status</th>
            </tr>
          </thead>
          <tbody>
            {brokers.map((b) => (
              <tr key={b}>
                <td>{b}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={(rates[b] * 100).toFixed(2)}
                    onChange={(e) => save(b, e.target.value)}
                  />
                  %
                </td>
                <td>
                  <input
                    type="date"
                    value={effectiveDates[b]}
                    onChange={(e) => saveDate(b, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={frequencies[b]}
                    onChange={(e) =>
                      saveFrequency(b, e.target.value as "Monthly" | "Weekly")
                    }
                  >
                    <option>Monthly</option>
                    <option>Weekly</option>
                  </select>
                </td>
                <td>
                  {frequencies[b] === "Weekly"
                    ? "Monday–Sunday; monthly tier true-up"
                    : "Monthly target calculation"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub">
        LoanPlace defaults to weekly. Weekly payments use Monday–Sunday periods
        and reconcile to the monthly tier calculation at month-end.
      </p>
    </Panel>
  );
}
function ExceptionManager({ month }: { month: string }) {
  const [rows, setRows] = useState<
    Array<{
      application: string;
      contract: string;
      broker: string;
      funding_date: string;
      paid_off_date: string;
      days_to_paid_off: string;
      commission_base: string;
    }>
  >([]);
  useEffect(() => {
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-clawbacks",
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, []);
  const selectedMonthKey = new Date(month).toISOString().slice(0, 7);
  const selectedRows = rows.filter(
    (x) => x.paid_off_date?.slice(0, 7) === selectedMonthKey,
  );
  const rate = (broker: string, fundingDate: string, base: number) =>
    historicalCommissionRate(broker, fundingDate, base);
  const grouped = selectedRows.reduce<
    Record<
      string,
      {
        broker: string;
        month: string;
        count: number;
        base: number;
        clawback: number;
      }
    >
  >((a, x) => {
    const key = x.broker;
    const base = Number(x.commission_base) || 0;
    const item = a[key] || {
      broker: x.broker,
      month: selectedMonthKey,
      count: 0,
      base: 0,
      clawback: 0,
    };
    item.count++;
    item.base += base;
    item.clawback += base * rate(x.broker, x.funding_date, base);
    a[key] = item;
    return a;
  }, {});
  const total = Object.values(grouped).reduce((sum, x) => sum + x.clawback, 0);
  return (
    <Panel title={`Potential clawbacks · ${month}`} action="Live BigQuery">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Broker</th>
              <th>Eligible loans</th>
              <th>Commission base</th>
              <th>Potential clawback</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(grouped).map((x) => (
              <tr key={x.broker}>
                <td>{x.broker}</td>
                <td>{x.count}</td>
                <td>{fmt(x.base)}</td>
                <td>{fmt(x.clawback)}</td>
              </tr>
            ))}
            <tr>
              <th>Total</th>
              <th>{selectedRows.length}</th>
              <th>
                {fmt(
                  selectedRows.reduce(
                    (sum, x) => sum + (Number(x.commission_base) || 0),
                    0,
                  ),
                )}
              </th>
              <th>{fmt(total)}</th>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sub">
        Selected month only. Eligibility: paid-off date minus contract created
        date is under 182.5 days, and the original loan has a partner. Potential
        clawbacks are separate and not netted against commission.
      </p>
    </Panel>
  );
}
function ExceptionManagerInput({ month }: { month: string }) {
  return (
    <Panel title={`Exception notes · ${month}`} action="Browser saved">
      <p className="sub">
        Use the detail review workflow here for ownership, resolution, and
        waiver notes.
      </p>
    </Panel>
  );
}
function BrokerClawbackSummary({
  brokers,
}: {
  brokers: Array<{ broker: string; clawback: number }>;
}) {
  const total = brokers.reduce((sum, x) => sum + x.clawback, 0);
  return (
    <Panel title="Clawback by broker" action="Separate from commission">
      <div className="bar-list">
        {brokers.map((x) => (
          <div className="bar-row" key={`clawback-${x.broker}`}>
            <div className="bar-label">
              <span>{x.broker}</span>
              <b>{fmt(x.clawback)}</b>
            </div>
            <div className="track">
              <i
                style={{
                  width: `${total ? Math.max(12, (x.clawback / total) * 100) : 12}%`,
                }}
              />
            </div>
            <small>Potential clawback · not netted off</small>
          </div>
        ))}
      </div>
      <div className="chart-foot">
        <b>{fmt(total)}</b>
        <span>selected month potential clawback</span>
      </div>
    </Panel>
  );
}
function InvoiceExport({
  month,
  brokers,
  clawbackRows,
}: {
  month: string;
  brokers: Array<{
    broker: string;
    funded: number;
    gross: number;
    clawback: number;
    ppi: number;
  }>;
  clawbackRows: Array<{
    broker: string;
    funding_date: string;
    paid_off_date: string;
    commission_base: string;
  }>;
}) {
  brokers = brokers.filter((x) => x.broker !== "Direct");
  const [weeklyRows, setWeeklyRows] = useState<
    Array<{
      broker: string;
      week_start: string;
      funded_loans: string;
      funded_base: string;
    }>
  >([]);
  const [waiverRows, setWaiverRows] = useState<
    Array<{ broker: string; funding_date: string; waiver_commission: string }>
  >([]);
  useEffect(() => {
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-weekly?month_end=${encodeURIComponent(new Date(month).toISOString().slice(0, 10))}`,
    )
      .then((r) => r.json())
      .then((x) => setWeeklyRows(x.rows || []))
      .catch(() => setWeeklyRows([]));
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-waiver",
    )
      .then((r) => r.json())
      .then((x) => setWaiverRows(x.rows || []))
      .catch(() => setWaiverRows([]));
  }, [month]);
  const monthKey = new Date(month).toISOString().slice(0, 7);
  const periodRows = useMemo(() => {
    const out: Array<{
      broker: string;
      period: string;
      description: string;
      commission: number;
      clawback: number;
      waiver: number;
    }> = [];
    const weeklyBrokers = new Set(
      Object.entries(activeFrequencies)
        .filter(([, f]) => f === "Weekly")
        .map(([b]) => b),
    );
    weeklyRows
      .filter((x) => weeklyBrokers.has(x.broker))
      .forEach((x) => {
        const start = new Date(`${x.week_start}T00:00:00Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 6);
        const endKey = end.toISOString().slice(0, 10);
        const commission =
          (Number(x.funded_base) || 0) *
          monthlyCommissionRate(x.broker, Number(x.funded_base) || 0);
        const clawback = clawbackRows
          .filter(
            (c) =>
              c.broker === x.broker &&
              c.paid_off_date >= x.week_start &&
              c.paid_off_date <= endKey,
          )
          .reduce(
            (a, c) =>
              a +
              (Number(c.commission_base) || 0) *
                historicalCommissionRate(c.broker, c.funding_date, Number(c.commission_base) || 0),
            0,
          );
        const waiver = waiverRows
          .filter(
            (w) =>
              w.broker === x.broker &&
              w.funding_date >= x.week_start &&
              w.funding_date <= endKey,
          )
          .reduce((a, w) => a + (Number(w.waiver_commission) || 0), 0);
        out.push({
          broker: x.broker,
          period: x.week_start,
          description: `Weekly commission · ${x.week_start} to ${endKey}`,
          commission,
          clawback,
          waiver,
        });
      });
    brokers
      .filter((x) => !weeklyBrokers.has(x.broker))
      .forEach((x) => {
        const clawback = clawbackRows
          .filter(
            (c) =>
              c.broker === x.broker && c.paid_off_date?.slice(0, 7) === monthKey,
          )
          .reduce(
            (a, c) =>
              a +
              (Number(c.commission_base) || 0) *
                historicalCommissionRate(c.broker, c.funding_date, Number(c.commission_base) || 0),
            0,
          );
        const waiver = waiverRows
          .filter(
            (w) =>
              w.broker === x.broker && w.funding_date?.slice(0, 7) === monthKey,
          )
          .reduce((a, w) => a + (Number(w.waiver_commission) || 0), 0);
        out.push({
          broker: x.broker,
          period: month,
          description: `Monthly commission · ${month}`,
          commission: x.gross,
          clawback,
          waiver,
        });
      });
    return out;
  }, [month, monthKey, weeklyRows, waiverRows, clawbackRows, brokers]);
  const subtotal = (x: (typeof periodRows)[number]) => x.commission - x.clawback + x.waiver;
  const gst = (x: (typeof periodRows)[number]) => x.waiver * 0.8 * 0.15;
  const grandTotal = (x: (typeof periodRows)[number]) => subtotal(x) + gst(x);
  const exportCsv = () => {
    const csv = [
      "Broker,Period,Description,Commission,Clawback,NRW commission,Subtotal,GST,Grand total",
      ...periodRows.map((x) =>
        [
          x.broker,
          x.period,
          x.description,
          x.commission,
          x.clawback,
          x.waiver,
          subtotal(x),
          gst(x),
          grandTotal(x),
        ].join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `invoice-export-${monthKey}.csv`;
    a.click();
  };
  return (
    <Panel title="Draft invoice export" action="Export CSV">
      <div className="table-tools">
        <input placeholder="Filter rows..." />
        <button className="save" onClick={exportCsv}>
          Export calculated CSV
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Broker</th>
              <th>Payment period</th>
              <th>Description</th>
              <th>Commission</th>
              <th>Clawback</th>
              <th>NRW commission</th>
              <th>Subtotal</th>
              <th>GST</th>
              <th>Grand total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {periodRows.map((x) => (
              <tr key={`${x.broker}-${x.period}`}>
                <td>{x.broker}</td>
                <td>{x.period}</td>
                <td>{x.description}</td>
                <td>{fmt(x.commission)}</td>
                <td>{fmt(x.clawback)}</td>
                <td>{fmt(x.waiver)}</td>
                <td>{fmt(subtotal(x))}</td>
                <td>{fmt(gst(x))}</td>
                <td>{fmt(grandTotal(x))}</td>
                <td>
                  <Badge type="draft">Draft</Badge>
                </td>
              </tr>
            ))}
            <tr>
              <th colSpan={3}>Total</th>
              <th>{fmt(periodRows.reduce((a, x) => a + x.commission, 0))}</th>
              <th>{fmt(periodRows.reduce((a, x) => a + x.clawback, 0))}</th>
              <th>{fmt(periodRows.reduce((a, x) => a + x.waiver, 0))}</th>
              <th>
                {fmt(
                  periodRows.reduce((a, x) => a + subtotal(x), 0),
                )}
              </th>
              <th>{fmt(periodRows.reduce((a, x) => a + gst(x), 0))}</th>
              <th>{fmt(periodRows.reduce((a, x) => a + grandTotal(x), 0))}</th>
              <th></th>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sub">
        Weekly rows are shown only for brokers marked Weekly; monthly brokers
        remain one monthly invoice line. GST is 15% of the taxable 80% share
        of NRW waiver commission; the grand total is subtotal plus GST.
      </p>
    </Panel>
  );
}
function WaiverSummary({ weeklyOnly = false }: { weeklyOnly?: boolean }) {
  const [rows, setRows] = useState<
    Array<{ broker: string; funding_date: string; waiver_commission: string }>
  >([]);
  useEffect(() => {
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-waiver",
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, []);
  const key = new Date(currentOverviewMonth).toISOString().slice(0, 7);
  const grouped = rows
    .filter(
      (x) =>
        x.funding_date?.slice(0, 7) === key &&
        (!weeklyOnly || activeFrequencies[x.broker] === "Weekly"),
    )
    .reduce<Record<string, number>>((a, x) => {
      a[x.broker] = (a[x.broker] || 0) + (Number(x.waiver_commission) || 0);
      return a;
    }, {});
  const total = Object.values(grouped).reduce((a, b) => a + b, 0);
  return (
    <Panel title="Waiver commission by broker" action="NRW · 35%">
      <div className="bar-list">
        {Object.entries(grouped).map(([broker, value]) => (
          <div className="bar-row" key={`waiver-${broker}`}>
            <div className="bar-label">
              <span>{broker}</span>
              <b>{fmt(value)}</b>
            </div>
            <small>
              Incremental NRW waiver commission · separate from commission
            </small>
          </div>
        ))}
      </div>
      <div className="chart-foot">
        <b>{fmt(total)}</b>
        <span>selected month waiver commission</span>
      </div>
    </Panel>
  );
}
function WeeklyClawbackDetail() {
  const [rows, setRows] = useState<
    Array<{ broker: string; paid_off_date: string; commission_base: string }>
  >([]);
  useEffect(() => {
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-clawbacks",
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, []);
  const monthKey = new Date(currentOverviewMonth).toISOString().slice(0, 7);
  const grouped = rows
    .filter(
      (x) =>
        x.paid_off_date?.slice(0, 7) === monthKey &&
        activeFrequencies[x.broker] === "Weekly",
    )
    .reduce<
      Record<
        string,
        { week: string; broker: string; amount: number; count: number }
      >
    >((a, x) => {
      const d = new Date(`${x.paid_off_date}T00:00:00Z`);
      const monday = new Date(d);
      const day = monday.getUTCDay() || 7;
      monday.setUTCDate(monday.getUTCDate() - day + 1);
      const week = monday.toISOString().slice(0, 10);
      const key = `${week}-${x.broker}`;
      const item = a[key] || { week, broker: x.broker, amount: 0, count: 0 };
      item.amount +=
        (Number(x.commission_base) || 0) *
        historicalCommissionRate(
          x.broker,
          x.funding_date,
          Number(x.commission_base) || 0,
        );
      item.count++;
      a[key] = item;
      return a;
    }, {});
  const total = Object.values(grouped).reduce((a, x) => a + x.amount, 0);
  return (
    <Panel title="Weekly clawbacks" action="Closed-date basis">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Week commencing</th>
              <th>Week ending</th>
              <th>Broker</th>
              <th>Eligible loans</th>
              <th>Clawback</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(grouped).map((x) => {
              const end = new Date(`${x.week}T00:00:00Z`);
              end.setUTCDate(end.getUTCDate() + 6);
              return (
                <tr key={`${x.week}-${x.broker}`}>
                  <td>{x.week}</td>
                  <td>{end.toISOString().slice(0, 10)}</td>
                  <td>{x.broker}</td>
                  <td>{x.count}</td>
                  <td>{fmt(x.amount)}</td>
                </tr>
              );
            })}
            <tr>
              <th colSpan={4}>Weekly total</th>
              <th>{fmt(total)}</th>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sub">
        Clawbacks are assigned to the Monday–Sunday week containing the loan
        paid-off date. Only Weekly brokers are shown.
      </p>
    </Panel>
  );
}
function WeeklyWaiverDetail() {
  const [rows, setRows] = useState<
    Array<{
      broker: string;
      funding_date: string;
      waiver_commission: string;
      total_payable: string;
      taxable_commission_80: string;
      non_taxable_commission_20: string;
    }>
  >([]);
  useEffect(() => {
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-waiver",
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, []);
  const monthKey = new Date(currentOverviewMonth).toISOString().slice(0, 7);
  const grouped = rows
    .filter(
      (x) =>
        x.funding_date?.slice(0, 7) === monthKey &&
        activeFrequencies[x.broker] === "Weekly",
    )
    .reduce<Record<string, { week: string; broker: string; amount: number }>>(
      (a, x) => {
        const d = new Date(`${x.funding_date}T00:00:00Z`);
        const monday = new Date(d);
        const day = monday.getUTCDay() || 7;
        monday.setUTCDate(monday.getUTCDate() - day + 1);
        const week = monday.toISOString().slice(0, 10);
        const key = `${week}-${x.broker}`;
        const item = a[key] || {
          week,
          broker: x.broker,
          amount: 0,
          total: 0,
          taxable: 0,
          nonTaxable: 0,
        };
        item.amount += Number(x.waiver_commission) || 0;
        item.total += Number(x.total_payable) || 0;
        item.taxable += Number(x.taxable_commission_80) || 0;
        item.nonTaxable += Number(x.non_taxable_commission_20) || 0;
        a[key] = item;
        return a;
      },
      {},
    );
  const total = Object.values(grouped).reduce((a, x) => a + x.amount, 0);
  const totalPayable = Object.values(grouped).reduce((a, x) => a + x.total, 0);
  const taxable = Object.values(grouped).reduce((a, x) => a + x.taxable, 0);
  const nonTaxable = Object.values(grouped).reduce(
    (a, x) => a + x.nonTaxable,
    0,
  );
  const revGrossUp = totalPayable - nonTaxable;
  return (
    <Panel title="Weekly waiver commission" action="NRW · 35%">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Week commencing</th>
              <th>Week ending</th>
              <th>Broker</th>
              <th>Waiver commission</th>
              <th>Rev Gross up of GST</th>
              <th>Gross up GST</th>
              <th>Net payable</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(grouped).map((x) => {
              const end = new Date(`${x.week}T00:00:00Z`);
              end.setUTCDate(end.getUTCDate() + 6);
              return (
                <tr key={`${x.week}-${x.broker}`}>
                  <td>{x.week}</td>
                  <td>{end.toISOString().slice(0, 10)}</td>
                  <td>{x.broker}</td>
                  <td>{fmt(x.total)}</td>
                  <td>({fmt(x.total - x.nonTaxable)})</td>
                  <td>{fmt(x.taxable)}</td>
                  <td>{fmt(x.amount)}</td>
                </tr>
              );
            })}
            <tr>
              <th colSpan={3}>Weekly total</th>
              <th>{fmt(totalPayable)}</th>
              <th>({fmt(totalPayable - nonTaxable)})</th>
              <th>{fmt(taxable)}</th>
              <th>{fmt(total)}</th>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sub">Monday–Sunday breakdown for brokers marked Weekly.</p>
    </Panel>
  );
}
function Metric({
  label,
  value,
  note,
  alert,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={alert ? "alert" : undefined}>
        {label === "Funded loans" ? currentFundedLoans : value}
      </strong>
      <small>{note}</small>
    </div>
  );
}
function Badge({
  type,
  children,
}: {
  type: string;
  children: React.ReactNode;
}) {
  return <span className={`badge ${type}`}>{children}</span>;
}
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <button>{action} ↗</button>
      </div>
      {children}
      {title === "Commission by broker" && (
        <>
          <BrokerClawbackSummary brokers={currentOverviewBrokers} />
          <WaiverSummary />
        </>
      )}
      {(title.startsWith("Weekly detail") ||
        title.startsWith("Weekly broker commission")) && (
        <>
          <WeeklyClawbackDetail />
          <WeeklyWaiverDetail />
        </>
      )}
    </div>
  );
}
function WeeklyDetail({ month }: { month: string }) {
  const [rows, setRows] = useState<
    Array<{
      broker: string;
      week_start: string;
      funded_loans: string;
      funded_base: string;
    }>
  >([]);
  const [selectedBroker, setSelectedBroker] = useState("All brokers");
  useEffect(() => {
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-weekly?month_end=${encodeURIComponent(new Date(month).toISOString().slice(0, 10))}`,
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, [month]);
  const weeklyBrokers = Array.from(
    new Set(
      Object.entries(activeFrequencies)
        .filter(([, frequency]) => frequency === "Weekly")
        .map(([broker]) => broker.trim()),
    ),
  ).sort();
  useEffect(() => {
    if (
      selectedBroker !== "All brokers" &&
      !weeklyBrokers.includes(selectedBroker)
    )
      setSelectedBroker("All brokers");
  }, [selectedBroker, weeklyBrokers.join("|")]);
  const weeklyRows = rows.filter(
    (x) =>
      activeFrequencies[x.broker.trim()] === "Weekly" &&
      (selectedBroker === "All brokers" || x.broker.trim() === selectedBroker),
  );
  const total = weeklyRows.reduce(
    (sum, x) =>
      sum +
      (Number(x.funded_base) || 0) *
        monthlyCommissionRate(x.broker, Number(x.funded_base) || 0),
    0,
  );
  return (
    <Panel title={`Weekly broker commission · ${month}`} action="Live BigQuery">
      <div className="table-tools">
        <label>
          Broker{" "}
          <select
            aria-label="Filter weekly detail by broker"
            value={selectedBroker}
            onChange={(e) => setSelectedBroker(e.target.value)}
          >
            <option>All brokers</option>
            {weeklyBrokers.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <span className="sub">
          Showing only brokers marked Weekly in Commission rates.
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Week commencing</th>
              <th>Week ending</th>
              <th>Broker</th>
              <th>Funded loans</th>
              <th>Funded base</th>
              <th>Commission</th>
            </tr>
          </thead>
          <tbody>
            {weeklyRows.map((x) => {
              const start = new Date(`${x.week_start}T00:00:00Z`);
              const end = new Date(start);
              end.setUTCDate(end.getUTCDate() + 6);
              const base = Number(x.funded_base) || 0;
              return (
                <tr key={`${x.week_start}-${x.broker}`}>
                  <td>{x.week_start}</td>
                  <td>{end.toISOString().slice(0, 10)}</td>
                  <td>{x.broker}</td>
                  <td>{x.funded_loans}</td>
                  <td>{fmt(base)}</td>
                  <td>{fmt(base * monthlyCommissionRate(x.broker, base))}</td>
                </tr>
              );
            })}
            <tr>
              <th colSpan={5}>Weekly total</th>
              <th>{fmt(total)}</th>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sub">
        Weeks run Monday–Sunday; monthly target tiers are accumulated through
        the month.
      </p>
    </Panel>
  );
}
function BrokerAnalytics({ month }: { month: string }) {
  const [rows, setRows] = useState<
    Array<{
      broker: string;
      month_start: string;
      funded_loans: string;
      funded_base: string;
    }>
  >([]);
  useEffect(() => {
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-trends?month_end=${encodeURIComponent(new Date(month).toISOString().slice(0, 10))}`,
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
  }, [month]);
  const totals = rows.reduce<
    Record<
      string,
      {
        broker: string;
        months: number;
        base: number;
        commission: number;
        loans: number;
      }
    >
  >((a, x) => {
    const base = Number(x.funded_base) || 0;
    const item = a[x.broker] || {
      broker: x.broker,
      months: 0,
      base: 0,
      commission: 0,
      loans: 0,
    };
    item.months++;
    item.base += base;
    item.commission += base * monthlyCommissionRate(x.broker, base);
    item.loans += Number(x.funded_loans) || 0;
    a[x.broker] = item;
    return a;
  }, {});
  return (
    <Panel title={`Broker trend analysis · ${month}`} action="Live BigQuery">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Broker</th>
              <th>Months</th>
              <th>Funded loans</th>
              <th>Funded base</th>
              <th>Calculated commission</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(totals).map((x) => (
              <tr key={x.broker}>
                <td>{x.broker}</td>
                <td>{x.months}</td>
                <td>{x.loans}</td>
                <td>{fmt(x.base)}</td>
                <td>{fmt(x.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sub">
        Rolling 12-month trend ending at the selected month.
      </p>
    </Panel>
  );
}
function UnderlyingData({ month }: { month: string }) {
  const [broker, setBroker] = useState("All brokers");
  const [week, setWeek] = useState("All weeks");
  const [commissionRows, setCommissionRows] = useState<
    Array<{
      application: string;
      broker: string;
      funding_date: string;
      top_up_amount: string;
      original_loan_amount: string;
      amount_funded: string;
      broker_fee: string;
    }>
  >([]);
  const [clawbackRows, setClawbackRows] = useState<
    Array<{
      application: string;
      contract: string;
      broker: string;
      funding_date: string;
      paid_off_date: string;
      days_to_paid_off: string;
      commission_base: string;
    }>
  >([]);
  const [waiverRows, setWaiverRows] = useState<
    Array<{
      application: string;
      broker: string;
      funding_date: string;
      old_contract: string;
      old_nrw_collected: string;
      new_nrw_premium: string;
      incremental_nrw: string;
      premium_gst_excl: string;
      waiver_commission: string;
      taxable_commission_80: string;
      gst_15: string;
      non_taxable_commission_20: string;
      total_payable: string;
    }>
  >([]);
  useEffect(() => {
    const end = new Date(month).toISOString().slice(0, 10);
    fetch(
      `${API_ORIGIN}/api/broker-underlying?month_end=${encodeURIComponent(end)}`,
    )
      .then((r) => r.json())
      .then((x) => setCommissionRows(x.rows || []))
      .catch(() => setCommissionRows([]));
    fetch(`${API_ORIGIN}/api/broker-clawbacks`)
      .then((r) => r.json())
      .then((x) => setClawbackRows(x.rows || []))
      .catch(() => setClawbackRows([]));
    fetch(`${API_ORIGIN}/api/broker-waiver`)
      .then((r) => r.json())
      .then((x) => setWaiverRows(x.rows || []))
      .catch(() => setWaiverRows([]));
  }, [month]);
  const monthKey = new Date(month).toISOString().slice(0, 7);
  const weeklyBrokers = new Set(
    Object.entries(activeFrequencies)
      .filter(([, frequency]) => frequency === "Weekly")
      .map(([name]) => name.trim()),
  );
  const monday = (date: string) => {
    const d = new Date(`${date}T00:00:00Z`);
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d.toISOString().slice(0, 10);
  };
  const weeks = useMemo(
    () => [
      "All weeks",
      ...Array.from(
        new Set([
          ...commissionRows.map((x) => monday(x.funding_date)),
          ...clawbackRows
            .filter((x) => x.paid_off_date?.slice(0, 7) === monthKey)
            .map((x) => monday(x.paid_off_date)),
          ...waiverRows
            .filter((x) => x.funding_date?.slice(0, 7) === monthKey)
            .map((x) => monday(x.funding_date)),
        ]).filter((name) => name.trim() !== "Direct"),
      )
        .filter((x) => x !== "Invalid Date")
        .sort(),
    ],
    [commissionRows, clawbackRows, waiverRows, monthKey],
  );
  const brokers = useMemo(
    () => [
      "All brokers",
      ...Array.from(
        new Set([
          ...commissionRows.map((x) => x.broker),
          ...clawbackRows.map((x) => x.broker),
          ...waiverRows.map((x) => x.broker),
        ]),
      ).filter((name) => String(name || "").trim() !== "Direct").sort(),
    ],
    [commissionRows, clawbackRows, waiverRows],
  );
  const match = (name: string) =>
    String(name || "").trim() !== "Direct" &&
    (broker === "All brokers" || name.trim() === broker);
  const selectedBrokerIsWeekly =
    broker !== "All brokers" && weeklyBrokers.has(broker.trim());
  const inSelectedWeek = (date: string) => {
    if (week === "All weeks") return true;
    const start = new Date(`${week}T00:00:00Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const dateKey = String(date || "").slice(0, 10);
    return dateKey >= week && dateKey <= end.toISOString().slice(0, 10);
  };
  const matchPeriod = (name: string, date: string) => {
    const isWeekly = weeklyBrokers.has(name.trim());
    return isWeekly
      ? week === "All weeks" || inSelectedWeek(date)
      : date?.slice(0, 7) === monthKey;
  };
  const commissions = commissionRows.filter(
    (x) => match(x.broker) && matchPeriod(x.broker, x.funding_date),
  );
  const clawbacks = clawbackRows.filter(
    (x) =>
      x.paid_off_date?.slice(0, 7) === monthKey &&
      match(x.broker) &&
      matchPeriod(x.broker, x.paid_off_date),
  );
  const waivers = waiverRows.filter(
    (x) =>
      x.funding_date?.slice(0, 7) === monthKey &&
      match(x.broker) &&
      matchPeriod(x.broker, x.funding_date),
  );
  const downloadWorkbook = () => {
    const esc = (v: string) =>
      String(v ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const xmlSheet = (
      name: string,
      headers: string[],
      data: Array<Array<string | number>>,
    ) =>
      `<Worksheet ss:Name="${esc(name)}"><Table><Row>${headers.map((h) => `<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`).join("")}</Row>${data.map((row) => `<Row>${row.map((v) => `<Cell><Data ss:Type="${typeof v === "number" ? "Number" : "String"}">${esc(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet>`;
    const commissionData = commissions.map((x) => [
      x.application,
      x.broker,
      x.funding_date,
      Number(x.top_up_amount) || 0,
      Number(x.original_loan_amount) || 0,
      Number(x.amount_funded) || 0,
      Number(x.broker_fee) || 0,
    ]);
    const clawbackData = clawbacks.map((x) => [
      x.application,
      x.contract,
      x.broker,
      x.funding_date,
      x.paid_off_date,
      Number(x.days_to_paid_off) || 0,
      Number(x.commission_base) || 0,
      historicalCommissionRate(x.broker, x.funding_date, Number(x.commission_base) || 0),
      (Number(x.commission_base) || 0) * historicalCommissionRate(x.broker, x.funding_date, Number(x.commission_base) || 0),
    ]);
    const waiverData = waivers.map((x) => [
      x.application,
      x.broker,
      x.funding_date,
      x.old_contract,
      Number(x.old_nrw_collected) || 0,
      Number(x.new_nrw_premium) || 0,
      Number(x.incremental_nrw) || 0,
      Number(x.waiver_commission) || 0,
    ]);
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${xmlSheet("Commission", ["Application", "Broker", "Funding date", "Top-up amount", "Original loan amount", "Amount funded", "Broker fee"], commissionData)}${xmlSheet("Clawback", ["Application", "Contract", "Broker", "Funding date", "Paid-off date", "Days to paid off", "Commission base", "Historic commission rate", "Calculated clawback"], clawbackData)}${xmlSheet("Waiver commission", ["Application", "Broker", "Funding date", "Old contract", "Old NRW collected", "New NRW premium", "Incremental NRW", "Waiver commission"], waiverData)}</Workbook>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([xml], { type: "application/vnd.ms-excel" }),
    );
    a.download = `underlying-data-${monthKey}${week !== "All weeks" ? `-${week}` : ""}.xls`;
    a.click();
  };
  return (
    <div>
      <div className="table-tools">
        <button className="save" onClick={downloadWorkbook}>
          Download all 3 sheets
        </button>
      </div>
      <div className="table-tools">
        <label>
          Broker{" "}
          <select value={broker} onChange={(e) => setBroker(e.target.value)}>
            {brokers.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Week{" "}
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            {weeks.map((x) => (
              <option key={x} value={x}>
                {x === "All weeks" ? x : `Week commencing ${x}`}
              </option>
            ))}
          </select>
        </label>
        <span className="sub">
          Source: Salesforce tables through BigQuery · selected month: {month}.
          Monthly brokers remain month-restricted; the week filter applies to
          weekly brokers only.
        </span>
      </div>
      <Panel title="Commission underlying data" action="Download CSV">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Broker</th>
                <th>Funding date</th>
                <th>Top-up amount</th>
                <th>Original loan amount</th>
                <th>Amount funded</th>
                <th>Broker fee</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((x) => (
                <tr key={x.application}>
                  <td>{x.application}</td>
                  <td>{x.broker}</td>
                  <td>{x.funding_date}</td>
                  <td>{Number(x.top_up_amount || 0).toFixed(2)}</td>
                  <td>{Number(x.original_loan_amount || 0).toFixed(2)}</td>
                  <td>{Number(x.amount_funded || 0).toFixed(2)}</td>
                  <td>{Number(x.broker_fee || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sub">
          Amount funded uses top-up amount when present; otherwise original loan
          amount. Broker fee is displayed for reconciliation only.
        </p>
      </Panel>
      <Panel title="Clawback underlying data" action="Paid-off month">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Contract</th>
                <th>Broker</th>
                <th>Funding date</th>
                <th>Paid-off date</th>
                <th>Days</th>
                <th>Commission base</th>
                <th>Historic commission rate</th>
                <th>Calculated clawback</th>
              </tr>
            </thead>
            <tbody>
              {clawbacks.map((x) => (
                <tr key={x.application}>
                  <td>{x.application}</td>
                  <td>{x.contract}</td>
                  <td>{x.broker}</td>
                  <td>{x.funding_date}</td>
                  <td>{x.paid_off_date}</td>
                  <td>{x.days_to_paid_off}</td>
                  <td>{Number(x.commission_base || 0).toFixed(2)}</td>
                  <td>{(historicalCommissionRate(x.broker, x.funding_date, Number(x.commission_base) || 0) * 100).toFixed(2)}%</td>
                  <td>{(Number(x.commission_base || 0) * historicalCommissionRate(x.broker, x.funding_date, Number(x.commission_base) || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sub">
          Filtered by paid-off month; weekly brokers can be narrowed by paid-off
          week. The rate is resolved from the loan funding month and the
          calculated clawback equals commission base × historic rate.
        </p>
      </Panel>
      <Panel title="NRW waiver underlying data" action="35% waiver rate">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Application</th>
                <th>Broker</th>
                <th>Funding date</th>
                <th>Old contract</th>
                <th>Old NRW</th>
                <th>New NRW premium</th>
                <th>Incremental NRW</th>
                <th>Waiver commission</th>
              </tr>
            </thead>
            <tbody>
              {waivers.map((x) => (
                <tr key={x.application}>
                  <td>{x.application}</td>
                  <td>{x.broker}</td>
                  <td>{x.funding_date}</td>
                  <td>{x.old_contract || "New application"}</td>
                  <td>{Number(x.old_nrw_collected || 0).toFixed(2)}</td>
                  <td>{Number(x.new_nrw_premium || 0).toFixed(2)}</td>
                  <td>{Number(x.incremental_nrw || 0).toFixed(2)}</td>
                  <td>{Number(x.waiver_commission || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sub">
          Filtered by funding month; weekly brokers can be narrowed by funding
          week. Monthly brokers remain month-only.
        </p>
      </Panel>
    </div>
  );
}
function DataTable({
  title,
  month,
  headers,
  rows,
  search,
  setSearch,
}: {
  title: string;
  month: string;
  headers: string[];
  rows: string[][];
  search: string;
  setSearch: (x: string) => void;
}) {
  if (title === "Weekly detail") return <WeeklyDetail month={month} />;
  if (title === "Monthly detail") return <MonthlyDetail month={month} />;
  if (title === "Analytics") return <BrokerAnalytics month={month} />;
  return (
    <Panel title={title} action="Export CSV">
      <div className="table-tools">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter rows..."
        />
        <button className="save">Save changes</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) =>
                r.join(" ").toLowerCase().includes(search.toLowerCase()),
              )
              .map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      {j === r.length - 1 && title.includes("invoice") ? (
                        <Badge type="draft">{c}</Badge>
                      ) : (
                        c
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function MonthlyDetail({ month }: { month: string }) {
  const [rows, setRows] = useState<
    Array<{ broker: string; funded_loans: string; funded_amount: string }>
  >([]);
  const [clawbacks, setClawbacks] = useState<
    Array<{ broker: string; paid_off_date: string; commission_base: string }>
  >([]);
  const [waivers, setWaivers] = useState<
    Array<{ broker: string; funding_date: string; waiver_commission: string }>
  >([]);
  const [selectedBroker, setSelectedBroker] = useState("All brokers");
  useEffect(() => {
    const end = encodeURIComponent(new Date(month).toISOString().slice(0, 10));
    fetch(
      `https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-commission?month_end=${end}`,
    )
      .then((r) => r.json())
      .then((x) => setRows(x.rows || []))
      .catch(() => setRows([]));
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-clawbacks",
    )
      .then((r) => r.json())
      .then((x) => setClawbacks(x.rows || []))
      .catch(() => setClawbacks([]));
    fetch(
      "https://broker-commission-dashboard-api.edward-bell.workers.dev/api/broker-waiver",
    )
      .then((r) => r.json())
      .then((x) => setWaivers(x.rows || []))
      .catch(() => setWaivers([]));
  }, [month]);
  const monthlyBrokers = Array.from(
    new Set(
      Object.entries(activeFrequencies)
        .filter(([, frequency]) => frequency === "Monthly")
        .map(([broker]) => broker.trim()),
    ),
  ).sort();
  const monthKey = new Date(month).toISOString().slice(0, 7);
  const filtered = rows.filter(
    (x) =>
      activeFrequencies[x.broker.trim()] === "Monthly" &&
      (selectedBroker === "All brokers" || x.broker.trim() === selectedBroker),
  );
  const filteredClawbacks = clawbacks.filter(
    (x) =>
      x.paid_off_date?.slice(0, 7) === monthKey &&
      activeFrequencies[x.broker.trim()] === "Monthly" &&
      (selectedBroker === "All brokers" || x.broker.trim() === selectedBroker),
  );
  const filteredWaivers = waivers.filter(
    (x) =>
      x.funding_date?.slice(0, 7) === monthKey &&
      activeFrequencies[x.broker.trim()] === "Monthly" &&
      (selectedBroker === "All brokers" || x.broker.trim() === selectedBroker),
  );
  const totalCommission = filtered.reduce(
    (sum, x) =>
      sum +
      (Number(x.funded_amount) || 0) *
        monthlyCommissionRate(x.broker, Number(x.funded_amount) || 0),
    0,
  );
  const totalClawback = filteredClawbacks.reduce(
    (sum, x) =>
      sum +
      (Number(x.commission_base) || 0) *
        historicalCommissionRate(
          x.broker,
          x.funding_date,
          Number(x.commission_base) || 0,
        ),
    0,
  );
  const totalWaiver = filteredWaivers.reduce(
    (sum, x) => sum + (Number(x.waiver_commission) || 0),
    0,
  );
  return (
    <Panel
      title={`Monthly broker commission · ${month}`}
      action="Live BigQuery"
    >
      <div className="table-tools">
        <label>
          Broker{" "}
          <select
            aria-label="Filter monthly detail by broker"
            value={selectedBroker}
            onChange={(e) => setSelectedBroker(e.target.value)}
          >
            <option>All brokers</option>
            {monthlyBrokers.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <span className="sub">
          Showing only brokers marked Monthly in Commission rates.
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Broker</th>
              <th>Funded loans</th>
              <th>Funded base</th>
              <th>Commission</th>
              <th>Eligible clawback loans</th>
              <th>Clawback</th>
              <th>Waiver commission</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => {
              const broker = x.broker.trim();
              const brokerClawbacks = filteredClawbacks.filter(
                (c) => c.broker.trim() === broker,
              );
              const base = Number(x.funded_amount) || 0;
              return (
                <tr key={broker}>
                  <td>{broker}</td>
                  <td>{x.funded_loans}</td>
                  <td>{fmt(base)}</td>
                  <td>{fmt(base * monthlyCommissionRate(broker, base))}</td>
                  <td>{brokerClawbacks.length}</td>
                  <td>
                    {fmt(
                      brokerClawbacks.reduce(
                        (sum, c) =>
                          sum +
                          (Number(c.commission_base) || 0) *
                            historicalCommissionRate(
                              broker,
                              c.funding_date,
                              Number(c.commission_base) || 0,
                            ),
                        0,
                      ),
                    )}
                  </td>
                  <td>
                    {fmt(
                      filteredWaivers
                        .filter((w) => w.broker.trim() === broker)
                        .reduce(
                          (sum, w) => sum + (Number(w.waiver_commission) || 0),
                          0,
                        ),
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <th>Total</th>
              <th>
                {filtered.reduce(
                  (sum, x) => sum + (Number(x.funded_loans) || 0),
                  0,
                )}
              </th>
              <th>
                {fmt(
                  filtered.reduce(
                    (sum, x) => sum + (Number(x.funded_amount) || 0),
                    0,
                  ),
                )}
              </th>
              <th>{fmt(totalCommission)}</th>
              <th>{filteredClawbacks.length}</th>
              <th>{fmt(totalClawback)}</th>
              <th>{fmt(totalWaiver)}</th>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="sub">
        Monthly brokers are restricted to the selected month. Clawbacks are
        assigned to the month of the paid-off date. Waiver commission is
        assigned to the funding month.
      </p>
    </Panel>
  );
}
