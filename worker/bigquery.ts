type BqEnv = { INTEGRATIONS_HUB_CLIENT_ID?: string; INTEGRATIONS_HUB_CLIENT_SECRET?: string };

export async function queryBigQuery(env:BqEnv, query:string){
  if(!env.INTEGRATIONS_HUB_CLIENT_ID || !env.INTEGRATIONS_HUB_CLIENT_SECRET) throw new Error("Integrations Hub credentials are not configured");
  const r=await fetch("https://integrations.flightcontrol.co.nz/api/v1/broker/bigquery/readonly-job",{method:"POST",headers:{"CF-Access-Client-Id":env.INTEGRATIONS_HUB_CLIENT_ID,"CF-Access-Client-Secret":env.INTEGRATIONS_HUB_CLIENT_SECRET,"Content-Type":"application/json"},body:JSON.stringify({query,useLegacySql:false})});
  const j=await r.json() as any;
  if(!r.ok) throw new Error(j?.message||j?.error||`Integrations Hub query failed (${r.status})`);
  const payload=j.result||j.data||j.response||j;
  const rows=Array.isArray(payload.rows)?payload.rows:[];
  if(rows[0]?.f){const fields=payload.schema?.fields||j.schema?.fields||[];return rows.map((row:any)=>Object.fromEntries(fields.map((f:any,i:number)=>[f.name,row.f?.[i]?.v??null])));}
  return rows;
}
