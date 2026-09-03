'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Container, CalendarDays, Wrench, Archive, UserRound, IdCard, CreditCard, MessageCircle, FileText, Workflow, FolderOpen, BarChart3, ReceiptEuro, MapPin, CalendarRange, Boxes, Settings, Bot, ShieldAlert, Files } from 'lucide-react';

const sections = [
  { title:'', items:[{label:'Dashboard', icon:LayoutDashboard, href:'/dashboard'}]},
  { title:'FUHRPARK', items:[
    {label:'Fahrzeuge',icon:Truck,href:'/fuhrpark'},
    {label:'Anhänger',icon:Container,href:'/fuhrpark?typ=anhaenger'},
    {label:'Termine',icon:CalendarDays,href:'/fuhrpark/termine'},
    {label:'Werkstatt',icon:Wrench,href:'/fuhrpark/werkstatt'},
    {label:'Verkauf / Archiv',icon:Archive,href:'/fuhrpark/archiv'},
  ]},
  { title:'FAHRER', items:[
    {label:'Fahrer',icon:UserRound,href:'/fahrer'},
    {label:'Führerscheine',icon:IdCard,href:'/fahrer/fuehrerscheine'},
    {label:'Fahrerkarten',icon:CreditCard,href:'/fahrer/fahrerkarten'},
    {label:'Fahrerdokumente',icon:Files,href:'/fahrer/dokumente'},
    {label:'Verstoßauswertung',icon:ShieldAlert,href:'/fahrer/verstoesse'}
  ]},
  { title:'KOMMUNIKATION', items:[
    {label:'WhatsApp (Chatwoot)',icon:MessageCircle,href:'/kommunikation/whatsapp'},
    {label:'Vorlagen',icon:FileText,href:'/kommunikation/vorlagen'},
    {label:'Automationen',icon:Workflow,href:'/kommunikation/automationen'}
  ]},
  { title:'DOKUMENTE', items:[
    {label:'Dokumente',icon:FolderOpen,href:'/documents'},
    {label:'Vorlagen',icon:FileText,href:'/documents/vorlagen'}
  ]},
  { title:'BERICHTE', items:[
    {label:'Auswertungen',icon:BarChart3,href:'/berichte/auswertungen'},
    {label:'Kosten',icon:ReceiptEuro,href:'/berichte/kosten'}
  ]},
  { title:'INTEGRATIONEN', items:[
    {label:'Samsara',icon:MapPin,href:'/integrationen#samsara'},
    {label:'Urlaubsportal',icon:CalendarRange,href:'/integrationen#urlaub'},
    {label:'n8n Workflows',icon:Boxes,href:'/integrationen#n8n'},
    {label:'Meta (WhatsApp)',icon:Bot,href:'/integrationen#meta'}
  ]}
];

function isActive(pathname:string,href:string){
  if(href==='/fuhrpark') return pathname==='/fuhrpark';
  if(href.startsWith('/fuhrpark?')) return pathname==='/fuhrpark';
  if(href.startsWith('/integrationen')) return pathname==='/integrationen';
  return pathname===href||pathname.startsWith(`${href}/`);
}

export function Sidebar(){
  const pathname=usePathname();
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">L</div><div><strong>LTS</strong><span>LOGISTIK</span></div></div>
    <nav className="navScroll">
      {sections.map((s,idx)=><div className="navSection" key={idx}>{s.title && <div className="navTitle">{s.title}</div>}{s.items.map(i=>{const Icon=i.icon; const active=isActive(pathname,i.href); return <Link href={i.href} key={i.label} className={'navItem '+(active?'navItemActive':'')}><Icon size={17}/><span>{i.label}</span></Link>})}</div>)}
    </nav>
    <div className="sidebarBottom"><Link href="/settings" className={'navItem '+(pathname.startsWith('/settings')?'navItemActive':'')}><Settings size={17}/><span>Einstellungen</span></Link></div>
  </aside>
}
