'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ExternalLink, FileArchive, FileText, FolderOpen, Search, Truck } from 'lucide-react';

type DocumentRow={
  id:string; vehicleId:string; plate:string; vehicle:string; lifecycle:string; type:string|null; filename:string;
  mimeType:string|null; sizeBytes:number|null; source:string; documentDate:string|null; expiresAt:string|null; createdAt:string;
};

const dateFormatter=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});

function formatBytes(value:number|null){
  if(value===null) return '—';
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1)} KB`;
  return `${(value/1024/1024).toFixed(1)} MB`;
}

export default function DocumentsPage(){
  const [rows,setRows]=useState<DocumentRow[]>([]);
  const [query,setQuery]=useState('');
  const [source,setSource]=useState('ALL');
  const [loading,setLoading]=useState(true);
  const [opening,setOpening]=useState<string|null>(null);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    fetch('/api/documents').then(response=>{
      if(!response.ok) throw new Error('Dokumente konnten nicht geladen werden.');
      return response.json();
    }).then(payload=>setRows(payload.documents ?? [])).catch(error=>setMessage(error.message)).finally(()=>setLoading(false));
  },[]);

  const filtered=useMemo(()=>rows.filter(row=>{
    const text=`${row.plate} ${row.vehicle} ${row.filename} ${row.type ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (source==='ALL'||row.source===source);
  }),[rows,query,source]);

  const stats=useMemo(()=>({
    total:rows.length,
    vehicles:new Set(rows.map(row=>row.vehicleId)).size,
    mega:rows.filter(row=>row.source==='MEGA_S4').length,
    archived:rows.filter(row=>row.lifecycle!=='ACTIVE').length,
  }),[rows]);

  async function openDocument(row:DocumentRow){
    setOpening(row.id); setMessage('');
    try{
      const response=await fetch(`/api/documents/${row.id}/open`);
      if(!response.ok) throw new Error('Dokument konnte nicht geöffnet werden.');
      const payload=await response.json();
      window.open(payload.url,'_blank','noopener,noreferrer');
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Öffnen.')}finally{setOpening(null)}
  }

  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Dokumente" subtitle="Zentrale Fahrzeugkartothek aus MEGA S4" searchPlaceholder="Dokument oder Fahrzeug suchen ..."/><div className="content">
    <section className="kpis archiveKpis">
      <div className="kpi"><div className="kpiIcon green"><FileText size={21}/></div><div><strong>{stats.total}</strong><span>Dokumente</span><small>gesamte Kartothek</small></div></div>
      <div className="kpi"><div className="kpiIcon blue"><Truck size={21}/></div><div><strong>{stats.vehicles}</strong><span>Fahrzeuge mit Dokumenten</span><small>aktive + Archiv</small></div></div>
      <div className="kpi"><div className="kpiIcon cyan"><FolderOpen size={21}/></div><div><strong>{stats.mega}</strong><span>MEGA S4</span><small>privater Storage</small></div></div>
      <div className="kpi"><div className="kpiIcon purple"><FileArchive size={21}/></div><div><strong>{stats.archived}</strong><span>Archiv-Dokumente</span><small>Historie bleibt erhalten</small></div></div>
    </section>

    <section className="tableCard moduleTable">
      <div className="moduleToolbar">
        <div className="moduleSearch"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kennzeichen, Dateiname, Dokumenttyp ..."/></div>
        <select value={source} onChange={e=>setSource(e.target.value)}><option value="ALL">Alle Quellen</option><option value="MEGA_S4">MEGA S4</option><option value="MANUAL">Manuell</option><option value="GOOGLE_DRIVE_IMPORT">Google Drive Import</option><option value="SAMSARA">Samsara</option><option value="SYSTEM">System</option></select>
        <div className="filterSpacer"/><span className="moduleCounter">{filtered.length} Dateien</span>
      </div>
      <div className="tableWrap"><table className="moduleDataTable documentsTable"><thead><tr><th>Fahrzeug</th><th>Dokument</th><th>Typ</th><th>Quelle</th><th>Datum</th><th>Gültig bis</th><th>Größe</th><th>Aktion</th></tr></thead><tbody>
        {filtered.map(row=><tr key={row.id}><td className="plateCell"><i className={'rowState '+(row.lifecycle==='ACTIVE'?'rowOk':'rowWarning')}></i><strong>{row.plate}</strong><small>{row.vehicle}</small></td><td><strong>{row.filename}</strong></td><td>{row.type||<span className="muted">Sonstige Unterlagen</span>}</td><td><span className="sourceBadge">{row.source.replaceAll('_',' ')}</span></td><td>{row.documentDate?dateFormatter.format(new Date(row.documentDate)):dateFormatter.format(new Date(row.createdAt))}</td><td>{row.expiresAt?dateFormatter.format(new Date(row.expiresAt)):'—'}</td><td>{formatBytes(row.sizeBytes)}</td><td><button className="restoreBtn" onClick={()=>openDocument(row)} disabled={opening===row.id}><ExternalLink size={14}/>{opening===row.id?'Öffnen ...':'Öffnen'}</button></td></tr>)}
        {!loading&&!filtered.length&&<tr><td colSpan={8} className="emptyCell">Noch keine Dokumente synchronisiert.</td></tr>}
      </tbody></table></div>
    </section>
    {message&&<div className="pageMessage">{message}</div>}
  </div></main></div>
}
