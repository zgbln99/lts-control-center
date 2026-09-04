'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Eye, FileText, RefreshCw, Search, Share2, UploadCloud, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

type Driver={id:string;firstName:string;lastName:string;personnelNumber:string|null;status:string};
type Doc={id:string;type:string|null;filename:string;mimeType:string|null;sizeBytes:string|null;expiresAt:string|null;createdAt:string;source:string;driver:Driver};
type ShareState={documentId:string;filename:string;url:string;expiresAt:string};

function size(value:string|null){const b=Number(value);if(!Number.isFinite(b)||!b)return'—';return b<1048576?`${Math.round(b/1024)} KB`:`${(b/1048576).toFixed(1)} MB`}
function canPreview(row:Doc){return row.mimeType==='application/pdf'||Boolean(row.mimeType?.startsWith('image/'))||/\.(pdf|jpe?g|png|webp)$/i.test(row.filename)}
async function copyText(value:string){
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return}
  const textarea=document.createElement('textarea');textarea.value=value;textarea.style.position='fixed';textarea.style.opacity='0';document.body.appendChild(textarea);textarea.focus();textarea.select();document.execCommand('copy');textarea.remove();
}
function docLabel(type:string|null){const labels:Record<string,string>={FUEHRERSCHEIN:'Führerschein',FAHRERKARTE:'Fahrerkarte',CODE95:'Code 95',MEDIZIN:'Ärztliche Untersuchung',AUSWEIS:'Ausweis',VERTRAG:'Vertrag',SONSTIGE:'Sonstiges'};return labels[type??'']??type??'Sonstiges'}

