'use client';

import { FormEvent, useState } from 'react';
import { Check, Copy, Download, Eye, FileText, Share2, UploadCloud, X } from 'lucide-react';

export type VehicleDocumentRow={id:string;filename:string;type:string|null;mimeType:string|null;sizeBytes:string|null;source:string};
type ShareState={documentId:string;filename:string;url:string;expiresAt:string};

function formatBytes(value:string|null){
  if(!value)return'—';
  const bytes=Number(value);
  if(!Number.isFinite(bytes))return'—';
  if(bytes<1024*1024)return`${Math.max(1,Math.round(bytes/1024))} KB`;
  return`${(bytes/1024/1024).toFixed(1)} MB`;
}
function canPreview(document:VehicleDocumentRow){
  return document.mimeType==='application/pdf'||Boolean(document.mimeType?.startsWith('image/'));
}
async function copyText(value:string){
  if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);return}
  const textarea=document.createElement('textarea');
  textarea.value=value;textarea.style.position='fixed';textarea.style.opacity='0';
  document.body.appendChild(textarea);textarea.focus();textarea.select();
  document.execCommand('copy');textarea.remove();
}

export function VehicleDocumentsPanel({vehicleId,documents,readOnly,onReload}:{vehicleId:string;documents:VehicleDocumentRow[];readOnly:boolean;onReload:()=>void|Promise<void>}){
  const [uploading,setUploading]=useState(false);
  const [message,setMessage]=useState('');
  const [preview,setPreview]=useState<VehicleDocumentRow|null>(null);
  const [share,setShare]=useState<ShareState|null>(null);

  async function uploadDocument(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(readOnly)return;
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const file=form.get('file');
    if(!(file instanceof File)||!file.size)return;
    setUploading(true);setMessage('');
    try{
      const response=await fetch(`/api/vehicles/${vehicleId}/documents`,{method:'POST',body:form});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Dokument konnte nicht hochgeladen werden.');
      formElement.reset();
      setMessage('Dokument in MEGA S4 gespeichert.');
      await onReload();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Upload.')}
    finally{setUploading(false)}
  }

  function previewDocument(document:VehicleDocumentRow){
    if(document.source!=='MEGA_S4'||!canPreview(document))return;
    setMessage('');
    setPreview(document);
  }

  function downloadDocument(document:VehicleDocumentRow){
    if(document.source!=='MEGA_S4')return;
    setMessage('');
    const anchor=window.document.createElement('a');
    anchor.href=`/api/documents/${document.id}/open?download=1`;
    anchor.download=document.filename;
    anchor.rel='noopener noreferrer';
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function shareDocument(document:VehicleDocumentRow){
    if(readOnly||document.source!=='MEGA_S4')return;
    setMessage('');
    try{
      const response=await fetch(`/api/documents/${document.id}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresInHours:168})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Freigabelink konnte nicht erstellt werden.');
      const next={documentId:document.id,filename:document.filename,url:String(payload.url),expiresAt:String(payload.expiresAt)};
      setShare(next);
      await copyText(next.url).catch(()=>undefined);
      setMessage('Freigabelink erstellt. Er wurde zusätzlich in die Zwischenablage kopiert.');
    }catch(error){setMessage(error instanceof Error?error.message:'Freigabelink konnte nicht erstellt werden.')}
  }

  return <>
    <section className="drawerSection"><div className="drawerSectionHead"><div><h3>Dokumente</h3><p>{documents.length} Dateien · Vorschau, Download und sichere Freigabe</p></div><FileText size={17}/></div>
      {!readOnly&&<form className="documentUpload" onSubmit={uploadDocument}><select name="type" defaultValue="FAHRZEUGSCHEIN"><option value="FAHRZEUGSCHEIN">Fahrzeugschein</option><option value="TUV">TÜV</option><option value="SP">SP</option><option value="TACHO">Tachoprüfung</option><option value="VERSICHERUNG">Versicherung</option><option value="FINANZIERUNG">Finanzierung</option><option value="RECHNUNG">Rechnung</option><option value="FOTO">Foto</option><option value="SONSTIGE">Sonstiges</option></select><input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"/><button type="submit" disabled={uploading}><UploadCloud size={14}/>{uploading?'Upload ...':'Hochladen'}</button></form>}
      {message&&<div className="documentActionMessage"><Check size={13}/><span>{message}</span></div>}
      {share&&<div className="documentShareBox"><div><span>Freigabelink · gültig bis {new Date(share.expiresAt).toLocaleString('de-DE')}</span><strong>{share.filename}</strong></div><div className="documentShareLine"><input readOnly value={share.url} onFocus={event=>event.currentTarget.select()}/><button type="button" onClick={()=>void copyText(share.url)}><Copy size={14}/> Kopieren</button><button type="button" className="shareClose" onClick={()=>setShare(null)} aria-label="Freigabelink schließen"><X size={14}/></button></div></div>}
      <div className="drawerDocuments">{documents.length?documents.map(document=><div className={'drawerDocument '+(document.type==='FAHRZEUGSCHEIN'?'primaryVehicleDocument':'')} key={document.id}><span className="documentIcon"><FileText size={15}/></span><div className="documentMeta"><strong>{document.filename}</strong><small>{document.type==='FAHRZEUGSCHEIN'?'KFZ-Schein':document.type||'Dokument'} · {formatBytes(document.sizeBytes)}</small></div><div className="documentActions">{canPreview(document)&&document.source==='MEGA_S4'&&<button className="documentActionText" type="button" onClick={()=>previewDocument(document)}><Eye size={14}/><span>Vorschau</span></button>}<button className="documentActionText" type="button" onClick={()=>downloadDocument(document)} disabled={document.source!=='MEGA_S4'}><Download size={14}/><span>Download</span></button>{!readOnly&&<button className="documentActionText shareAction" type="button" onClick={()=>void shareDocument(document)} disabled={document.source!=='MEGA_S4'}><Share2 size={14}/><span>Freigeben</span></button>}</div></div>):<p className="drawerEmpty">Noch keine Dokumente synchronisiert.</p>}</div>
    </section>

    {preview&&<div className="documentPreviewBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setPreview(null)}}><div className="documentPreviewModal"><header><div><span>{preview.type==='FAHRZEUGSCHEIN'?'KFZ-Schein':'Dokument'}</span><strong>{preview.filename}</strong></div><div>{!readOnly&&<button title="Freigeben" onClick={()=>void shareDocument(preview)}><Share2 size={15}/></button>}<button title="Herunterladen" onClick={()=>downloadDocument(preview)}><Download size={15}/></button><button title="Schließen" onClick={()=>setPreview(null)}><X size={17}/></button></div></header><div className="documentPreviewBody">{preview.mimeType?.startsWith('image/')?<img src={`/api/documents/${preview.id}/open`} alt={preview.filename}/>:<iframe src={`/api/documents/${preview.id}/open`} title={preview.filename}/>}</div></div></div>}
  </>;
}
