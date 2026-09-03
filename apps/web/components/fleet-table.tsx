'use client';
import { useMemo, useState } from 'react';
import { Check, X, MoreHorizontal, SlidersHorizontal, Columns3, Plus } from 'lucide-react';
import { Vehicle } from '@/lib/demo';
import { AddVehicleDrawer } from '@/components/add-vehicle-drawer';

function YesNo({yes}:{yes:boolean|null}) {
 if (yes===null) return <span className="muted">—</span>;
 return yes?<span className="iconOk"><Check size={16}/></span>:<span className="iconBad"><X size={16}/></span>;
}
function TuvBadge({v}:{v:Vehicle}){return <span className={'badge '+(v.tuvState==='ok'?'badgeOk':v.tuvState==='warning'?'badgeWarn':v.tuvState==='critical'?'badgeBad':'')}>{v.tuv}</span>}

function vehicleType(vehicle:Vehicle){
 const text=vehicle.vehicle.toLowerCase();
 if(text.includes('anhänger')||text.includes('auflieger')) return 'TRAILER';
 if(text.includes('vito')||text.includes('sprinter')||text.includes('transit')||text.includes('transporter')) return 'VAN';
 if(text.includes('atego')||text.includes('actros')||text.includes('lkw')||text.includes('sattelzug')) return 'TRUCK';
 return 'OTHER';
}

export function FleetTable({vehicles,onSelect,onChanged}:{vehicles:Vehicle[];onSelect:(v:Vehicle)=>void;onChanged?:()=>void|Promise<void>}){
 const [query,setQuery]=useState('');
 const [addOpen,setAddOpen]=useState(false);
 const [locationFilter,setLocationFilter]=useState('ALL');
 const [typeFilter,setTypeFilter]=useState('ALL');
 const [tuvFilter,setTuvFilter]=useState('ALL');
 const [equipmentFilter,setEquipmentFilter]=useState('ALL');
 const [samsaraFilter,setSamsaraFilter]=useState('ALL');

 const locations=useMemo(()=>Array.from(new Set(vehicles.map(v=>v.location).filter(location=>location&&location!=='—'&&!location.toLowerCase().startsWith('unterwegs')))).sort((a,b)=>a.localeCompare(b,'de')),[vehicles]);
 const activeFilters=[locationFilter,typeFilter,tuvFilter,equipmentFilter,samsaraFilter].filter(value=>value!=='ALL').length;

 const data=useMemo(()=>vehicles.filter(v=>{
   const matchesQuery=[v.plate,v.vehicle,v.vin,v.inventory,v.location].join(' ').toLowerCase().includes(query.toLowerCase());
   if(!matchesQuery) return false;
   if(locationFilter==='UNDERWAY'&&!v.location.toLowerCase().startsWith('unterwegs')) return false;
   if(locationFilter==='NO_LIVE'&&v.location!=='—') return false;
   if(!['ALL','UNDERWAY','NO_LIVE'].includes(locationFilter)&&v.location!==locationFilter) return false;
   if(typeFilter!=='ALL'&&vehicleType(v)!==typeFilter) return false;
   if(tuvFilter!=='ALL'&&v.tuvState!==tuvFilter) return false;
   if(equipmentFilter==='NO_CAMERA'&&v.camera!==false) return false;
   if(equipmentFilter==='NO_WRAP'&&v.wrapped!==false) return false;
   if(samsaraFilter==='YES'&&!v.samsara) return false;
   if(samsaraFilter==='NO'&&v.samsara) return false;
   return true;
 }),[query,vehicles,locationFilter,typeFilter,tuvFilter,equipmentFilter,samsaraFilter]);

 function resetFilters(){setLocationFilter('ALL');setTypeFilter('ALL');setTuvFilter('ALL');setEquipmentFilter('ALL');setSamsaraFilter('ALL');setQuery('')}

 return <>
 <div className="tableCard">
   <div className="filters">
     <label><span>Standort</span><select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}><option value="ALL">Alle Standorte</option><option value="UNDERWAY">Unterwegs</option><option value="NO_LIVE">Ohne Live-Daten</option>{locations.map(location=><option value={location} key={location}>{location}</option>)}</select></label>
     <label><span>Typ</span><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="ALL">Alle</option><option value="TRUCK">Lkw</option><option value="VAN">Transporter</option><option value="TRAILER">Anhänger / Auflieger</option><option value="OTHER">Sonstige</option></select></label>
     <label><span>TÜV</span><select value={tuvFilter} onChange={e=>setTuvFilter(e.target.value)}><option value="ALL">Alle</option><option value="critical">Überfällig</option><option value="warning">≤ 30 Tage</option><option value="ok">OK</option><option value="none">Ohne Termin</option></select></label>
     <label><span>Ausstattung</span><select value={equipmentFilter} onChange={e=>setEquipmentFilter(e.target.value)}><option value="ALL">Alle</option><option value="NO_CAMERA">Ohne Kamera</option><option value="NO_WRAP">Nicht beklebt</option></select></label>
     <label><span>Samsara</span><select value={samsaraFilter} onChange={e=>setSamsaraFilter(e.target.value)}><option value="ALL">Alle</option><option value="YES">Verbunden</option><option value="NO">Nicht verbunden</option></select></label>
     <button className="filterBtn" onClick={resetFilters}><SlidersHorizontal size={15}/>{activeFilters?`Filter zurücksetzen (${activeFilters})`:'Mehr Filter'}</button>
     <div className="filterSpacer"/>
     <button className="filterBtn"><Columns3 size={15}/>Spalten</button>
     <button className="greenBtn" onClick={()=>setAddOpen(true)}><Plus size={16}/>Fahrzeug hinzufügen</button>
   </div>
   <div className="tableSearchMobile"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kennzeichen, VIN, Inventarnummer…"/></div>
   <div className="tableWrap"><table><thead><tr><th>Kennzeichen</th><th>Fahrzeug</th><th>Erstzulassung</th><th>Standort (live)</th><th>Kilometer</th><th>TÜV</th><th>Kamera</th><th>Beklebung</th><th>Samsara</th><th>Aktionen</th></tr></thead>
   <tbody>{data.map(v=><tr key={v.id ?? v.plate} onClick={()=>onSelect(v)}><td className="plateCell"><i className={'rowState '+(v.tuvState==='critical'?'rowCritical':v.tuvState==='warning'?'rowWarning':'rowOk')}></i><strong>{v.plate}</strong></td><td>{v.vehicle}</td><td>{v.firstRegistration}</td><td><strong>{v.location}</strong><small>{v.locationAge}</small></td><td>{v.mileage}</td><td><TuvBadge v={v}/></td><td><YesNo yes={v.camera}/></td><td><YesNo yes={v.wrapped}/></td><td>{v.samsara?<span className="online">Online</span>:<span className="muted">—</span>}</td><td><button className="dots" onClick={event=>event.stopPropagation()}><MoreHorizontal size={17}/></button></td></tr>)}{!data.length&&<tr><td colSpan={10} className="emptyCell">Keine Fahrzeuge für diese Filter.</td></tr>}</tbody></table></div>
 </div>
 <AddVehicleDrawer open={addOpen} onClose={()=>setAddOpen(false)} onCreated={onChanged}/>
 </>
}
