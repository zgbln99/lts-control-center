'use client';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, History, RefreshCw, Search, TriangleAlert, UserX } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

type Violation={id:string;driverCardNumber:string|null;plate:string|null;type:string;code:string|null;legalReference:string|null;severity:string|null;startsAt:string;endsAt:string|null;durationMinutes:number|null;description:string|null;acknowledgedAt:string|null;driver:{id:string;firstName:string;lastName:string;personnelNumber:string|null}|null;vehicle:{plate:string;displayName:string|null}|null};
type Batch={id:string;source:string;periodStart:string|null;periodEnd:string|null;status:string;externalId:string|null;createdAt:string;violationCount:number};
type View='ALL'|'OPEN'|'ACK'|'UNASSIGNED';
const dateTime=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const dateOnly=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});

function VerstoesseContent(){
 const searchParams=useSearchParams();const driverId=searchParams.get('driverId');
 const [rows,setRows]=useState<Violation[]>([]);
 const [batches,setBatches]=useState<Batch[]>([]);
 const [query,setQuery]=useState('');
 const [view,setView]=useState<View>('ALL');
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 const [selected,setSelected]=useState<Set<string>>(new Set());

 async function load(){
   setLoading(true);setMessage('');
   try{
     const params=new URLSearchParams({take:'500'});if(driverId)params.set('driverId',driverId);
     const [violationsResponse,batchesResponse]=await Promise.all([
       fetch(`/api/ddd/violations?${params.toString()}`,{cache:'no-store'}),
       fetch('/api/ddd/batches',{cache:'no-store'}),
     ]);
     const violationsPayload=await violationsResponse.json();
     const batchesPayload=await batchesResponse.json().catch(()=>({}));
     if(!violationsResponse.ok)throw new Error(violationsPayload.error||'Verstöße konnten nicht geladen werden.');
     setRows(violationsPayload.violations??[]);
     setBatches(batchesResponse.ok?(batchesPayload.batches??[]):[]);
   }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}
   finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[driverId]);

 const filtered=useMemo(()=>{
   const q=query.trim().toLowerCase();
   return rows.filter(row=>{
     if(view==='OPEN'&&row.acknowledgedAt)return false;
     if(view==='ACK'&&!row.acknowledgedAt)return false;
     if(view==='UNASSIGNED'&&row.driver)return false;
     if(!q)return true;
     return [row.driver?.lastName,row.driver?.firstName,row.driverCardNumber,row.vehicle?.plate,row.plate,row.type,row.code,row.legalReference,row.description].join(' ').toLowerCase().includes(q);
   });
 },[rows,query,view]);

 const open=rows.filter(row=>!row.acknowledgedAt).length;
 const critical=rows.filter(row=>!row.acknowledgedAt&&String(row.severity).toUpperCase()==='CRITICAL').length;
 const unassigned=rows.filter(row=>!row.driver).length;

 function toggle(id:string){setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next})}
 async function acknowledge(){
   if(!selected.size)return;
   const response=await fetch('/api/ddd/violations',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[...selected],acknowledged:true})});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok){setMessage(payload.error||'Aktion fehlgeschlagen.');return}
   setSelected(new Set());await load();
 }

 return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Verstoßauswertung" subtitle="Lenk-, Ruhe- und Arbeitszeitverstöße"/><div className="content">
  {driverId&&<div className="dddDriverScope"><span>Gefiltert auf eine Fahrerakte</span><Link href="/fahrer/verstoesse">Alle Fahrer anzeigen</Link></div>}
  <section className="kpis violationKpis">
   <button className={'kpi dddKpiButton '+(view==='OPEN'?'dddKpiActive':'')} onClick={()=>setView(view==='OPEN'?'ALL':'OPEN')}><div className="kpiIcon red"><TriangleAlert size={20}/></div><div><strong>{open}</strong><span>Offene Verstöße</span><small>nicht bestätigt</small></div></button>
   <div className="kpi"><div className="kpiIcon orange"><TriangleAlert size={20}/></div><div><strong>{critical}</strong><span>Kritisch</span><small>offen</small></div></div>
   <button className={'kpi dddKpiButton '+(view==='UNASSIGNED'?'dddKpiActive':'')} onClick={()=>setView(view==='UNASSIGNED'?'ALL':'UNASSIGNED')}><div className="kpiIcon orange"><UserX size={20}/></div><div><strong>{unassigned}</strong><span>Nicht zugeordnet</span><small>keine Samsara-Fahrerkarte</small></div></button>
   <div className="kpi"><div className="kpiIcon green"><History size={20}/></div><div><strong>{batches.length}</strong><span>Import-Batches</span><small>letzte 100</small></div></div>
  </section>

  <div className="tableCard moduleEntityCard">
   <div className="moduleToolbar">
    <div className="moduleSearch"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Fahrer, Karte, Kennzeichen, Verstoß ..."/></div>
    <span className="moduleCounter">{filtered.length} Verstöße</span>
    <div className="dddViewTabs">
      <button className={view==='ALL'?'active':''} onClick={()=>setView('ALL')}>Alle</button>
      <button className={view==='OPEN'?'active':''} onClick={()=>setView('OPEN')}>Offen</button>
      <button className={view==='ACK'?'active':''} onClick={()=>setView('ACK')}>Bestätigt</button>
      <button className={view==='UNASSIGNED'?'active':''} onClick={()=>setView('UNASSIGNED')}>Nicht zugeordnet</button>
    </div>
    <div className="filterSpacer"/>
    <button className="filterBtn" onClick={()=>void load()}><RefreshCw size={14}/>Aktualisieren</button>
    <button className="greenBtn" onClick={()=>void acknowledge()} disabled={!selected.size}><CheckCircle2 size={14}/>{selected.size?`${selected.size} bestätigen`:'Auswahl bestätigen'}</button>
   </div>
   {message&&<div className="moduleInlineMessage">{message}</div>}
   <div className="tableWrap"><table className="moduleDataTable violationsTable"><thead><tr><th></th><th>Fahrer</th><th>Karte</th><th>Fahrzeug</th><th>Verstoß</th><th>Rechtsgrundlage</th><th>Beginn</th><th>Dauer</th><th>Schwere</th><th>Status</th></tr></thead><tbody>
    {filtered.map(row=><tr key={row.id}><td><input type="checkbox" checked={selected.has(row.id)} onChange={()=>toggle(row.id)}/></td><td>{row.driver?<Link href={`/fahrer/${row.driver.id}`} className="violationDriverLink"><strong>{`${row.driver.lastName}, ${row.driver.firstName}`}</strong><small>{row.driver.personnelNumber??''}</small></Link>:<><strong>Nicht zugeordnet</strong><small></small></>}</td><td>{row.driverCardNumber??'—'}</td><td>{row.vehicle?.plate??row.plate??'—'}</td><td><strong>{row.type}</strong><small>{row.code??row.description??''}</small></td><td>{row.legalReference??'—'}</td><td>{dateTime.format(new Date(row.startsAt))}</td><td>{row.durationMinutes?`${row.durationMinutes} Min.`:'—'}</td><td><span className={`entityStatus status-${String(row.severity??'unknown').toLowerCase()}`}>{row.severity??'—'}</span></td><td>{row.acknowledgedAt?<span className="entityStatus status-done">Bestätigt</span>:<span className="entityStatus status-open">Offen</span>}</td></tr>)}
    {!loading&&!filtered.length&&<tr><td colSpan={10} className="emptyCell">Keine Verstöße für diesen Filter.</td></tr>}{loading&&<tr><td colSpan={10} className="emptyCell">Verstöße werden geladen ...</td></tr>}
   </tbody></table></div>
  </div>

  <section className="tableCard dddBatchCard">
   <div className="modulePageHead"><div><h2>Letzte DDD-Importe</h2><p>Quelle, Zeitraum und Anzahl importierter Verstöße</p></div><History size={18}/></div>
   <div className="dddBatchList">
    {batches.slice(0,10).map(batch=><div key={batch.id} className="dddBatchRow"><div><strong>{batch.source}</strong><small>{batch.externalId??'ohne externe Batch-ID'}</small></div><span>{batch.periodStart?dateOnly.format(new Date(batch.periodStart)):'—'} – {batch.periodEnd?dateOnly.format(new Date(batch.periodEnd)):'—'}</span><strong>{batch.violationCount} Verstöße</strong><span className="entityStatus status-done">{batch.status}</span><small>{dateTime.format(new Date(batch.createdAt))}</small></div>)}
    {!batches.length&&!loading&&<div className="drawerEmpty">Noch keine DDD-Batches importiert.</div>}
   </div>
  </section>
 </div></main></div>
}

export default function VerstoessePage(){
 return <Suspense fallback={<div className="appShell"><Sidebar/><main className="main"><Topbar title="Verstoßauswertung" subtitle="DDD wird geladen ..."/><div className="content"><div className="tableCard driverProfileLoading">Verstoßauswertung wird geladen ...</div></div></main></div>}><VerstoesseContent/></Suspense>;
}
