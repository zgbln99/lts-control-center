'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { Archive, Banknote, RotateCcw, Search, Truck, UserRound } from 'lucide-react';

type ArchiveRow={
  id:string; plate:string; vehicle:string; lifecycle:'SOLD'|'RETURNED'|'SCRAPPED'|'ARCHIVED'; vin:string|null;
  inventoryNumber:string|null; firstRegistration:string|null; soldAt:string|null; soldTo:string|null;
  soldPrice:string|null; soldMileageKm:number|null; lastKnownMileageKm:number|null; notes:string|null;
  documentsNotes:string|null; documentCount:number;
};

const dateFormatter=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
const numberFormatter=new Intl.NumberFormat('de-DE');
const moneyFormatter=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const lifecycleLabel:Record<ArchiveRow['lifecycle'],string>={SOLD:'Verkauft',RETURNED:'Zurückgegeben',SCRAPPED:'Verschrottet',ARCHIVED:'Abgemeldet / Archiv'};

export default function ArchivPage(){
  const [rows,setRows]=useState<ArchiveRow[]>([]);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('ALL');
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [restoring,setRestoring]=useState<string|null>(null);

  async function load(){
    setLoading(true);
    try{
      const response=await fetch('/api/vehicles/archive');
      if(!response.ok) throw new Error('Archiv konnte nicht geladen werden.');
      const payload=await response.json();
      setRows(payload.vehicles ?? []);
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);

  const filtered=useMemo(()=>rows.filter(row=>{
    const text=`${row.plate} ${row.vehicle} ${row.vin ?? ''} ${row.inventoryNumber ?? ''} ${row.soldTo ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter==='ALL'||row.lifecycle===filter);
  }),[rows,query,filter]);

  const stats=useMemo(()=>({
    total:rows.length,
    sold:rows.filter(row=>row.lifecycle==='SOLD').length,
    archived:rows.filter(row=>row.lifecycle==='ARCHIVED').length,
    value:rows.reduce((sum,row)=>sum+(row.soldPrice?Number(row.soldPrice):0),0),
  }),[rows]);

  async function restore(row:ArchiveRow){
    if(!window.confirm(`${row.plate} wieder in den aktiven Fuhrpark aufnehmen?`)) return;
    setRestoring(row.id); setMessage('');
    try{
      const response=await fetch(`/api/vehicles/${row.id}/restore`,{method:'POST'});
      if(!response.ok) throw new Error('Fahrzeug konnte nicht wiederhergestellt werden.');
      setMessage(`${row.plate} ist wieder aktiv.`);
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Wiederherstellen.')}finally{setRestoring(null)}
  }

  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Verkauf / Archiv" subtitle="Historie verkaufter, abgemeldeter und zurückgegebener Fahrzeuge" searchPlaceholder="Archiv durchsuchen ..."/><div className="content">
    <section className="kpis archiveKpis">
      <div className="kpi"><div className="kpiIcon blue"><Archive size={21}/></div><div><strong>{stats.total}</strong><span>Im Archiv</span><small>Historie bleibt erhalten</small></div></div>
      <div className="kpi"><div className="kpiIcon green"><Truck size={21}/></div><div><strong>{stats.sold}</strong><span>Verkauft</span><small>aus Kfz-Liste übernommen</small></div></div>
      <div className="kpi"><div className="kpiIcon orange"><UserRound size={21}/></div><div><strong>{stats.archived}</strong><span>Abgemeldet</span><small>nicht mehr aktiv</small></div></div>
      <div className="kpi"><div className="kpiIcon purple"><Banknote size={21}/></div><div><strong>{stats.value?moneyFormatter.format(stats.value):'—'}</strong><span>Erfasster Verkaufserlös</span><small>nur vorhandene Werte</small></div></div>
    </section>

    <section className="tableCard moduleTable">
      <div className="moduleToolbar">
        <div className="moduleSearch"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kennzeichen, VIN, Käufer ..."/></div>
        <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Alle Vorgänge</option><option value="SOLD">Verkauft</option><option value="ARCHIVED">Abgemeldet / Archiv</option><option value="RETURNED">Zurückgegeben</option><option value="SCRAPPED">Verschrottet</option></select>
        <div className="filterSpacer"/>
        <span className="moduleCounter">{filtered.length} Fahrzeuge</span>
      </div>
      <div className="tableWrap"><table className="moduleDataTable archiveTable"><thead><tr><th>Kennzeichen</th><th>Fahrzeug</th><th>Status</th><th>Datum</th><th>Käufer / Empfänger</th><th>Kilometer</th><th>Preis</th><th>Dokumente</th><th>Aktion</th></tr></thead><tbody>
        {filtered.map(row=><tr key={row.id}><td className="plateCell"><i className={'rowState '+(row.lifecycle==='SOLD'?'rowOk':'rowWarning')}></i><strong>{row.plate}</strong><small>{row.inventoryNumber||row.vin||'—'}</small></td><td><strong>{row.vehicle}</strong>{row.firstRegistration&&<small>EZ {dateFormatter.format(new Date(row.firstRegistration))}</small>}</td><td><span className={'archiveStatus '+row.lifecycle.toLowerCase()}>{lifecycleLabel[row.lifecycle]}</span></td><td>{row.soldAt?dateFormatter.format(new Date(row.soldAt)):'—'}</td><td>{row.soldTo||<span className="muted">—</span>}</td><td>{row.soldMileageKm!==null?`${numberFormatter.format(row.soldMileageKm)} km`:row.lastKnownMileageKm!==null?`${numberFormatter.format(row.lastKnownMileageKm)} km`:'—'}</td><td>{row.soldPrice?moneyFormatter.format(Number(row.soldPrice)):'—'}</td><td><span className="docCountBadge">{row.documentCount}</span></td><td><button className="restoreBtn" disabled={restoring===row.id} onClick={()=>restore(row)} title="Wieder aktivieren"><RotateCcw size={14}/>{restoring===row.id?'...':'Aktivieren'}</button></td></tr>)}
        {!loading&&!filtered.length&&<tr><td colSpan={9} className="emptyCell">Keine Fahrzeuge für diese Auswahl.</td></tr>}
      </tbody></table></div>
    </section>
    {message&&<div className="pageMessage">{message}</div>}
  </div></main></div>
}
