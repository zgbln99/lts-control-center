'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FileText, ExternalLink, Check, X, Pencil, ImagePlus } from 'lucide-react';
import { DeadlineState, Vehicle } from '@/lib/fleet-types';
import { VehicleCardDrawer } from '@/components/vehicle-card-drawer';
import { SamsaraMiniMap } from '@/components/samsara-mini-map';

function deadlineClass(state: DeadlineState | undefined) {if (state === 'critical') return 'deadlineCard deadlineCritical';if (state === 'warning') return 'deadlineCard deadlineWarn';return 'deadlineCard'}
function deadlineText(state: DeadlineState | undefined) {if (state === 'critical') return 'überfällig';if (state === 'warning') return 'bald fällig';if (state === 'none') return 'kein Termin';return 'gültig'}
function EquipmentState({value,positive,negative}:{value:boolean|null;positive:string;negative:string}) {if (value === null) return <strong className="muted">Noch nicht erfasst</strong>;return value?<strong className="greenText"><Check size={15}/> {positive}</strong>:<strong className="redText"><X size={15}/> {negative}</strong>}

export function VehicleDetail({vehicle,onClose,onChanged}:{vehicle:Vehicle;onClose:()=>void;onChanged?:()=>void|Promise<void>}){
 const [drawerOpen,setDrawerOpen]=useState(false); const [canWrite,setCanWrite]=useState(false);
 useEffect(()=>{fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(p=>setCanWrite(['ADMIN','FUHRPARK'].includes(p?.user?.role))).catch(()=>setCanWrite(false))},[]);
 const docs=(vehicle.documentsNotes ?? '').split(',').map(item=>item.trim()).filter(Boolean);
 const hasLocation=Number.isFinite(vehicle.latitude)&&Number.isFinite(vehicle.longitude);
 return <>
 <section className="vehicleDetail vehicleDetailInline">
   <button className="vehicleDetailClose" onClick={onClose} aria-label="Fahrzeugdetails schließen"><X size={20}/></button>
   <div className="vehiclePhoto">{vehicle.photoUrl?<img className="vehiclePhotoImage" src={vehicle.photoUrl} alt={`${vehicle.plate} Fahrzeug`}/>:<div className="truckIllustration"><div className="truckCab"></div><div className="truckBox"></div><div className="road"></div></div>}<div className="vehiclePhotoActions">{canWrite&&<button onClick={()=>setDrawerOpen(true)}><ImagePlus size={16}/>{vehicle.photoUrl?'Foto ändern':'Foto hinzufügen'}</button>}<button onClick={()=>setDrawerOpen(true)}><FileText size={16}/>Dokumente ({vehicle.documentCount ?? 0})</button></div></div>
   <div className="vehicleMain"><div className="vehicleTitle"><h2>{vehicle.plate}</h2>{canWrite&&<button className="vehicleEditButton" onClick={()=>setDrawerOpen(true)}><Pencil size={13}/> Bearbeiten</button>}</div><p>{vehicle.vehicle} <span>·</span> {vehicle.firstRegistration}</p>
     <div className="infoGrid"><div><span>VIN</span><strong>{vehicle.vin}</strong></div><div><span>Inventarnummer</span><strong>{vehicle.inventory}</strong></div><div><span>Versicherungsnummer</span><strong>{vehicle.insurance}</strong></div><div><span>Kfz-Steuernummer</span><strong>{vehicle.taxNumber}</strong></div><div><span>Finanzierung</span><strong>{vehicle.finance}</strong></div><div><span>Rate</span><strong>{vehicle.rate}</strong></div><div><span>Leistung</span><strong>{vehicle.power??'—'}</strong></div><div><span>Gesamtmasse</span><strong>{vehicle.grossWeight??'—'}</strong></div></div>
   </div>
   <div className="detailCards">
     <div className={deadlineClass(vehicle.tuvState)}><span>TÜV</span><strong>{vehicle.tuv}</strong><small>{deadlineText(vehicle.tuvState)}</small></div>
     <div className={deadlineClass(vehicle.spState)}><span>SP</span><strong>{vehicle.sp ?? '—'}</strong><small>{deadlineText(vehicle.spState)}</small></div>
     <div className={deadlineClass(vehicle.tachoState)}><span>Tacho</span><strong className={vehicle.tachoState==='ok'?'greenText':undefined}>{vehicle.tacho ?? '—'}</strong><small>{deadlineText(vehicle.tachoState)}</small></div><div className={deadlineClass(vehicle.uvvState)}><span>UVV</span><strong className={vehicle.uvvState==='ok'?'greenText':undefined}>{vehicle.uvv ?? '—'}</strong><small>{deadlineText(vehicle.uvvState)}</small></div>
     <div className="deadlineCard"><span>Kamera</span><EquipmentState value={vehicle.camera} positive="Vorhanden" negative="Nicht vorhanden"/></div>
     <div className="deadlineCard"><span>Beklebung</span><EquipmentState value={vehicle.wrapped} positive="LTS" negative="Nicht beklebt"/></div>
     <div className="samsaraBox"><h3>Samsara <em>{vehicle.samsara?'Verbunden':'Nicht verbunden'}</em></h3><div><span>Standort</span><strong>{vehicle.location}</strong></div><div><span>Letzte Aktualisierung</span><strong>{vehicle.locationAge}</strong></div><div><span>Kilometerstand</span><strong>{vehicle.mileage}</strong></div><Link href="/integrationen#samsara">Samsara Status <ExternalLink size={14}/></Link></div>
     {hasLocation&&<div className="vehicleLocationMap"><div className="vehicleLocationMapHead"><div><span>Live-Standort</span><strong>{vehicle.location}</strong></div><small>{vehicle.locationAge}</small></div><SamsaraMiniMap vehicles={[{id:vehicle.id??vehicle.plate,plate:vehicle.plate,latitude:vehicle.latitude??null,longitude:vehicle.longitude??null,online:vehicle.samsaraOnline===true,location:vehicle.location,locationAge:vehicle.locationAge}]}/></div>}
     <div className="docsBox"><h3>Unterlagen vorhanden</h3>{docs.length?docs.slice(0,4).map((item,index)=><p key={`${item}-${index}`}>{item}</p>):<p className="muted">Noch keine Unterlagen synchronisiert</p>}<button onClick={()=>setDrawerOpen(true)}>Alle Unterlagen anzeigen</button></div>
   </div>
 </section>
 <VehicleCardDrawer vehicleId={vehicle.id} plate={vehicle.plate} open={drawerOpen} readOnly={!canWrite} onClose={()=>setDrawerOpen(false)} onChanged={onChanged}/>
 </>
}
