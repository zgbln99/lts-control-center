'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Truck, Container, CalendarDays, Wrench, Archive, UserRound, IdCard, CreditCard, MessageCircle, FileText, Workflow, FolderOpen, BarChart3, ReceiptEuro, MapPin, CalendarRange, Boxes, Settings, Bot, ShieldAlert, Files } from 'lucide-react';

type Role='ADMIN'|'FUHRPARK'|'PERSONAL'|'DISPOSITION'|'READ_ONLY';
type Item={label:string;icon:any;href:string;roles?:Role[]};
const all:Role[]=['ADMIN','FUHRPARK','PERSONAL','DISPOSITION','READ_ONLY'];
const fleet:Role[]=['ADMIN','FUHRPARK','PERSONAL','DISPOSITION','READ_ONLY'];
const workshop:Role[]=['ADMIN','FUHRPARK'];
const drivers:Role[]=['ADMIN','PERSONAL','DISPOSITION'];
const violations:Role[]=['ADMIN','FUHRPARK','PERSONAL','DISPOSITION'];
const communication:Role[]=['ADMIN','DISPOSITION'];
const reports:Role[]=['ADMIN','FUHRPARK','READ_ONLY'];

const sections:{title:string;items:Item[]}[] = [
  { title:'', items:[{label:'Dashboard', icon:LayoutDashboard, href:'/dashboard',roles:all}]},
  { title:'FUHRPARK', items:[
    {label:'Fahrzeuge',icon:Truck,href:'/fuhrpark',roles:fleet},
    {label:'Anhänger',icon:Container,href:'/fuhrpark?typ=anhaenger',roles:fleet},
    {label:'Termine',icon:CalendarDays,href:'/fuhrpark/termine',roles:fleet},
    {label:'Werkstatt',icon:Wrench,href:'/fuhrpark/werkstatt',roles:workshop},
    {label:'Verkauf / Archiv',icon:Archive,href:'/fuhrpark/archiv',roles:fleet},
  ]},
  { title:'FAHRER', items:[
    {label:'Fahrer',icon:UserRound,href:'/fahrer',roles:drivers},
    {label:'Führerscheine',icon:IdCard,href:'/fahrer/fuehrerscheine',roles:drivers},
    {label:'Fahrerkarten',icon:CreditCard,href:'/fahrer/fahrerkarten',roles:drivers},
    {label:'Fahrerdokumente',icon:Files,href:'/fahrer/dokumente',roles:drivers},
    {label:'Verstoßauswertung',icon:ShieldAlert,href:'/fahrer/verstoesse',roles:violations}
  ]},
  { title:'KOMMUNIKATION', items:[
    {label:'WhatsApp (Chatwoot)',icon:MessageCircle,href:'/kommunikation/whatsapp',roles:communication},
    {label:'Vorlagen',icon:FileText,href:'/kommunikation/vorlagen',roles:communication},
    {label:'Automationen',icon:Workflow,href:'/kommunikation/automationen',roles:communication}
  ]},
  { title:'DOKUMENTE', items:[
    {label:'Dokumente',icon:FolderOpen,href:'/documents',roles:all},
    {label:'Vorlagen',icon:FileText,href:'/documents/vorlagen',roles:all}
  ]},
  { title:'BERICHTE', items:[
    {label:'Auswertungen',icon:BarChart3,href:'/berichte/auswertungen',roles:reports},
    {label:'Kosten',icon:ReceiptEuro,href:'/berichte/kosten',roles:reports}
  ]},
  { title:'INTEGRATIONEN', items:[
    {label:'Samsara',icon:MapPin,href:'/integrationen#samsara',roles:all},
    {label:'Urlaubsportal',icon:CalendarRange,href:'/integrationen#urlaub',roles:all},
    {label:'n8n Workflows',icon:Boxes,href:'/integrationen#n8n',roles:all},
    {label:'Meta (WhatsApp)',icon:Bot,href:'/integrationen#meta',roles:all}
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
  const [role,setRole]=useState<Role|null>(null);
  useEffect(()=>{fetch('/api/auth/me').then(r=>r.ok?r.json():null).then(p=>{if(p?.user?.role)setRole(p.user.role as Role)}).catch(()=>{})},[]);
  const visible=(item:Item)=>!item.roles||!role||item.roles.includes(role);
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">L</div><div><strong>LTS</strong><span>LOGISTIK</span></div></div>
    <nav className="navScroll">
      {sections.map((s,idx)=>{const items=s.items.filter(visible);if(!items.length)return null;return <div className="navSection" key={idx}>{s.title && <div className="navTitle">{s.title}</div>}{items.map(i=>{const Icon=i.icon; const active=isActive(pathname,i.href); return <Link href={i.href} key={i.label} className={'navItem '+(active?'navItemActive':'')}><Icon size={17}/><span>{i.label}</span></Link>})}</div>})}
    </nav>
    {role==='ADMIN'&&<div className="sidebarBottom"><Link href="/settings" className={'navItem '+(pathname.startsWith('/settings')?'navItemActive':'')}><Settings size={17}/><span>Einstellungen</span></Link></div>}
  </aside>
}
