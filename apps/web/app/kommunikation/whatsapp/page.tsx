'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

type Conversation={id:number;status:string;unreadCount:number;lastActivityAt:number|string|null;contact:{name:string;phone:string|null};inbox:string|null;assignee:string|null;url:string};
function activity(value:number|string|null){if(!value)return '—';const date=typeof value==='number'?new Date(value*1000):new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(date)}

export default function WhatsAppPage(){
 const [rows,setRows]=useState<Conversation[]>([]);const [workspaceUrl,setWorkspaceUrl]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [configured,setConfigured]=useState<boolean|null>(null);const [message,setMessage]=useState('');
 async function load(){setLoading(true);setMessage('');try{const response=await fetch('/api/integrations/chatwoot/conversations',{cache:'no-store'});const data=await response.json();setConfigured(data.configured??false);setRows(data.conversations??[]);setWorkspaceUrl(data.workspaceUrl??null);if(!response.ok)setMessage(data.error||'Chatwoot konnte nicht geladen werden.')}catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 return <div className="appShell"><Sidebar/><main className="main"><Topbar title="WhatsApp" subtitle="Fahrerkommunikation über Chatwoot"/><div className="content">
  <div className="modulePageHead"><div><h2>Konversationen</h2><p>Control Center zeigt den operativen Überblick; Antworten werden im vollständigen Chatwoot Workspace bearbeitet.</p></div><div className="moduleHeadActions">{workspaceUrl&&<a className="filterBtn" href={workspaceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Chatwoot öffnen</a>}<button className="filterBtn" onClick={()=>void load()}><RefreshCw size={14}/>Aktualisieren</button></div></div>
  {configured===false&&<div className="integrationNotice"><MessageCircle size={18}/><div><strong>Chatwoot noch nicht verbunden</strong><span>Nach dem Eintragen von URL, Account-ID und API-Token erscheinen hier automatisch die offenen WhatsApp-Konversationen.</span></div></div>}
  {message&&<div className="moduleInlineMessage">{message}</div>}
  <div className="tableCard moduleEntityCard"><div className="tableWrap"><table className="moduleDataTable"><thead><tr><th>Kontakt</th><th>Telefon</th><th>Inbox</th><th>Status</th><th>Ungelesen</th><th>Zuständig</th><th>Letzte Aktivität</th><th>Aktion</th></tr></thead><tbody>
   {rows.map(row=><tr key={row.id}><td><strong>{row.contact.name}</strong></td><td>{row.contact.phone||'—'}</td><td>{row.inbox||'—'}</td><td><span className={`entityStatus status-${row.status}`}>{row.status}</span></td><td>{row.unreadCount}</td><td>{row.assignee||'—'}</td><td>{activity(row.lastActivityAt)}</td><td><a className="restoreBtn" href={row.url} target="_blank" rel="noreferrer"><ExternalLink size={13}/>Öffnen</a></td></tr>)}
   {!loading&&!rows.length&&<tr><td colSpan={8} className="emptyCell">{configured===false?'Integration wartet auf Zugangsdaten.':'Keine offenen Konversationen.'}</td></tr>}{loading&&<tr><td colSpan={8} className="emptyCell">Chatwoot wird geladen ...</td></tr>}
  </tbody></table></div></div>
 </div></main></div>
}
