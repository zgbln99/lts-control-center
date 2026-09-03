import { FileText, ExternalLink, Check, X } from 'lucide-react';
import { Vehicle } from '@/lib/demo';

export function VehicleDetail({vehicle}:{vehicle:Vehicle}){
 return <section className="vehicleDetail">
   <div className="vehiclePhoto"><div className="truckIllustration"><div className="truckCab"></div><div className="truckBox"></div><div className="road"></div></div><button><FileText size={16}/>Dokumente (8)</button></div>
   <div className="vehicleMain">
     <div className="vehicleTitle"><h2>{vehicle.plate}</h2></div><p>{vehicle.vehicle} <span>·</span> {vehicle.firstRegistration}</p>
     <div className="infoGrid">
       <div><span>VIN</span><strong>{vehicle.vin}</strong></div><div><span>Inventarnummer</span><strong>{vehicle.inventory}</strong></div><div><span>Versicherungsnummer</span><strong>{vehicle.insurance}</strong></div><div><span>Kfz-Steuernummer</span><strong>{vehicle.taxNumber}</strong></div><div><span>Finanzierung</span><strong>{vehicle.finance}</strong></div><div><span>Rate</span><strong>{vehicle.rate}</strong></div>
     </div>
   </div>
   <div className="detailCards">
     <div className={'deadlineCard '+(vehicle.tuvState==='critical'?'deadlineCritical':'')}><span>TÜV</span><strong>{vehicle.tuv}</strong><small>{vehicle.tuvState==='critical'?'überfällig':'gültig'}</small></div>
     <div className="deadlineCard deadlineWarn"><span>SP</span><strong>11/2026</strong><small>in 41 Tagen</small></div>
     <div className="deadlineCard"><span>Tacho</span><strong className="greenText">07/2027</strong><small>in 339 Tagen</small></div>
     <div className="deadlineCard"><span>Kamera</span><strong className={vehicle.camera?'greenText':'redText'}>{vehicle.camera?<><Check size={15}/> Vorhanden</>:<><X size={15}/> Nicht vorhanden</>}</strong></div>
     <div className="deadlineCard"><span>Beklebung</span><strong className={vehicle.wrapped?'greenText':'redText'}>{vehicle.wrapped?<><Check size={15}/> LTS</>:<><X size={15}/> Nicht beklebt</>}</strong></div>
     <div className="samsaraBox"><h3>Samsara <em>{vehicle.samsara?'Online':'Nicht verbunden'}</em></h3><div><span>Standort</span><strong>{vehicle.location}</strong></div><div><span>Letzte Aktualisierung</span><strong>vor 2 Minuten</strong></div><div><span>Kilometerstand</span><strong>{vehicle.mileage}</strong></div><button>In Samsara öffnen <ExternalLink size={14}/></button></div>
     <div className="docsBox"><h3>Unterlagen vorhanden</h3><p>Vito, vom Autohaus Mettchen</p><p>Finanzierung bank11, Vertrag 14213</p><p>Zulassung, Kfz-Schein K., Brief O, HA</p><p>Merkblatt</p><button>Alle Unterlagen anzeigen</button></div>
   </div>
 </section>
}
