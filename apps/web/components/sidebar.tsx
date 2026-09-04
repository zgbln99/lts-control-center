'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Truck, Container, CalendarDays, Wrench, Archive, UserRound, IdCard, CreditCard,
  MessageCircle, FileText, Workflow, FolderOpen, BarChart3, ReceiptEuro, Settings, ShieldAlert, Files, Boxes
} from 'lucide-react';

type Role='ADMIN'|'FUHRPARK'|'PERSONAL'|'DISPOSITION'|'READ_ONLY';
type Item={label:string;icon:any;href:string;roles?:Role[]};

const all:Role[]=['ADMIN','FUHRPARK','PERSONAL','DISPOSITION','READ_ONLY'];
const fleet:Role[]=['ADMIN','FUHRPARK','PERSONAL','DISPOSITION','READ_ONLY'];
const workshop:Role[]=['ADMIN','FUHRPARK'];
const drivers:Role[]=['ADMIN','PERSONAL','DISPOSITION'];
const violations:Role[]=['ADMIN','FUHRPARK','PERSONAL','DISPOSITION'];
const communication:Role[]=['ADMIN','DISPOSITION'];
const reports:Role[]=['ADMIN','FUHRPARK','READ_ONLY'];

const sections:{title:string;items:Item[]}[]=[
  {title:'',items:[{label:'Dashboard',icon:LayoutDashboard,href:'/dashboard',roles:all}]},
  {title:'FUHRPARK',items:[
    {label:'Fahrzeuge',icon:Truck,href:'/fuhrpark',roles:fleet},
    {label:'Anhänger',icon:Container,href:'/fuhrpark/anhaenger',roles:fleet},
    {label:'Termine',icon:CalendarDays,href:'/fuhrpark/termine',roles:fleet},
    {label:'Werkstatt',icon:Wrench,href:'/fuhrpark/werkstatt',roles:workshop},
    {label:'Verkauf / Archiv',icon:Archive,href:'/fuhrpark/archiv',roles:fleet},
  ]},
  {title:'FAHRER',items:[
    {label:'Fahrer',icon:UserRound,href:'/fahrer',roles:drivers},
    {label:'Führerscheine',icon:IdCard,href:'/fahrer/fuehrerscheine',roles:drivers},
    {label:'Fahrerkarten',icon:CreditCard,href:'/fahrer/fahrerkarten',roles:drivers},
    {label:'Fahrerdokumente',icon:Files,href:'/fahrer/dokumente',roles:drivers},
    {label:'Verstoßauswertung',icon:ShieldAlert,href:'/fahrer/verstoesse',roles:violations},
  ]},
  {title:'KOMMUNIKATION',items:[
    {label:'WhatsApp (Chatwoot)',icon:MessageCircle,href:'/kommunikation/whatsapp',roles:communication},
    {label:'Vorlagen',icon:FileText,href:'/kommunikation/vorlagen',roles:communication},
    {label:'Automationen',icon:Workflow,href:'/kommunikation/automationen',roles:communication},
  ]},
  {title:'DOKUMENTE',items:[
    {label:'Dokumente',icon:FolderOpen,href:'/documents',roles:all},
    {label:'Vorlagen',icon:FileText,href:'/documents/vorlagen',roles:all},
  ]},
  {title:'BERICHTE',items:[
    {label:'Auswertungen',icon:BarChart3,href:'/berichte/auswertungen',roles:reports},
    {label:'Kosten',icon:ReceiptEuro,href:'/berichte/kosten',roles:reports},
  ]},
  {title:'INTEGRATIONEN',items:[
    {label:'Integrationen',icon:Boxes,href:'/integrationen',roles:all},
  ]},
];

function currentItem(pathname:string,items:Item[]){
  return items
    .filter(item=>pathname===item.href||pathname.startsWith(`${item.href}/`))
    .sort((a,b)=>b.href.length-a.href.length)[0]?.href??'';
}

export function Sidebar(){
  const pathname=usePathname();
  const [role,setRole]=useState<Role|null>(null);

  useEffect(()=>{
    fetch('/api/auth/me')
      .then(r=>r.ok?r.json():null)
      .then(p=>{if(p?.user?.role)setRole(p.user.role as Role)})
      .catch(()=>{});
  },[]);

  const visible=(item:Item)=>!item.roles||!role||item.roles.includes(role);
  const visibleItems=useMemo(()=>sections.flatMap(section=>section.items).filter(visible),[role]);
  const active=currentItem(pathname,visibleItems);

  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">L</div><div><strong>LTS</strong><span>LOGISTIK</span></div></div>
    <nav className="navScroll">
      {sections.map((section,index)=>{
        const items=section.items.filter(visible);
        if(!items.length)return null;
        return <div className="navSection" key={index}>
          {section.title&&<div className="navTitle">{section.title}</div>}
          {items.map(item=>{
            const Icon=item.icon;
            return <Link href={item.href} key={item.label} className={'navItem '+(active===item.href?'navItemActive':'')}><Icon size={17}/><span>{item.label}</span></Link>;
          })}
        </div>;
      })}
    </nav>
    {role==='ADMIN'&&<div className="sidebarBottom"><Link href="/settings" className={'navItem '+(pathname.startsWith('/settings')?'navItemActive':'')}><Settings size={17}/><span>Einstellungen</span></Link></div>}
  </aside>;
}
