'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { FleetTable } from '@/components/fleet-table';
import { SamsaraMiniMap } from '@/components/samsara-mini-map';
import { DeadlineState, Vehicle, VehicleCategory } from '@/lib/fleet-types';
import { Truck, CalendarDays, TriangleAlert, Camera, Sticker, MapPin, ArrowRight, Clock3 } from 'lucide-react';

type ApiDeadline = { dueDate: string; state: DeadlineState } | null;
type ApiVehicle = {
  id: string; plate: string; category:VehicleCategory; vehicle: string; firstRegistration: string | null; vin: string | null;
  insuranceNumber: string | null; taxNumber: string | null; inventoryNumber: string | null; financingEnd: string | null;
  financingEndRaw: string | null; monthlyRate: string | null; documentsNotes: string | null; cameraInstalled: boolean | null;
  wrapped: boolean | null; samsara: { connected: boolean; online: boolean | null; location: string | null; odometerKm: number | null; latitude: number | null; longitude: number | null; lastSeenAt: string | null };
  deadlines: { tuv: ApiDeadline; sp: ApiDeadline; tacho: ApiDeadline }; documentCount: number;
};
type LoadedVehicle = Vehicle & { samsaraOnline?: boolean | null; latitude?: number | null; longitude?: number | null; upcoming?: { type: 'TÜV' | 'SP' | 'Tacho'; dueDate: string; state: DeadlineState }[] };

const dateFormatter = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
const monthFormatter = new Intl.DateTimeFormat('de-DE', { month:'2-digit', year:'numeric' });
const numberFormatter = new Intl.NumberFormat('de-DE');
const moneyFormatter = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });

