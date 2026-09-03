'use client';
import { useMemo, useState } from 'react';
import { Check, X, MoreHorizontal, SlidersHorizontal, Columns3, Plus } from 'lucide-react';
import { Vehicle } from '@/lib/demo';

function YesNo({yes}:{yes:boolean}) {return yes?<span className="iconOk"><Check size={16}/></span>:<span className="iconBad"><X size={16}/></span>}
function TuvBadge({v}:{v:Vehicle}){return <span className={'badge '+(v.tuvState==='ok'?'badgeOk':v.tuvState==='warning'?'badgeWarn':v.tuvState==='critical'?'badgeBad':'')}>{v.tuv}</span>}

export function FleetTable({vehicles,onSelect}:{vehicles:Vehicle[];onSelect:(v:Vehicle)=>void}){
 const [query,setQuery]=useState('');
 const data=useMemo(()=>vehicles.filter(v=>[v.plate,v.vehicle,v.vin,v.inventory,v.location].join(' ').toLowerCase().includes(query.toLowerCase())),[query,vehicles]);
 return <div className="tableCard">
   <div className="filters">
     <label><span>Standort</span><select><option>Alle Standorte</option></select></label>
     <label><span>Typ</span><select><option>Alle</option></select></label>
     <label><span>TÜV</span><select><option>Alle</option></select></label>
     <label><span>Ausstattung</span><select><option>Alle</option></select></label>
     <label><span>Samsara</span><select><option>Alle</option></select></label>
     <button className="filterBtn"><SlidersHorizontal size={15}/>Mehr Filter</button>
     <div className="filterSpacer"/>
     <button className="filterBtn"><Columns3 size={15}/>Spalten</button>
     <button className="greenBtn"><Plus size={16}/>Fahrzeug hinzufügen</button>
   </div>
   <div className="tableSearchMobile"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kennzeichen, VIN, Inventarnummer…"/></div>
   <div className="tableWrap"><table><thead><tr><th>Kennzeichen</th><th>Fahrzeug</th><th>Erstzulassung</th><th>Standort (live)</th><th>Kilometer</th><th>TÜV</th><th>Kamera</th><th>Beklebung</th><th>Samsara</th><th>Aktionen</th></tr></thead>
   <tbody>{data.map(v=><tr key={v.id ?? v.plate} onClick={()=>onSelect(v)}><td className="plateCell"><i className={'rowState '+(v.tuvState==='critical'?'rowCritical':v.tuvState==='warning'?'rowWarning':'rowOk')}></i><strong>{v.plate}</strong></td><td>{v.vehicle}</td><td>{v.firstRegistration}</td><td><strong>{v.location}</strong><small>{v.locationAge}</small></td><td>{v.mileage}</td><td><TuvBadge v={v}/></td><td><YesNo yes={v.camera}/></td><td><YesNo yes={v.wrapped}/></td><td>{v.samsara?<span className="online">Online</span>:<span className="muted">—</span>}</td><td><button className="dots" onClick={event=>event.stopPropagation()}><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div>
 </div>
}
