'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { CalendarDays, Check, CheckCircle2, Clock3, Plus, Search, TriangleAlert } from 'lucide-react';

type DeadlineState='critical'|'warning'|'ok';
type DeadlineRow={
  id:string; vehicleId:string; plate:string; vehicle:string; type:string; customType:string|null;
  dueDate:string; state:DeadlineState; optional:boolean; notes:string|null;
};
type VehicleOption={id:string;plate:string;vehicle:string};

const labels:Record<string,string>={TUV:'TÜV',SP:'SP',TACHO:'Tachoprüfung',UVV:'UVV',SERVICE:'Service',INSURANCE:'Versicherung',LEASING:'Leasing',OTHER:'Sonstiges'};
const dateFormatter=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});

function daysText(value:string){
  const due=new Date(value);
  const days=Math.ceil((due.getTime()-Date.now())/86_400_000);
  if(days<0) return `${Math.abs(days)} Tage überfällig`;
  if(days===0) return 'heute';
  if(days===1) return 'morgen';
  return `in ${days} Tagen`;
}

export default function TerminePage(){
  const [rows,setRows]=useState<DeadlineRow[]>([]);
  const [vehicles,setVehicles]=useState<VehicleOption[]>([]);
  const [query,setQuery]=useState('');
  const [typeFilter,setTypeFilter]=useState('ALL');
  const [stateFilter,setStateFilter]=useState('ALL');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [completing,setCompleting]=useState<string|null>(null);
  const [message,setMessage]=useState('');

  async function load(){
    setLoading(true);
    try{
      const [deadlineResponse,vehicleResponse]=await Promise.all([fetch('/api/deadlines'),fetch('/api/vehicles')]);
      if(!deadlineResponse.ok) throw new Error('Termine konnten nicht geladen werden.');
      const deadlinePayload=await deadlineResponse.json();
      setRows(deadlinePayload.deadlines ?? []);
      if(vehicleResponse.ok){
        const vehiclePayload=await vehicleResponse.json();
        setVehicles((vehiclePayload.vehicles ?? []).map((vehicle:any)=>({id:vehicle.id,plate:vehicle.plate,vehicle:vehicle.vehicle})));
      }
    }catch(error){
      setMessage(error instanceof Error?error.message:'Fehler beim Laden.');
    }finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);

  const filtered=useMemo(()=>rows.filter(row=>{
    const text=`${row.plate} ${row.vehicle} ${labels[row.type] ?? row.type} ${row.notes ?? ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (typeFilter==='ALL'||row.type===typeFilter) && (stateFilter==='ALL'||row.state===stateFilter);
  }),[rows,query,typeFilter,stateFilter]);

  const stats=useMemo(()=>({
    total:rows.length,
    critical:rows.filter(row=>row.state==='critical').length,
    warning:rows.filter(row=>row.state==='warning').length,
    uvv:rows.filter(row=>row.type==='UVV').length,
  }),[rows]);

  async function createDeadline(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const vehicleId=String(form.get('vehicleId') ?? '');
    const type=String(form.get('type') ?? '');
    const dueDate=String(form.get('dueDate') ?? '');
    const notes=String(form.get('notes') ?? '');
    if(!vehicleId||!type||!dueDate) return;
    setSaving(true); setMessage('');
    try{
      const response=await fetch(`/api/vehicles/${vehicleId}/deadlines`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type,dueDate,notes,replaceCurrent:true}),
      });
      if(!response.ok) throw new Error('Termin konnte nicht gespeichert werden.');
      event.currentTarget.reset();
      setMessage('Termin gespeichert.');
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Speichern.')}finally{setSaving(false)}
  }

  async function completeDeadline(row:DeadlineRow){
    setCompleting(row.id); setMessage('');
    try{
      const response=await fetch(`/api/deadlines/${row.id}/complete`,{method:'POST'});
      if(!response.ok) throw new Error('Termin konnte nicht abgeschlossen werden.');
      setMessage(`${row.plate} · ${labels[row.type] ?? row.type} als erledigt markiert.`);
      await load();
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Abschließen.')}finally{setCompleting(null)}
  }

  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Termine" subtitle="Prüfungen, Fristen und Wiedervorlagen" searchPlaceholder="Termin oder Fahrzeug suchen ..."/><div className="content">
    <section className="kpis deadlineKpis">
      <div className="kpi"><div className="kpiIcon green"><CalendarDays size={21}/></div><div><strong>{stats.total}</strong><span>Offene Termine</span><small>gesamter Fuhrpark</small></div></div>
      <div className="kpi"><div className="kpiIcon red"><TriangleAlert size={21}/></div><div><strong>{stats.critical}</strong><span>Überfällig</span><small>sofort prüfen</small></div></div>
      <div className="kpi"><div className="kpiIcon orange"><Clock3 size={21}/></div><div><strong>{stats.warning}</strong><span>Nächste 30 Tage</span><small>bald fällig</small></div></div>
      <div className="kpi"><div className="kpiIcon blue"><CheckCircle2 size={21}/></div><div><strong>{stats.uvv}</strong><span>UVV</span><small>optional geführt</small></div></div>
    </section>

    <div className="moduleGrid">
      <section className="tableCard moduleTable">
        <div className="moduleToolbar">
          <div className="moduleSearch"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kennzeichen, Fahrzeug, Termin ..."/></div>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="ALL">Alle Typen</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          <select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="ALL">Alle Status</option><option value="critical">Überfällig</option><option value="warning">≤ 30 Tage</option><option value="ok">Später</option></select>
        </div>
        <div className="tableWrap"><table className="moduleDataTable deadlinesTable"><thead><tr><th>Fahrzeug</th><th>Termin</th><th>Fällig am</th><th>Status</th><th>Notiz</th><th>Aktion</th></tr></thead><tbody>
          {filtered.map(row=><tr key={row.id}><td className="plateCell"><i className={'rowState '+(row.state==='critical'?'rowCritical':row.state==='warning'?'rowWarning':'rowOk')}></i><strong>{row.plate}</strong><small>{row.vehicle}</small></td><td><strong>{labels[row.type] ?? row.customType ?? row.type}</strong>{row.optional&&<small>optional</small>}</td><td><strong>{dateFormatter.format(new Date(row.dueDate))}</strong></td><td><span className={'badge '+(row.state==='critical'?'badgeBad':row.state==='warning'?'badgeWarn':'badgeOk')}>{daysText(row.dueDate)}</span></td><td>{row.notes || <span className="muted">—</span>}</td><td><button className="completeBtn" disabled={completing===row.id} onClick={()=>completeDeadline(row)}><Check size={13}/>{completing===row.id?'...':'Erledigt'}</button></td></tr>)}
          {!loading&&!filtered.length&&<tr><td colSpan={6} className="emptyCell">Keine Termine für diese Auswahl.</td></tr>}
        </tbody></table></div>
      </section>

      <aside className="rightRail">
        <form className="railCard deadlineForm" onSubmit={createDeadline}>
          <div className="railHead"><h3>Neuen Termin anlegen</h3><Plus size={16}/></div>
          <label><span>Fahrzeug</span><select name="vehicleId" required defaultValue=""><option value="" disabled>Fahrzeug wählen</option>{vehicles.map(vehicle=><option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.vehicle}</option>)}</select></label>
          <label><span>Typ</span><select name="type" required defaultValue="TUV">{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}{value==='UVV'?' (optional)':''}</option>)}</select></label>
          <label><span>Fällig am</span><input name="dueDate" type="date" required/></label>
          <label><span>Notiz</span><textarea name="notes" rows={3} placeholder="z. B. Termin bei DEKRA"/></label>
          <button className="greenBtn deadlineSubmit" type="submit" disabled={saving}>{saving?'Speichern ...':'Termin speichern'}</button>
          {message&&<p className="formMessage">{message}</p>}
        </form>
        <div className="railCard infoRail"><h3>Logik</h3><p><b>TÜV, SP und Tacho</b> ersetzen beim Speichern automatisch den bisherigen offenen Termin desselben Typs.</p><p><b>UVV</b> wird weiterhin als optionaler Termin geführt.</p></div>
      </aside>
    </div>
  </div></main></div>
}
