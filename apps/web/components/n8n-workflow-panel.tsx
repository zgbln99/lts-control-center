'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, TriangleAlert } from 'lucide-react';

type Workflow={id:string;name:string;active:boolean;updatedAt:string|null;createdAt:string|null;tags:Array<{id?:string;name?:string}>};
function formatDate(value:string|null){if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(date)}

export function N8nWorkflowPanel(){
 const [rows,setRows]=useState<Workflow[]>([]);const [configured,setConfigured]=useState<boolean|null>(null);const [workspaceUrl,setWorkspaceUrl]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [message,setMessage]=useState('');
 async function load(){setLoading(true);setMessage('');try{const response=await fetch('/api/integrations/n8n/workflows',{cache:'no-store'});const payload=await response.json().catch(()=>({}));setConfigured(Boolean(payload.configured));setWorkspaceUrl(payload.workspaceUrl??null);setRows(payload.workflows??[]);if(!response.ok&&payload.error)setMessage(payload.error)}catch{setConfigured(false);setMessage('n8n Status konnte nicht geladen werden.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 return <section className="tableCard moduleEntityCard liveWorkflowPanel"><div className="moduleToolbar"><div><strong>n8n Workflows</strong><small>{configured===false?'Nicht konfiguriert':`${rows.length} Workflows vom n8n API`}</small></div><div className="filterSpacer"/>{workspaceUrl&&<a className="filterBtn" href={workspaceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>n8n öffnen</a>}<button className="filterBtn" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>{loading?'Laden ...':'Aktualisieren'}</button></div>
 {configured===false?<div className="integrationNotice"><TriangleAlert size={17}/><div><strong>n8n API noch nicht verbunden</strong><span>URL und API-Key werden später in `.env` gesetzt. Lokale Automation-Definitionen oben funktionieren unabhängig davon.</span></div></div>:<div className="tableWrap"><table className="moduleDataTable"><thead><tr><th>Name</th><th>ID</th><th>Aktiv</th><th>Tags</th><th>Geändert</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.id}</td><td><span className={`archiveStatus ${row.active?'sold':'archived'}`}>{row.active?'Aktiv':'Inaktiv'}</span></td><td>{row.tags?.map(tag=>tag.name).filter(Boolean).join(', ')||'—'}</td><td>{formatDate(row.updatedAt)}</td></tr>)}{!rows.length&&!loading&&<tr><td colSpan={5} className="emptyCell">Keine Workflows gefunden.</td></tr>}</tbody></table></div>}
 {message&&<div className="moduleInlineMessage">{message}</div>}</section>
}
