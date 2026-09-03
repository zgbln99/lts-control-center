'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { FleetTable } from '@/components/fleet-table';
import { VehicleDetail } from '@/components/vehicle-detail';
import { vehicles, Vehicle } from '@/lib/demo';
import { Truck, CalendarDays, TriangleAlert, Camera, Sticker, MapPin, ArrowRight, Clock3 } from 'lucide-react';

const kpis=[
 {icon:Truck,value:'248',label:'Fahrzeuge gesamt',sub:'+5 diese Woche',kind:'green'},
 {icon:CalendarDays,value:'12',label:'TÜV < 30 Tage',sub:'12 offen',kind:'orange'},
 {icon:TriangleAlert,value:'3',label:'TÜV überfällig',sub:'3 kritisch',kind:'red'},
 {icon:Camera,value:'17',label:'Ohne Kamera',sub:'17 Fahrzeuge',kind:'blue'},
 {icon:Sticker,value:'24',label:'Nicht beklebt',sub:'24 Fahrzeuge',kind:'purple'},
 {icon:MapPin,value:'142',label:'Unterwegs',sub:'Live via Samsara',kind:'cyan'}
];

export default function Fuhrpark(){
 const [selected,setSelected]=useState<Vehicle>(vehicles[3]);
 return <div className="appShell"><Sidebar/><main className="main"><Topbar/><div className="content">
   <section className="kpis">{kpis.map(k=>{const I=k.icon;return <div className="kpi" key={k.label}><div className={'kpiIcon '+k.kind}><I size={21}/></div><div><strong>{k.value}</strong><span>{k.label}</span><small>{k.sub}</small></div></div>})}</section>
   <div className="mainGrid"><div><FleetTable onSelect={setSelected}/><VehicleDetail vehicle={selected}/></div><aside className="rightRail">
     <div className="railCard"><div className="railHead"><h3>Fahrzeuge live (Samsara)</h3></div><strong className="onlineText">142 online</strong><div className="miniMap"><span className="m m1">24</span><span className="m m2">13</span><span className="m m3">16</span><span className="m m4">12</span><span className="m m5">7</span><span className="m m6">29</span><span className="m m7">25</span><div className="carPin">🚚</div></div><a>Standorte anzeigen <ArrowRight size={13}/></a></div>
     <div className="railCard"><div className="railHead"><h3>Kritische Alerts</h3><a>Alle anzeigen</a></div><div className="alertRow"><span className="alertIcon redA"><TriangleAlert size={18}/></span><div><strong>3 Fahrzeuge</strong><span>TÜV überfällig</span></div><a>Jetzt prüfen</a></div><div className="alertRow"><span className="alertIcon orangeA"><TriangleAlert size={18}/></span><div><strong>12 Fahrzeuge</strong><span>TÜV in 30 Tagen</span></div><a>Termine prüfen</a></div><div className="alertRow"><span className="alertIcon orangeA"><Camera size={18}/></span><div><strong>17 Fahrzeuge</strong><span>Ohne Kamera</span></div><a>Ausstattung prüfen</a></div></div>
     <div className="railCard"><div className="railHead"><h3>Nächste Termine</h3><a>Alle anzeigen</a></div>{[['TF-LS 1152','TÜV Prüfung','24.09.2026','in 7 Tagen'],['TF-LS 999','Sicherheitsprüfung','27.09.2026','in 10 Tagen'],['TF-LS 1116','Tachoprüfung','01.10.2026','in 14 Tagen'],['TF-LS 1131','TÜV Prüfung','02.10.2026','in 16 Tagen']].map(r=><div className="termRow" key={r[0]+r[1]}><span><Clock3 size={13}/></span><div><strong>{r[0]}</strong><small>{r[1]}</small></div><div className="termDate"><strong>{r[2]}</strong><small>{r[3]}</small></div></div>)}<a className="calendarLink">Kalender öffnen <ArrowRight size={13}/></a></div>
   </aside></div>
 </div></main></div>
}