function formatMonth(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : monthFormatter.format(date);
}
function relativeTime(value?: string | null) {
  if (!value) return 'Noch nicht synchronisiert';
  const date = new Date(value);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return dateFormatter.format(date);
}
function deadlineEntry(type:'TÜV'|'SP'|'Tacho', deadline:ApiDeadline) {
  return deadline ? { type, dueDate:deadline.dueDate, state:deadline.state } : null;
}
function mapApiVehicle(row: ApiVehicle): LoadedVehicle {
  const paid = row.monthlyRate?.toLowerCase().includes('abbezahlt') ?? false;
  const numericRate = row.monthlyRate && !paid ? Number(row.monthlyRate) : Number.NaN;
  const finance = paid ? 'abbezahlt' : row.financingEnd ? `bis ${row.financingEnd}` : row.financingEndRaw || '—';
  const upcoming = [
    deadlineEntry('TÜV', row.deadlines.tuv),
    deadlineEntry('SP', row.deadlines.sp),
    deadlineEntry('Tacho', row.deadlines.tacho),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    id:row.id,plate:row.plate,category:row.category,vehicle:row.vehicle||'—',firstRegistration:row.firstRegistration||'—',
    location:row.samsara.location||(row.samsara.connected?'Noch keine Live-Daten':'—'),
    locationAge:row.samsara.connected?relativeTime(row.samsara.lastSeenAt):'Keine Samsara-Daten',
    mileage:row.samsara.odometerKm===null?'—':`${numberFormatter.format(row.samsara.odometerKm)} km`,
    tuv:formatMonth(row.deadlines.tuv?.dueDate),tuvState:row.deadlines.tuv?.state??'none',
    sp:formatMonth(row.deadlines.sp?.dueDate),spState:row.deadlines.sp?.state??'none',
    tacho:formatMonth(row.deadlines.tacho?.dueDate),tachoState:row.deadlines.tacho?.state??'none',
    camera:row.cameraInstalled,wrapped:row.wrapped,samsara:row.samsara.connected,samsaraOnline:row.samsara.online,latitude:row.samsara.latitude,longitude:row.samsara.longitude,
    vin:row.vin||'—',inventory:row.inventoryNumber||'—',insurance:row.insuranceNumber||'—',taxNumber:row.taxNumber||'—',
    finance,rate:paid||!Number.isFinite(numericRate)?'—':moneyFormatter.format(numericRate),
    documentCount:row.documentCount,documentsNotes:row.documentsNotes||undefined,upcoming,
  };
}
function daysText(value:string) {
  const due = new Date(value);
  const days = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} Tage überfällig`;
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  return `in ${days} Tagen`;
}

export function FleetPage({view}:{view:'all'|'trailer'}) {
  const [fleet,setFleet]=useState<LoadedVehicle[]>([]);
  const [selected,setSelected]=useState<Vehicle|null>(null);
  const [loadError,setLoadError]=useState('');
  const [reloadToken,setReloadToken]=useState(0);

  useEffect(()=>{
    const controller=new AbortController();
    const search=view==='trailer'?'?typ=anhaenger':'';
    setLoadError('');
    fetch(`/api/vehicles${search}`,{signal:controller.signal})
      .then(response=>{if(!response.ok)throw new Error(`Fleet API ${response.status}`);return response.json()})
      .then((payload:{vehicles?:ApiVehicle[]})=>{
        const mapped=Array.isArray(payload.vehicles)?payload.vehicles.map(mapApiVehicle):[];
        setFleet(mapped);
        setSelected(current=>current?mapped.find(vehicle=>vehicle.id===current.id)??null:null);
      })
      .catch(error=>{
        if(error?.name!=='AbortError'){
          setFleet([]);
          setSelected(null);
          setLoadError('Fahrzeugdaten konnten nicht geladen werden.');
        }
      });
    return()=>controller.abort();
  },[reloadToken,view]);

  const stats=useMemo(()=>({
    total:fleet.length,
    tuvWarning:fleet.filter(v=>v.tuvState==='warning').length,
    tuvCritical:fleet.filter(v=>v.tuvState==='critical').length,
    withoutCamera:fleet.filter(v=>v.camera===false).length,
    notWrapped:fleet.filter(v=>v.wrapped===false).length,
    underway:fleet.filter(v=>v.location.toLowerCase().startsWith('unterwegs')).length,
    online:fleet.filter(v=>v.samsara&&v.samsaraOnline===true).length,
  }),[fleet]);

  const kpis=[
    {icon:Truck,value:String(stats.total),label:view==='trailer'?'Anhänger / Auflieger':'Fahrzeuge gesamt',sub:'aus Fahrzeugbestand',kind:'green'},
    {icon:CalendarDays,value:String(stats.tuvWarning),label:'TÜV < 30 Tage',sub:`${stats.tuvWarning} offen`,kind:'orange'},
    {icon:TriangleAlert,value:String(stats.tuvCritical),label:'TÜV überfällig',sub:`${stats.tuvCritical} kritisch`,kind:'red'},
    {icon:Camera,value:String(stats.withoutCamera),label:'Ohne Kamera',sub:`${stats.withoutCamera} Fahrzeuge`,kind:'blue'},
    {icon:Sticker,value:String(stats.notWrapped),label:'Nicht beklebt',sub:`${stats.notWrapped} Fahrzeuge`,kind:'purple'},
    {icon:MapPin,value:String(stats.underway),label:'Unterwegs',sub:'Live via Samsara',kind:'cyan'},
  ];

  const terms=useMemo(()=>fleet
    .flatMap(vehicle=>(vehicle.upcoming??[]).map(item=>({...item,plate:vehicle.plate})))
    .sort((a,b)=>new Date(a.dueDate).getTime()-new Date(b.dueDate).getTime())
    .slice(0,4),[fleet]);

  const reload=()=>setReloadToken(value=>value+1);

  return <div className="appShell"><Sidebar/><main className="main">
    <Topbar title={view==='trailer'?'Anhänger':'Fuhrpark'} subtitle={view==='trailer'?'Anhänger und Auflieger':'Übersicht aller Fahrzeuge'}/>
    <div className="content">
      {loadError&&<div className="pageMessage" role="alert">{loadError}</div>}
      <section className="kpis">{kpis.map(k=>{const I=k.icon;return <div className="kpi" key={k.label}><div className={'kpiIcon '+k.kind}><I size={21}/></div><div><strong>{k.value}</strong><span>{k.label}</span><small>{k.sub}</small></div></div>})}</section>
      <div className="mainGrid"><div>
        <FleetTable vehicles={fleet} selected={selected} onSelect={setSelected} onClose={()=>setSelected(null)} onChanged={reload}/>
        {fleet.length===0&&<div className="tableCard emptyFleetCard">Keine Fahrzeuge in dieser Ansicht.</div>}
      </div><aside className="rightRail">
        <div className="railCard"><div className="railHead"><h3>Fahrzeuge live (Samsara)</h3></div><strong className="onlineText">{stats.online} online</strong><SamsaraMiniMap vehicles={fleet.map(vehicle=>({id:vehicle.id??vehicle.plate,plate:vehicle.plate,latitude:vehicle.latitude??null,longitude:vehicle.longitude??null,online:vehicle.samsaraOnline===true,location:vehicle.location,locationAge:vehicle.locationAge}))} onSelect={id=>{const vehicle=fleet.find(item=>(item.id??item.plate)===id);if(vehicle)setSelected(vehicle)}}/><Link href="/integrationen#samsara">Samsara Status <ArrowRight size={13}/></Link></div>
        <div className="railCard"><div className="railHead"><h3>Kritische Alerts</h3><Link href="/fuhrpark/termine">Alle anzeigen</Link></div><div className="alertRow"><span className="alertIcon redA"><TriangleAlert size={18}/></span><div><strong>{stats.tuvCritical} Fahrzeuge</strong><span>TÜV überfällig</span></div><Link href="/fuhrpark/termine">Jetzt prüfen</Link></div><div className="alertRow"><span className="alertIcon orangeA"><TriangleAlert size={18}/></span><div><strong>{stats.tuvWarning} Fahrzeuge</strong><span>TÜV in 30 Tagen</span></div><Link href="/fuhrpark/termine">Termine prüfen</Link></div><div className="alertRow"><span className="alertIcon orangeA"><Camera size={18}/></span><div><strong>{stats.withoutCamera} Fahrzeuge</strong><span>Ohne Kamera</span></div><Link href="/fuhrpark/kategorien">Bestand prüfen</Link></div></div>
        <div className="railCard"><div className="railHead"><h3>Nächste Termine</h3><Link href="/fuhrpark/termine">Alle anzeigen</Link></div>{terms.length?terms.map(r=><div className="termRow" key={r.plate+r.type+r.dueDate}><span><Clock3 size={13}/></span><div><strong>{r.plate}</strong><small>{r.type==='SP'?'Sicherheitsprüfung':r.type==='Tacho'?'Tachoprüfung':'TÜV Prüfung'}</small></div><div className="termDate"><strong>{dateFormatter.format(new Date(r.dueDate))}</strong><small>{daysText(r.dueDate)}</small></div></div>):<p className="muted">Noch keine Termine erfasst.</p>}<Link className="calendarLink" href="/fuhrpark/termine">Kalender öffnen <ArrowRight size={13}/></Link></div>
      </aside></div>
    </div>
  </main></div>;
}
