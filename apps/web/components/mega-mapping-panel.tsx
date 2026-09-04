'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FolderSearch, Link2, RefreshCw, TriangleAlert } from 'lucide-react';

type UnmatchedFolder={folder:string;normalizedPlate:string|null;files:number};
type VehicleOption={id:string;plate:string;displayName:string|null};
type Mapping={id:string;folder:string;normalizedPlate:string|null;storagePrefix:string;createdAt?:string;vehicle:{id:string;plate:string;displayName:string|null}};
type Payload={unmatched:UnmatchedFolder[];mappings:Mapping[];vehicles:VehicleOption[]};

export function MegaMappingPanel(){
  const [data,setData]=useState<Payload>({unmatched:[],mappings:[],vehicles:[]});
  const [loading,setLoading]=useState(true);
  const [savingFolder,setSavingFolder]=useState<string|null>(null);
  const [selected,setSelected]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');
  const [canEdit,setCanEdit]=useState(false);

  async function load(){
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/integrations/mega/mappings',{cache:'no-store'});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'MEGA-S4-Zuordnungen konnten nicht geladen werden.');
      setData({unmatched:payload.unmatched??[],mappings:payload.mappings??[],vehicles:payload.vehicles??[]});
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load();fetch('/api/auth/me').then(response=>response.ok?response.json():null).then(payload=>setCanEdit(['ADMIN','FUHRPARK'].includes(payload?.user?.role))).catch(()=>setCanEdit(false))},[]);

  const vehicleByPlate=useMemo(()=>new Map(data.vehicles.map(vehicle=>[vehicle.plate.toUpperCase(),vehicle.id])),[data.vehicles]);

  useEffect(()=>{
    if(!data.unmatched.length)return;
    setSelected(current=>{
      const next={...current};
      for(const row of data.unmatched){
        if(next[row.folder])continue;
        const suggested=row.normalizedPlate?vehicleByPlate.get(row.normalizedPlate.toUpperCase()):undefined;
        if(suggested)next[row.folder]=suggested;
      }
      return next;
    });
  },[data.unmatched,vehicleByPlate]);

  async function assign(row:UnmatchedFolder){
    const vehicleId=selected[row.folder];
    if(!vehicleId){setMessage('Bitte zuerst ein Fahrzeug für „'+row.folder+'“ auswählen.');return}
    setSavingFolder(row.folder);setMessage('');
    try{
      const response=await fetch('/api/integrations/mega/mappings',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({folder:row.folder,vehicleId,normalizedPlate:row.normalizedPlate}),
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Zuordnung konnte nicht gespeichert werden.');
      setMessage('Ordner „'+row.folder+'“ wurde dauerhaft '+(payload.mapping?.vehicle?.plate??'dem Fahrzeug')+' zugeordnet.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Speichern.')}
    finally{setSavingFolder(null)}
  }

  return <section className="megaMappingPanel">
    <div className="megaMappingHead">
      <div><span className="megaMappingEyebrow">MEGA S4 REVIEW</span><h2>Ordner manuell zuordnen</h2><p>Nur Ordner, die nicht sicher über Kennzeichen oder historische Aliase erkannt wurden. Eine bestätigte Zuordnung wird bei allen nächsten Synchronisationen wiederverwendet.</p></div>
      <button className="filterBtn" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>{loading?'Laden ...':'Aktualisieren'}</button>
    </div>

    {message&&<div className="moduleInlineMessage">{message}</div>}

    <div className="megaMappingStats">
      <div><span>Nicht zugeordnet</span><strong>{data.unmatched.length}</strong></div>
      <div><span>Bestätigte Zuordnungen</span><strong>{data.mappings.length}</strong></div>
      <div><span>Aktive Fahrzeuge</span><strong>{data.vehicles.length}</strong></div>
    </div>

    {data.unmatched.length>0?<div className="megaUnmatchedList">
      {data.unmatched.map(row=><div className="megaUnmatchedRow" key={row.folder}>
        <span className="megaFolderIcon"><FolderSearch size={17}/></span>
        <div className="megaFolderName"><strong>{row.folder}</strong><span>{row.files} {row.files===1?'Datei':'Dateien'} · erkannt: {row.normalizedPlate||'kein Kennzeichen'}</span></div>
        {canEdit?<><select value={selected[row.folder]??''} onChange={event=>setSelected(current=>({...current,[row.folder]:event.target.value}))}>
          <option value="">Fahrzeug auswählen …</option>
          {data.vehicles.map(vehicle=><option value={vehicle.id} key={vehicle.id}>{vehicle.plate}{vehicle.displayName?' · '+vehicle.displayName:''}</option>)}
        </select>
        <button className="greenBtn" onClick={()=>void assign(row)} disabled={savingFolder===row.folder||!selected[row.folder]}><Link2 size={14}/>{savingFolder===row.folder?'Speichern ...':'Zuordnen'}</button></>:<span className="megaReadOnly">Nur Fuhrpark / Admin kann Ordner zuordnen.</span>}
      </div>)}
    </div>:<div className="megaAllMatched"><CheckCircle2 size={19}/><div><strong>Keine offenen Ordner</strong><span>{loading?'Zuordnungen werden geprüft …':'Alle zuletzt erkannten Fahrzeugordner sind zugeordnet.'}</span></div></div>}

    <div className="megaConfirmed">
      <div className="megaConfirmedHead"><h3>Bestätigte Zuordnungen</h3><span>Die neuesten 200 werden vom Backend bereitgestellt.</span></div>
      <div className="tableWrap"><table className="moduleDataTable"><thead><tr><th>MEGA-S4-Ordner</th><th>Erkanntes Kennzeichen</th><th>Zugeordnetes Fahrzeug</th><th>Storage Prefix</th></tr></thead><tbody>
        {data.mappings.slice(0,20).map(row=><tr key={row.id}><td><strong>{row.folder}</strong></td><td>{row.normalizedPlate||'—'}</td><td><span className="entityStatus status-open"><CheckCircle2 size={11}/>{row.vehicle.plate}</span>{row.vehicle.displayName&&<small>{row.vehicle.displayName}</small>}</td><td><code className="megaPrefix">{row.storagePrefix}</code></td></tr>)}
        {!loading&&!data.mappings.length&&<tr><td colSpan={4} className="emptyCell">Noch keine manuell bestätigten Zuordnungen.</td></tr>}
        {loading&&<tr><td colSpan={4} className="emptyCell">Zuordnungen werden geladen ...</td></tr>}
      </tbody></table></div>
    </div>

    <div className="integrationNotice megaMappingHint"><TriangleAlert size={17}/><div><strong>Wichtig</strong><span>Die Zuordnung verschiebt oder benennt keine Dateien in MEGA S4 um. Sie speichert nur die dauerhafte Beziehung zwischen vorhandenem Ordner und Fahrzeug in PostgreSQL.</span></div></div>
  </section>
}
