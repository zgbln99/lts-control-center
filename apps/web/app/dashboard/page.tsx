'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { ArrowRight, BarChart3, CalendarDays, FileText, Gauge, MapPin, MessageCircle, ReceiptEuro, ShieldAlert, Truck, UserRound, Workflow, Wrench } from 'lucide-react';

type DashboardStats={vehicles:number;online:number;critical:number;warning:number;documents:number};

export default function Dashboard(){
  const [stats,setStats]=useState<DashboardStats>({vehicles:0,online:0,critical:0,warning:0,documents:0});
  const [live,setLive]=useState(false);
  useEffect(()=>{Promise.all([fetch('/api/vehicles'),fetch('/api/deadlines'),fetch('/api/documents')]).then(async([vehiclesResponse,deadlinesResponse,documentsResponse])=>{if(!vehiclesResponse.ok||!deadlinesResponse.ok||!documentsResponse.ok)throw new Error('Dashboard API unavailable');const [vehiclesPayload,deadlinesPayload,documentsPayload]=await Promise.all([vehiclesResponse.json(),deadlinesResponse.json(),documentsResponse.json()]);const vehicles=vehiclesPayload.vehicles??[];setStats({vehicles:vehicles.length,online:vehicles.filter((vehicle:any)=>vehicle.samsara?.connected&&vehicle.samsara?.online!==false).length,critical:deadlinesPayload.counts?.critical??0,warning:deadlinesPayload.counts?.warning??0,documents:documentsPayload.total??0});setLive(true)}).catch(()=>setLive(false))},[]);

  const modules=[
    {title:'Fuhrpark',text:'Fahrzeuge, Anhänger, Ausstattung, Finanzierung und Live-Daten.',href:'/fuhrpark',icon:Truck,status:'Aktiv'},
    {title:'Termine',text:'TÜV, SP, Tachoprüfung, Service und optionale UVV.',href:'/fuhrpark/termine',icon:CalendarDays,status:'Aktiv'},
    {title:'Werkstatt',text:'Reparaturen, Service, Kosten und offene Arbeiten.',href:'/fuhrpark/werkstatt',icon:Wrench,status:'Aktiv'},
    {title:'Fahrer',text:'Personalstamm, Führerscheine, Fahrerkarten und Dokumente.',href:'/fahrer',icon:UserRound,status:'Aktiv'},
    {title:'Verstoßauswertung',text:'DDD-/Transinet-Batches, Verstöße und Bestätigung.',href:'/fahrer/verstoesse',icon:ShieldAlert,status:'Bereit'},
    {title:'Dokumente',text:'Zentrale Fahrzeugkartothek und MEGA S4.',href:'/documents',icon:FileText,status:'Aktiv'},
    {title:'WhatsApp',text:'Chatwoot-Konversationen und lokale Kommunikationsvorlagen.',href:'/kommunikation/whatsapp',icon:MessageCircle,status:'Adapter bereit'},
    {title:'Automationen',text:'n8n- und Systemworkflows mit Zeitplan und Status.',href:'/kommunikation/automationen',icon:Workflow,status:'Adapter bereit'},
    {title:'Kosten',text:'Diesel, Maut, Leasing, Reparaturen und weitere Kosten.',href:'/berichte/kosten',icon:ReceiptEuro,status:'Aktiv'},
    {title:'Auswertungen',text:'Operative KPIs, Kosten und ablaufende Fahrerdokumente.',href:'/berichte/auswertungen',icon:BarChart3,status:'Aktiv'},
    {title:'Integrationen',text:'Samsara, MEGA S4, Chatwoot, n8n, Meta und Urlaubsportal.',href:'/integrationen',icon:MapPin,status:'Bereit'},
  ];

  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="LTS Control Center" subtitle="Zentrale Übersicht der operativen Systeme" searchPlaceholder="Fahrzeug, Dokument oder Modul suchen ..."/><div className="content dashboardContent">
    <section className="dashboardHero"><div><span className="dashboardEyebrow">LTS LOGISTIK · OPERATIONS</span><h2>Alles, was den Fuhrpark bewegt.</h2><p>Eine Oberfläche für Fuhrpark, Fahrer, Termine, Dokumente, Kommunikation, Kosten und Integrationen. Externe Systeme liefern Daten über klar getrennte Adapter.</p></div><div className={'systemPulse '+(live?'pulseLive':'')}><span></span><div><strong>{live?'System live':'Datenbank noch nicht verbunden'}</strong><small>{live?'Daten werden direkt aus PostgreSQL geladen.':'Control Center ist vorbereitet und wartet auf die spätere Entwicklungsumgebung.'}</small></div></div></section>
    <section className="kpis dashboardKpis"><div className="kpi"><div className="kpiIcon green"><Truck size={21}/></div><div><strong>{stats.vehicles}</strong><span>Aktive Fahrzeuge</span><small>Fuhrpark</small></div></div><div className="kpi"><div className="kpiIcon cyan"><MapPin size={21}/></div><div><strong>{stats.online}</strong><span>Samsara online</span><small>Live-Telemetrie</small></div></div><div className="kpi"><div className="kpiIcon red"><Gauge size={21}/></div><div><strong>{stats.critical}</strong><span>Überfällige Termine</span><small>kritisch</small></div></div><div className="kpi"><div className="kpiIcon orange"><CalendarDays size={21}/></div><div><strong>{stats.warning}</strong><span>In 30 Tagen fällig</span><small>beobachten</small></div></div><div className="kpi"><div className="kpiIcon blue"><FileText size={21}/></div><div><strong>{stats.documents}</strong><span>Dokumente</span><small>MEGA S4 / Kartothek</small></div></div></section>
    <section className="moduleCards">{modules.map(module=>{const Icon=module.icon;return <Link href={module.href} className="moduleCard" key={module.title}><div className="moduleCardIcon"><Icon size={21}/></div><div className="moduleCardBody"><div className="moduleCardHead"><h3>{module.title}</h3><span>{module.status}</span></div><p>{module.text}</p></div><ArrowRight size={16}/></Link>})}</section>
  </div></main></div>
}
