'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, Edit3, Plus, RefreshCw, Search, X } from 'lucide-react';

type Option={value:string;label:string};
type Field={key:string;label:string;type?:'text'|'date'|'number'|'textarea'|'select'|'email'|'tel';required?:boolean;options?:Option[];wide?:boolean;placeholder?:string};
type Column={key:string;label:string;format?:'text'|'date'|'money'|'boolean'|'status'|'array'};
type Role='ADMIN'|'FUHRPARK'|'PERSONAL'|'DISPOSITION'|'READ_ONLY';
type Props={title:string;subtitle:string;endpoint:string;itemsKey:string;columns:Column[];fields?:Field[];createLabel?:string;emptyText?:string;allowDelete?:boolean;deleteLabel?:string};
function mayWrite(endpoint:string,role:Role|null){if(!role)return false;if(endpoint.startsWith('/api/users'))return role==='ADMIN';if(endpoint.startsWith('/api/drivers'))return role==='ADMIN'||role==='PERSONAL';if(endpoint.startsWith('/api/workshop'))return role==='ADMIN'||role==='FUHRPARK';if(endpoint.startsWith('/api/message-templates')||endpoint.startsWith('/api/automations'))return role==='ADMIN'||role==='DISPOSITION';if(endpoint.startsWith('/api/document-templates'))return role==='ADMIN'||role==='PERSONAL'||role==='FUHRPARK';if(endpoint.startsWith('/api/costs'))return role==='ADMIN'||role==='FUHRPARK';return false;}

function valueAt(row:any,path:string){return path.split('.').reduce((value,key)=>value?.[key],row)}
function displayValue(value:any,format:Column['format']){
  if(value===null||value===undefined||value==='') return '—';
  if(format==='date'){
    const date=new Date(value);if(Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
  }
  if(format==='money') return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(value));
  if(format==='boolean') return value?'Ja':'Nein';
  if(format==='array') return Array.isArray(value)?value.join(', '):String(value);
  return String(value);
}
function dateClass(value:any){
  if(!value) return '';
  const date=new Date(value);if(Number.isNaN(date.getTime())) return '';
  const days=Math.ceil((date.getTime()-Date.now())/86_400_000);
  return days<0?'moduleExpired':days<=30?'moduleSoon':'';
}

export function EntityModule({title,subtitle,endpoint,itemsKey,columns,fields=[],createLabel='Neu anlegen',emptyText='Noch keine Einträge.',allowDelete=true,deleteLabel='Archivieren'}:Props){
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<any|null>(null);
  const [formOpen,setFormOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const [role,setRole]=useState<Role|null>(null);

  async function load(){
    setLoading(true);setMessage('');
    try{
      const response=await fetch(endpoint,{cache:'no-store'});
      const payload=await response.json();
      if(!response.ok) throw new Error(payload.error||'Daten konnten nicht geladen werden.');
      setItems(payload[itemsKey]??[]);
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load();fetch('/api/auth/me').then(response=>response.ok?response.json():null).then(payload=>setRole((payload?.user?.role??null) as Role|null)).catch(()=>setRole(null))},[endpoint]);
  const canWrite=mayWrite(endpoint,role);

  const filtered=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle) return items;
    return items.filter(row=>columns.some(column=>String(valueAt(row,column.key)??'').toLowerCase().includes(needle)));
  },[items,query,columns]);

  function startCreate(){if(!canWrite)return;setSelected(null);setFormOpen(true);setMessage('')}
  function startEdit(row:any){if(!canWrite)return;setSelected(row);setFormOpen(true);setMessage('')}

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!canWrite)return;setSaving(true);setMessage('');
    const form=new FormData(event.currentTarget);
    const payload=Object.fromEntries(fields.map(field=>[field.key,form.get(field.key)]));
    try{
      const response=await fetch(selected?`${endpoint}/${selected.id}`:endpoint,{method:selected?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||'Speichern fehlgeschlagen.');
      setFormOpen(false);setSelected(null);await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Speichern fehlgeschlagen.')}finally{setSaving(false)}
  }

  async function remove(row:any){
    if(!canWrite||!allowDelete||!window.confirm(`${deleteLabel}: ${columns.length?displayValue(valueAt(row,columns[0].key),'text'):'Eintrag'}?`)) return;
    setSaving(true);setMessage('');
    try{
      const response=await fetch(`${endpoint}/${row.id}`,{method:'DELETE'});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||'Aktion fehlgeschlagen.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Aktion fehlgeschlagen.')}finally{setSaving(false)}
  }

  return <>
    <div className="modulePageHead"><div><h2>{title}</h2><p>{subtitle}</p></div><div className="moduleHeadActions"><button className="filterBtn" onClick={()=>void load()}><RefreshCw size={14}/>Aktualisieren</button>{canWrite&&fields.length>0&&<button className="greenBtn" onClick={startCreate}><Plus size={15}/>{createLabel}</button>}</div></div>
    <div className="tableCard moduleEntityCard">
      <div className="moduleToolbar"><div className="moduleSearch"><Search size={14}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Suchen ..."/></div><span className="moduleCounter">{filtered.length} Einträge</span></div>
      {message&&<div className="moduleInlineMessage">{message}</div>}
      <div className="tableWrap"><table className="moduleDataTable"><thead><tr>{columns.map(column=><th key={column.key}>{column.label}</th>)}{fields.length>0&&<th>Aktionen</th>}</tr></thead><tbody>
        {!loading&&filtered.map(row=><tr key={row.id}>{columns.map(column=>{const value=valueAt(row,column.key);return <td key={column.key} className={column.format==='date'?dateClass(value):''}>{column.format==='status'?<span className={`entityStatus status-${String(value).toLowerCase()}`}>{displayValue(value,'text')}</span>:displayValue(value,column.format)}</td>})}{fields.length>0&&<td>{canWrite?<div className="entityActions"><button onClick={()=>startEdit(row)} title="Bearbeiten"><Edit3 size={14}/></button>{allowDelete&&<button onClick={()=>void remove(row)} title={deleteLabel}><Archive size={14}/></button>}</div>:<span className="muted">—</span>}</td>}</tr>)}
        {loading&&<tr><td colSpan={columns.length+1} className="emptyCell">Daten werden geladen ...</td></tr>}
        {!loading&&!filtered.length&&<tr><td colSpan={columns.length+1} className="emptyCell">{emptyText}</td></tr>}
      </tbody></table></div>
    </div>
    {canWrite&&formOpen&&<div className="drawerBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setFormOpen(false)}}><aside className="vehicleDrawer entityDrawer"><header className="drawerHead"><div><span>{selected?'Bearbeiten':'Neu'}</span><h2>{selected?'Eintrag bearbeiten':createLabel}</h2><p>{title}</p></div><button onClick={()=>setFormOpen(false)}><X size={18}/></button></header><div className="drawerScroll"><form onSubmit={submit}><section className="drawerSection"><div className="drawerFormGrid">{fields.map(field=><label key={field.key} className={field.wide?'wide':''}><span>{field.label}</span>{field.type==='textarea'?<textarea name={field.key} rows={4} defaultValue={selected?.[field.key]??''}/>:field.type==='select'?<select name={field.key} defaultValue={selected?.[field.key]??''}>{field.options?.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:<input name={field.key} type={field.type||'text'} required={field.required} placeholder={field.placeholder} defaultValue={selected?.[field.key]??''}/>}</label>)}</div></section><div className="drawerStickySave"><span>{message}</span><button className="greenBtn" disabled={saving}>{saving?'Speichern ...':'Speichern'}</button></div></form></div></aside></div>}
  </>
}
