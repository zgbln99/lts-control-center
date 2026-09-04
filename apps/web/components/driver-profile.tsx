'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, Copy, Download, Eye, FileText, Mail, Phone, Share2, UploadCloud, UserRound, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

type DriverDoc={id:string;type:string|null;filename:string;mimeType:string|null;sizeBytes:string|null;expiresAt:string|null;source:string;createdAt:string};
type DriverDetail={
  id:string;personnelNumber:string|null;firstName:string;lastName:string;phone:string|null;email:string|null;language:string;status:string;
  employmentStart:string|null;employmentEnd:string|null;licenseNumber:string|null;licenseClasses:string[];licenseExpiresAt:string|null;
  driverCardNumber:string|null;driverCardExpiresAt:string|null;code95ExpiresAt:string|null;medicalExpiresAt:string|null;notes:string|null;
  documents:DriverDoc[];
};
type ShareState={documentId:string;filename:string;url:string;expiresAt:string};

function date(value:string|null){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('de-DE')}
function size(value:string|null){const b=Number(value);if(!Number.isFinite(b)||!b)return'—';return b<1048576?`${Math.round(b/1024)} KB`:`${(b/1048576).toFixed(1)} MB`}
function canPreview(row:DriverDoc){return row.mimeType==='application/pdf'||Boolean(row.mimeType?.startsWith('image/'))||/\.(pdf|jpe?g|png|webp)$/i.test(row.filename)}
function docLabel(type:string|null){const labels:Record<string,string>={FUEHRERSCHEIN:'Führerschein',FAHRERKARTE:'Fahrerkarte',CODE95:'Code 95',MEDIZIN:'Ärztliche Untersuchung',AUSWEIS:'Ausweis',VERTRAG:'Vertrag',SONSTIGE:'Sonstiges'};return labels[type??'']??type??'Sonstiges'}
function expiryState(value:string|null){if(!value)return'none';const days=Math.ceil((new Date(value).getTime()-Date.now())/86400000);return days<0?'critical':days<=30?'warning':'ok'}
function expiryText(value:string|null){const state=expiryState(value);if(state==='none')return'kein Termin';if(state==='critical')return'überfällig';if(state==='warning')return'bald fällig';return'gültig'}
async function copyText(value:string){if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return}const textarea=document.createElement('textarea');textarea.value=value;textarea.style.position='fixed';textarea.style.opacity='0';document.body.appendChild(textarea);textarea.focus();textarea.select();document.execCommand('copy');textarea.remove()}