export default function DriverDocumentsPage(){
 const [drivers,setDrivers]=useState<Driver[]>([]);
 const [docs,setDocs]=useState<Doc[]>([]);
 const [query,setQuery]=useState('');
 const [message,setMessage]=useState('');
 const [uploading,setUploading]=useState(false);
 const [canUpload,setCanUpload]=useState(false);
 const [preview,setPreview]=useState<Doc|null>(null);
 const [share,setShare]=useState<ShareState|null>(null);

 async function load(){
   setMessage('');
   try{
     const [dr,dd]=await Promise.all([fetch('/api/drivers',{cache:'no-store'}),fetch('/api/driver-documents',{cache:'no-store'})]);
     const a=await dr.json(),b=await dd.json();
     if(!dr.ok)throw new Error(a.error||'Fahrer konnten nicht geladen werden.');
     if(!dd.ok)throw new Error(b.error||'Dokumente konnten nicht geladen werden.');
     setDrivers(a.drivers??[]);setDocs(b.documents??[]);
   }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}
 }
 useEffect(()=>{void load();fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(p=>setCanUpload(['ADMIN','PERSONAL'].includes(p?.user?.role))).catch(()=>setCanUpload(false))},[]);

 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?docs.filter(row=>[row.driver.lastName,row.driver.firstName,row.driver.personnelNumber,row.type,row.filename].join(' ').toLowerCase().includes(q)):docs},[docs,query]);

 async function upload(event:FormEvent<HTMLFormElement>){
   event.preventDefault();if(!canUpload)return;
   const formElement=event.currentTarget;const form=new FormData(formElement);const driverId=String(form.get('driverId')||'');if(!driverId)return;form.delete('driverId');
   setUploading(true);setMessage('');
   try{const response=await fetch(`/api/drivers/${driverId}/documents`,{method:'POST',body:form});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Upload fehlgeschlagen.');formElement.reset();setMessage('Dokument in MEGA S4 gespeichert.');await load()}
   catch(error){setMessage(error instanceof Error?error.message:'Upload fehlgeschlagen.')}
   finally{setUploading(false)}
 }

 function previewDocument(row:Doc){if(row.source!=='MEGA_S4'||!canPreview(row))return;setPreview(row);setMessage('')}
 function downloadDocument(row:Doc){if(row.source!=='MEGA_S4')return;const a=document.createElement('a');a.href=`/api/driver-documents/${row.id}/open?download=1`;a.download=row.filename;document.body.appendChild(a);a.click();a.remove()}

 async function shareDocument(row:Doc){
   if(!canUpload||row.source!=='MEGA_S4')return;
   setMessage('');
   try{
     const response=await fetch(`/api/driver-documents/${row.id}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresInHours:168})});
     const payload=await response.json().catch(()=>({}));
     if(!response.ok)throw new Error(payload.error||'Freigabelink konnte nicht erstellt werden.');
     const next={documentId:row.id,filename:row.filename,url:String(payload.url),expiresAt:String(payload.expiresAt)};
     setShare(next);await copyText(next.url).catch(()=>undefined);setMessage('Freigabelink erstellt · gültig 7 Tage.');
   }catch(error){setMessage(error instanceof Error?error.message:'Freigabelink konnte nicht erstellt werden.')}
 }

 return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerdokumente" subtitle="Dokumente und Nachweise in MEGA S4"/><div className="content">
  <div className="driverDocsGrid"><div className="tableCard moduleEntityCard">
   <div className="moduleToolbar"><div className="moduleSearch"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Fahrer, Personalnummer, Dokument ..."/></div><span className="moduleCounter">{filtered.length} Dateien</span><div className="filterSpacer"/><button className="filterBtn" onClick={()=>void load()}><RefreshCw size={14}/>Aktualisieren</button></div>
   {message&&<div className="moduleInlineMessage">{message}</div>}
   {share&&<div className="documentShareBox driverDocumentShare"><div><span>Freigabelink · gültig bis {new Date(share.expiresAt).toLocaleString('de-DE')}</span><strong>{share.filename}</strong></div><div className="documentShareLine"><input readOnly value={share.url} onFocus={event=>event.currentTarget.select()}/><button type="button" onClick={()=>void copyText(share.url)}><Copy size={14}/> Kopieren</button><button type="button" className="shareClose" onClick={()=>setShare(null)} aria-label="Freigabelink schließen"><X size={14}/></button></div></div>}
   <div className="tableWrap"><table className="moduleDataTable driverDocumentsTable"><thead><tr><th>Fahrer</th><th>Pers.-Nr.</th><th>Typ</th><th>Datei</th><th>Größe</th><th>Gültig bis</th><th>Quelle</th><th>Aktionen</th></tr></thead><tbody>
    {filtered.map(row=><tr key={row.id}><td><strong>{row.driver.lastName}, {row.driver.firstName}</strong></td><td>{row.driver.personnelNumber??'—'}</td><td><span className="entityStatus">{docLabel(row.type)}</span></td><td>{row.filename}</td><td>{size(row.sizeBytes)}</td><td>{row.expiresAt?new Date(row.expiresAt).toLocaleDateString('de-DE'):'—'}</td><td>{row.source}</td><td><div className="documentActions">{canPreview(row)&&row.source==='MEGA_S4'&&<button className="documentActionText" onClick={()=>previewDocument(row)}><Eye size={14}/><span>Vorschau</span></button>}<button className="documentActionText" onClick={()=>downloadDocument(row)} disabled={row.source!=='MEGA_S4'}><Download size={14}/><span>Download</span></button>{canUpload&&<button className="documentActionText shareAction" onClick={()=>void shareDocument(row)} disabled={row.source!=='MEGA_S4'}><Share2 size={14}/><span>Freigeben</span></button>}</div></td></tr>)}
    {!filtered.length&&<tr><td colSpan={8} className="emptyCell">Noch keine Fahrerdokumente.</td></tr>}
   </tbody></table></div>
  </div>
  <aside className="rightRail">{canUpload?<form className="railCard driverUploadCard" onSubmit={upload}><div className="railHead"><h3>Dokument hochladen</h3><UploadCloud size={16}/></div><label><span>Fahrer</span><select name="driverId" required defaultValue=""><option value="" disabled>Fahrer auswählen</option>{drivers.filter(d=>d.status==='ACTIVE').map(d=><option key={d.id} value={d.id}>{d.lastName}, {d.firstName}{d.personnelNumber?` · ${d.personnelNumber}`:''}</option>)}</select></label><label><span>Dokumenttyp</span><select name="type" defaultValue="FUEHRERSCHEIN"><option value="FUEHRERSCHEIN">Führerschein</option><option value="FAHRERKARTE">Fahrerkarte</option><option value="CODE95">Code 95</option><option value="MEDIZIN">Ärztliche Untersuchung</option><option value="AUSWEIS">Ausweis</option><option value="VERTRAG">Vertrag</option><option value="SONSTIGE">Sonstiges</option></select></label><label><span>Gültig bis</span><input name="expiresAt" type="date"/></label><label><span>Datei</span><input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"/></label><button className="greenBtn driverUploadButton" disabled={uploading}><FileText size={14}/>{uploading?'Upload ...':'In MEGA S4 speichern'}</button></form>:<div className="railCard infoRail"><h3>Nur Lesen</h3><p>Dokumente können von Personal und Administratoren hochgeladen und freigegeben werden.</p></div>}</aside>
  </div>
 </div>
 {preview&&<div className="documentPreviewBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPreview(null)}}><div className="documentPreviewModal"><header><div><span>{docLabel(preview.type)}</span><strong>{preview.driver.lastName}, {preview.driver.firstName} · {preview.filename}</strong></div><div>{canUpload&&<button title="Freigeben" onClick={()=>void shareDocument(preview)}><Share2 size={15}/></button>}<button title="Herunterladen" onClick={()=>downloadDocument(preview)}><Download size={15}/></button><button title="Schließen" onClick={()=>setPreview(null)}><X size={17}/></button></div></header><div className="documentPreviewBody">{preview.mimeType?.startsWith('image/')||/\.(jpe?g|png|webp)$/i.test(preview.filename)?<img src={`/api/driver-documents/${preview.id}/open`} alt={preview.filename}/>:<iframe src={`/api/driver-documents/${preview.id}/open`} title={preview.filename}/>}</div></div></div>}
 </main></div>
}
