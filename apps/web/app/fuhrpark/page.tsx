'use client';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { FleetTable } from '@/components/fleet-table';
import { VehicleDetail } from '@/components/vehicle-detail';
import { vehicles as fallbackVehicles, DeadlineState, Vehicle } from '@/lib/demo';
import { Truck, CalendarDays, TriangleAlert, Camera, Sticker, MapPin, ArrowRight, Clock3 } from 'lucide-react';

type ApiDeadline = { dueDate: string; state: DeadlineState } | null;
type ApiVehicle = {
  id: string;
  plate: string;
  vehicle: string;
  firstRegistration: string | null;
  vin: string | null;
  insuranceNumber: string | null;
  taxNumber: string | null;
  inventoryNumber: string | null;
  financingEnd: string | null;
  financingEndRaw: string | null;
  monthlyRate: string | null;
  documentsNotes: string | null;
  cameraInstalled: boolean | null;
  wrapped: boolean | null;
  samsara: {
    connected: boolean;
    online: boolean | null;
    location: string | null;
    odometerKm: number | null;
    lastSeenAt: string | null;
  };
  deadlines: { tuv: ApiDeadline; sp: ApiDeadline; tacho: ApiDeadline };
  documentCount: number;
};

type LoadedVehicle = Vehicle & {
  samsaraOnline?: boolean | null;
  upcoming?: { type: 'TÜV' | 'SP' | 'Tacho'; dueDate: string; state: DeadlineState }[];
};

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
  const finance = paid
    ? 'abbezahlt'
    : row.financingEnd
      ? `bis ${row.financingEnd}`
      : row.financingEndRaw || '—';

  const upcoming = [
    deadlineEntry('TÜV', row.deadlines.tuv),
    deadlineEntry('SP', row.deadlines.sp),
    deadlineEntry('Tacho', row.deadlines.tacho),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    id: row.id,
    plate: row.plate,
    vehicle: row.vehicle || '—',
    firstRegistration: row.firstRegistration || '—',
    location: row.samsara.location || (row.samsara.connected ? 'Noch keine Live-Daten' : '—'),
    locationAge: row.samsara.connected ? relativeTime(row.samsara.lastSeenAt) : 'Keine Samsara-Daten',
    mileage: row.samsara.odometerKm === null ? '—' : `${numberFormatter.format(row.samsara.odometerKm)} km`,
    tuv: formatMonth(row.deadlines.tuv?.dueDate),
    tuvState: row.deadlines.tuv?.state ?? 'none',
    sp: formatMonth(row.deadlines.sp?.dueDate),
    spState: row.deadlines.sp?.state ?? 'none',
    tacho: formatMonth(row.deadlines.tacho?.dueDate),
    tachoState: row.deadlines.tacho?.state ?? 'none',
    camera: row.cameraInstalled,
    wrapped: row.wrapped,
    samsara: row.samsara.connected,
    samsaraOnline: row.samsara.online,
    vin: row.vin || '—',
    inventory: row.inventoryNumber || '—',
    insurance: row.insuranceNumber || '—',
    taxNumber: row.taxNumber || '—',
    finance,
    rate: paid || !Number.isFinite(numericRate) ? '—' : moneyFormatter.format(numericRate),
    documentCount: row.documentCount,
    documentsNotes: row.documentsNotes || undefined,
    upcoming,
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

export default function Fuhrpark(){
 const [fleet,setFleet]=useState<LoadedVehicle[]>(fallbackVehicles);
 const [selected,setSelected]=useState<Vehicle>(fallbackVehicles[3]);
 const [usingDatabase,setUsingDatabase]=useState(false);
 const [reloadToken,setReloadToken]=useState(0);

 useEffect(()=>{
   const controller = new AbortController();
   fetch('/api/vehicles',{signal:controller.signal})
     .then(response=>{
       if(!response.ok) throw new Error(`Fleet API ${response.status}`);
       return response.json();
     })
     .then((payload:{vehicles?:ApiVehicle[]})=>{
       if(!payload.vehicles?.length) return;
       const mapped=payload.vehicles.map(mapApiVehicle);
       setFleet(mapped);
       setUsingDatabase(true);
       setSelected(current=>mapped.find(vehicle=>vehicle.plate===current.plate) ?? mapped[0]);
     })
     .catch(error=>{
       if(error?.name!=='AbortError') console.info('Using Fuhrpark demo fallback until database is available.');
     });
   return ()=>controller.abort();
 },[reloadToken]);

 const stats=useMemo(()=>({
   total:fleet.length,
   tuvWarning:fleet.filter(v=>v.tuvState==='warning').length,
   tuvCritical:fleet.filter(v=>v.tuvState==='critical').length,
   withoutCamera:fleet.filter(v=>v.camera===false).length,
   notWrapped:fleet.filter(v=>v.wrapped===false).length,
   underway:fleet.filter(v=>v.location.toLowerCase().startsWith('unterwegs')).length,
   online:fleet.filter(v=>v.samsara && (v.samsaraOnline ?? true)).length,
 }),[fleet]);

 const kpis=[
   {icon:Truck,value:String(stats.total),label:'Fahrzeuge gesamt',sub:usingDatabase?'aus Fahrzeugbestand':'+5 diese Woche',kind:'green'},
   {icon:CalendarDays,value:String(stats.tuvWarning),label:'TÜV < 30 Tage',sub:`${stats.tuvWarning} offen`,kind:'orange'},
   {icon:TriangleAlert,value:String(stats.tuvCritical),label:'TÜV überfällig',sub:`${stats.tuvCritical} kritisch`,kind:'red'},
   {icon:Camera,value:String(stats.withoutCamera),label:'Ohne Kamera',sub:`${stats.withoutCamera} Fahrzeuge`,kind:'blue'},
   {icon:Sticker,value:String(stats.notWrapped),label:'Nicht beklebt',sub:`${stats.notWrapped} Fahrzeuge`,kind:'purple'},
   {icon:MapPin,value:String(stats.underway),label:'Unterwegs',sub:'Live via Samsara',kind:'cyan'}
 ];

 const upcoming=useMemo(()=>fleet.flatMap(vehicle=>(vehicle.upcoming ?? []).map(item=>({...item,plate:vehicle.plate})))
   .sort((a,b)=>new Date(a.dueDate).getTime()-new Date(b.dueDate).getTime()).slice(0,4),[fleet]);

 const fallbackTerms=[
   {plate:'TF-LS 1152',type:'TÜV',dueDate:'2026-09-24T00:00:00.000Z'},
   {plate:'TF-LS 999',type:'SP',dueDate:'2026-09-27T00:00:00.000Z'},
   {plate:'TF-LS 1116',type:'Tacho',dueDate:'2026-10-01T00:00:00.000Z'},
   {plate:'TF-LS 1131',type:'TÜV',dueDate:'2026-10-02T00:00:00.000Z'}
 ];
 const terms=usingDatabase?upcoming:fallbackTerms;

 return <div className="appShell"><Sidebar/><main className="main"><Topbar/><div className="content">
   <section className="kpis">{kpis.map(k=>{const I=k.icon;return <div className="kpi" key={k.label}><div className={'kpiIcon '+k.kind}><I size={21}/></div><div><strong>{k.value}</strong><span>{k.label}</span><small>{k.sub}</small></div></div>})}</section>
   <div className="mainGrid"><div><FleetTable vehicles={fleet} onSelect={setSelected}/><VehicleDetail vehicle={selected} onChanged={()=>setReloadToken(value=>value+1)}/></div><aside className="rightRail">
     <div className="railCard"><div className="railHead"><h3>Fahrzeuge live (Samsara)</h3></div><strong className="onlineText">{stats.online} online</strong><div className="miniMap"><span className="m m1">24</span><span className="m m2">13</span><span className="m m3">16</span><span className="m m4">12</span><span className="m m5">7</span><span className="m m6">29</span><span className="m m7">25</span><div className="carPin">🚚</div></div><a>Standorte anzeigen <ArrowRight size={13}/></a></div>
     <div className="railCard"><div className="railHead"><h3>Kritische Alerts</h3><a>Alle anzeigen</a></div><div className="alertRow"><span className="alertIcon redA"><TriangleAlert size={18}/></span><div><strong>{stats.tuvCritical} Fahrzeuge</strong><span>TÜV überfällig</span></div><a>Jetzt prüfen</a></div><div className="alertRow"><span className="alertIcon orangeA"><TriangleAlert size={18}/></span><div><strong>{stats.tuvWarning} Fahrzeuge</strong><span>TÜV in 30 Tagen</span></div><a>Termine prüfen</a></div><div className="alertRow"><span className="alertIcon orangeA"><Camera size={18}/></span><div><strong>{stats.withoutCamera} Fahrzeuge</strong><span>Ohne Kamera</span></div><a>Ausstattung prüfen</a></div></div>
     <div className="railCard"><div className="railHead"><h3>Nächste Termine</h3><a>Alle anzeigen</a></div>{terms.length?terms.map(r=><div className="termRow" key={r.plate+r.type+r.dueDate}><span><Clock3 size={13}/></span><div><strong>{r.plate}</strong><small>{r.type==='SP'?'Sicherheitsprüfung':r.type==='Tacho'?'Tachoprüfung':'TÜV Prüfung'}</small></div><div className="termDate"><strong>{dateFormatter.format(new Date(r.dueDate))}</strong><small>{daysText(r.dueDate)}</small></div></div>):<p className="muted">Noch keine Termine erfasst.</p>}<a className="calendarLink">Kalender öffnen <ArrowRight size={13}/></a></div>
   </aside></div>
 </div></main></div>
}
