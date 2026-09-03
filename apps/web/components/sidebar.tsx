'use client';
import Link from 'next/link';
import { LayoutDashboard, Truck, Container, CalendarDays, Wrench, Archive, UserRound, IdCard, CreditCard, MessageCircle, FileText, Workflow, FolderOpen, BarChart3, ReceiptEuro, MapPin, CalendarRange, Boxes, Settings, Bot } from 'lucide-react';

const sections = [
  { title:'', items:[{label:'Dashboard', icon:LayoutDashboard, href:'/dashboard'}]},
  { title:'FUHRPARK', items:[{label:'Fahrzeuge',icon:Truck,href:'/fuhrpark',active:true},{label:'Anhänger',icon:Container,href:'#'},{label:'Termine',icon:CalendarDays,href:'#'},{label:'Werkstatt',icon:Wrench,href:'#'},{label:'Verkauf / Archiv',icon:Archive,href:'#'}]},
  { title:'FAHRER', items:[{label:'Fahrer',icon:UserRound,href:'#'},{label:'Führerscheine',icon:IdCard,href:'#'},{label:'Fahrerkarten',icon:CreditCard,href:'#'}]},
  { title:'KOMMUNIKATION', items:[{label:'WhatsApp (Chatwoot)',icon:MessageCircle,href:'#'},{label:'Vorlagen',icon:FileText,href:'#'},{label:'Automationen',icon:Workflow,href:'#'}]},
  { title:'DOKUMENTE', items:[{label:'Dokumente',icon:FolderOpen,href:'#'},{label:'Vorlagen',icon:FileText,href:'#'}]},
  { title:'BERICHTE', items:[{label:'Auswertungen',icon:BarChart3,href:'#'},{label:'Kosten',icon:ReceiptEuro,href:'#'}]},
  { title:'INTEGRATIONEN', items:[{label:'Samsara',icon:MapPin,href:'#'},{label:'Urlaubsportal',icon:CalendarRange,href:'#'},{label:'n8n Workflows',icon:Boxes,href:'#'},{label:'Meta (WhatsApp)',icon:Bot,href:'#'}]}
];

export function Sidebar(){
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">L</div><div><strong>LTS</strong><span>LOGISTIK</span></div></div>
    <nav className="navScroll">
      {sections.map((s,idx)=><div className="navSection" key={idx}>{s.title && <div className="navTitle">{s.title}</div>}{s.items.map(i=>{const Icon=i.icon; return <Link href={i.href} key={i.label} className={'navItem '+(i.active?'navItemActive':'')}><Icon size={17}/><span>{i.label}</span></Link>})}</div>)}
    </nav>
    <div className="sidebarBottom"><a className="navItem"><Settings size={17}/><span>Einstellungen</span></a></div>
  </aside>
}