export function DriverProfile({driverId}:{driverId:string}){
  const [driver,setDriver]=useState<DriverDetail|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [canWrite,setCanWrite]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [preview,setPreview]=useState<DriverDoc|null>(null);
  const [share,setShare]=useState<ShareState|null>(null);

  async function load(){
    setLoading(true);setMessage('');
    try{const response=await fetch(`/api/drivers/${driverId}`,{cache:'no-store'});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Fahrer konnte nicht geladen werden.');setDriver(payload)}
    catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load();fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(p=>setCanWrite(['ADMIN','PERSONAL'].includes(p?.user?.role))).catch(()=>setCanWrite(false))},[driverId]);

  const sortedDocs=useMemo(()=>[...(driver?.documents??[])].sort((a,b)=>{
    const priority=(value:string|null)=>value==='FUEHRERSCHEIN'?0:value==='FAHRERKARTE'?1:value==='CODE95'?2:3;
    return priority(a.type)-priority(b.type)||a.filename.localeCompare(b.filename,'de');
  }),[driver]);

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!canWrite)return;const formElement=event.currentTarget;const form=new FormData(formElement);const file=form.get('file');if(!(file instanceof File)||!file.size)return;
    setUploading(true);setMessage('');
    try{const response=await fetch(`/api/drivers/${driverId}/documents`,{method:'POST',body:form});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Upload fehlgeschlagen.');formElement.reset();setMessage('Dokument in MEGA S4 gespeichert.');await load()}
    catch(error){setMessage(error instanceof Error?error.message:'Upload fehlgeschlagen.')}
    finally{setUploading(false)}
  }
  function downloadDocument(row:DriverDoc){const a=document.createElement('a');a.href=`/api/driver-documents/${row.id}/open?download=1`;a.download=row.filename;document.body.appendChild(a);a.click();a.remove()}
  async function shareDocument(row:DriverDoc){
    if(!canWrite||row.source!=='MEGA_S4')return;setMessage('');
    try{const response=await fetch(`/api/driver-documents/${row.id}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresInHours:168})});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Freigabelink konnte nicht erstellt werden.');const next={documentId:row.id,filename:row.filename,url:String(payload.url),expiresAt:String(payload.expiresAt)};setShare(next);await copyText(next.url).catch(()=>undefined);setMessage('Freigabelink erstellt · gültig 7 Tage.')}
    catch(error){setMessage(error instanceof Error?error.message:'Freigabelink konnte nicht erstellt werden.')}
  }

  if(loading&&!driver)return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerakte" subtitle="Laden ..."/><div className="content"><div className="tableCard driverProfileLoading">Fahrerakte wird geladen ...</div></div></main></div>;
  if(!driver)return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerakte" subtitle="Nicht verfügbar"/><div className="content"><div className="pageMessage">{message||'Fahrer nicht gefunden.'}</div></div></main></div>;

  const deadlines=[
    {label:'Führerschein',value:driver.licenseExpiresAt},
    {label:'Fahrerkarte',value:driver.driverCardExpiresAt},
    {label:'Code 95',value:driver.code95ExpiresAt},
    {label:'Medizin',value:driver.medicalExpiresAt},
  ];

  return <div className="appShell"><Sidebar/><main className="main"><Topbar title={`${driver.lastName}, ${driver.firstName}`} subtitle="Fahrerakte"/><div className="content driverProfileContent">
    <div className="driverProfileTop">
      <Link href="/fahrer" className="filterBtn"><ArrowLeft size={14}/>Zurück zu Fahrer</Link>
      <Link href="/fahrer/dokumente" className="filterBtn"><FileText size={14}/>Alle Fahrerdokumente</Link>
    </div>
    {message&&<div className="moduleInlineMessage">{message}</div>}
    <section className="driverHeroCard">
      <div className="driverAvatarLarge"><UserRound size={34}/></div>
      <div className="driverHeroMain"><span className={`entityStatus status-${driver.status.toLowerCase()}`}>{driver.status}</span><h2>{driver.firstName} {driver.lastName}</h2><p>{driver.personnelNumber?`Pers.-Nr. ${driver.personnelNumber}`:'Keine Personalnummer'}</p></div>
      <div className="driverQuickContact">{driver.phone&&<a href={`tel:${driver.phone}`}><Phone size={15}/>{driver.phone}</a>}{driver.email&&<a href={`mailto:${driver.email}`}><Mail size={15}/>{driver.email}</a>}</div>
    </section>

    <div className="driverProfileGrid">
      <section className="tableCard driverDataCard"><div className="modulePageHead"><div><h2>Stammdaten</h2><p>Personal- und Fahrerdaten</p></div></div><div className="driverInfoGrid">
        <div><span>Personalnummer</span><strong>{driver.personnelNumber??'—'}</strong></div><div><span>Sprache</span><strong>{driver.language||'—'}</strong></div>
        <div><span>Eintritt</span><strong>{date(driver.employmentStart)}</strong></div><div><span>Austritt</span><strong>{date(driver.employmentEnd)}</strong></div>
        <div><span>Führerscheinnummer</span><strong>{driver.licenseNumber??'—'}</strong></div><div><span>Klassen</span><strong>{driver.licenseClasses.length?driver.licenseClasses.join(', '):'—'}</strong></div>
        <div className="wide"><span>Fahrerkarte</span><strong>{driver.driverCardNumber??'—'}</strong></div>{driver.notes&&<div className="wide"><span>Notizen</span><strong>{driver.notes}</strong></div>}
      </div></section>
      <section className="tableCard driverDeadlineCard"><div className="modulePageHead"><div><h2>Gültigkeiten</h2><p>Fristen und Nachweise</p></div><CalendarDays size={18}/></div><div className="driverDeadlineGrid">{deadlines.map(item=>{const state=expiryState(item.value);return <div key={item.label} className={`deadlineCard ${state==='critical'?'deadlineCritical':state==='warning'?'deadlineWarn':''}`}><span>{item.label}</span><strong>{date(item.value)}</strong><small>{expiryText(item.value)}</small></div>})}</div></section>
    </div>

    <section className="tableCard driverDocumentsCard"><div className="modulePageHead"><div><h2>Dokumente</h2><p>{sortedDocs.length} Dateien in MEGA S4 / Fahrerakte</p></div><FileText size={18}/></div>
      {canWrite&&<form className="documentUpload driverProfileUpload" onSubmit={upload}><select name="type" defaultValue="FUEHRERSCHEIN"><option value="FUEHRERSCHEIN">Führerschein</option><option value="FAHRERKARTE">Fahrerkarte</option><option value="CODE95">Code 95</option><option value="MEDIZIN">Ärztliche Untersuchung</option><option value="AUSWEIS">Ausweis</option><option value="VERTRAG">Vertrag</option><option value="SONSTIGE">Sonstiges</option></select><input name="expiresAt" type="date"/><input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"/><button disabled={uploading}><UploadCloud size={14}/>{uploading?'Upload ...':'Hochladen'}</button></form>}
      {share&&<div className="documentShareBox"><div><span>Freigabelink · gültig bis {new Date(share.expiresAt).toLocaleString('de-DE')}</span><strong>{share.filename}</strong></div><div className="documentShareLine"><input readOnly value={share.url} onFocus={event=>event.currentTarget.select()}/><button type="button" onClick={()=>void copyText(share.url)}><Copy size={14}/> Kopieren</button><button type="button" className="shareClose" onClick={()=>setShare(null)}><X size={14}/></button></div></div>}
      <div className="driverProfileDocs">{sortedDocs.length?sortedDocs.map(row=><div className="driverProfileDoc" key={row.id}><span className="documentIcon"><FileText size={16}/></span><div><strong>{row.filename}</strong><small>{docLabel(row.type)} · {size(row.sizeBytes)}{row.expiresAt?` · gültig bis ${date(row.expiresAt)}`:''}</small></div><div className="documentActions">{canPreview(row)&&row.source==='MEGA_S4'&&<button className="documentActionText" onClick={()=>setPreview(row)}><Eye size={14}/><span>Vorschau</span></button>}<button className="documentActionText" onClick={()=>downloadDocument(row)} disabled={row.source!=='MEGA_S4'}><Download size={14}/><span>Download</span></button>{canWrite&&<button className="documentActionText shareAction" onClick={()=>void shareDocument(row)} disabled={row.source!=='MEGA_S4'}><Share2 size={14}/><span>Freigeben</span></button>}</div></div>):<p className="drawerEmpty">Noch keine Fahrerdokumente.</p>}</div>
    </section>
  </div>
  {preview&&<div className="documentPreviewBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPreview(null)}}><div className="documentPreviewModal"><header><div><span>{docLabel(preview.type)}</span><strong>{driver.lastName}, {driver.firstName} · {preview.filename}</strong></div><div>{canWrite&&<button title="Freigeben" onClick={()=>void shareDocument(preview)}><Share2 size={15}/></button>}<button title="Herunterladen" onClick={()=>downloadDocument(preview)}><Download size={15}/></button><button title="Schließen" onClick={()=>setPreview(null)}><X size={17}/></button></div></header><div className="documentPreviewBody">{preview.mimeType?.startsWith('image/')||/\.(jpe?g|png|webp)$/i.test(preview.filename)?<img src={`/api/driver-documents/${preview.id}/open`} alt={preview.filename}/>:<iframe src={`/api/driver-documents/${preview.id}/open`} title={preview.filename}/>}</div></div></div>}
  </main></div>;
}
