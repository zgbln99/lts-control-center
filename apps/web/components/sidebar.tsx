'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Container, CalendarDays, Wrench, Archive, UserRound, IdCard, CreditCard, MessageCircle, FileText, Workflow, FolderOpen, BarChart3, ReceiptEuro, MapPin, CalendarRange, Boxes, Settings, Bot } from 'lucide-react';

const sections = [
  { title:'', items:[{label:'Dashboard', icon:LayoutDashboard, href:'/dashboard'}]},
  { title:'FUHRPARK', items:[
    {label:'Fahrzeuge',icon:Truck,href:'/fuhrpark'},
    {label:'Anhänger',icon:Container,href:'/fuhrpark?typ=anhaenger'},
    {label:'Termine',icon:CalendarDays,href:'/fuhrpark/termine'},
    {label:'Werkstatt',icon:Wrench,href:'#'},
    {label:'Verkauf / Archiv',icon:Archive,href:'/fuhrpark/archiv'},
  ]},
  { title:'FAHRER', items:[{label:'Fahrer',icon:UserRound,href:'#'},{label:'Führerscheine',icon:IdCard,href:'#'},{label:'Fahrerkarten',icon:CreditCard,href:'#'}]},
  { title:'KOMMUNIKATION', items:[{label:'WhatsApp (Chatwoot)',icon:MessageCircle,href:'/integrationen#chatwoot'},{label:'Vorlagen',icon:FileText,href:'#'},{label:'Automationen',icon:Workflow,href:'/integrationen#n8n'}]},
  { title:'DOKUMENTE', items:[{label:'Dokumente',icon:FolderOpen,href:'/documents'},{label:'Vorlagen',icon:FileText,href:'#'}]},
  { title:'BERICHTE', items:[{label:'Auswertungen',icon:BarChart3,href:'#'},{label:'Kosten',icon:ReceiptEuro,href:'#'}]},
  { title:'INTEGRATIONEN', items:[{label:'Samsara',icon:MapPin,href:'/integrationen#samsara'},{label:'Urlaubsportal',icon:CalendarRange,href:'/integrationen#urlaub'},{label:'n8n Workflows',icon:Boxes,href:'/integrationen#n8n'},{label:'Meta (WhatsApp)',icon:Bot,href:'/integrationen#meta'}]}
];

function isActive(pathname:string,href:string){
  if(href==='/fuhrpark') return pathname==='/fuhrpark';
  if(href.startsWith('/fuhrpark?')) return false;
  if(href.startsWith('/integrationen')) return pathname==='/integrationen';
  return href!=='#' && pathname===href;
}

export function Sidebar(){
  const pathname=usePathname();
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">L</div><div><strong>LTS</strong><span>LOGISTIK</span></div></div>
    <nav className="navScroll">
      {sections.map((s,idx)=><div className="navSection" key={idx}>{s.title && <div className="navTitle">{s.title}</div>}{s.items.map(i=>{const Icon=i.icon; const active=isActive(pathname,i.href); return <Link href={i.href} key={i.label} className={'navItem '+(active?'navItemActive':'')}><Icon size={17}/><span>{i.label}</span></Link>})}</div>)}
    </nav>
    <div className="sidebarBottom"><Link href="/integrationen" className="navItem"><Settings size={17}/><span>Einstellungen</span></Link></div>
  </aside>
}
