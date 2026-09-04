'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, IdCard, Mail, Phone, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

type DriverDetail={
  id:string;
  samsaraId:string|null;
  samsaraName:string|null;
  samsaraSyncedAt:string|null;
  profileImageUrl:string|null;
  personnelNumber:string|null;
  firstName:string;
  lastName:string;
  phone:string|null;
  email:string|null;
  language:string;
  status:string;
  licenseNumber:string|null;
  licenseState:string|null;
  driverCardNumber:string|null;
  notes:string|null;
};

function dateTime(value:string|null){
  if(!value)return'—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':date.toLocaleString('de-DE');
}

export function DriverProfile({driverId}:{driverId:string}){
  const [driver,setDriver]=useState<DriverDetail|null>(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');

  async function load(){
    setLoading(true);setMessage('');
    try{
      const response=await fetch(`/api/drivers/${driverId}`,{cache:'no-store'});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Fahrer konnte nicht geladen werden.');
      setDriver(payload);
    }catch(error){setMessage(error instanceof Error?error.message:'Fehler beim Laden.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[driverId]);

  if(loading&&!driver)return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerakte" subtitle="Samsara"/><div className="content"><div className="tableCard driverProfileLoading">Fahrerdaten werden aus Samsara geladen ...</div></div></main></div>;
  if(!driver)return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerakte" subtitle="Samsara"/><div className="content"><div className="pageMessage">{message||'Fahrer nicht gefunden.'}</div></div></main></div>;

  const name=driver.samsaraName||[driver.firstName,driver.lastName].filter(Boolean).join(' ')||'Fahrer';

  return <div className="appShell"><Sidebar/><main className="main"><Topbar title={name} subtitle="Fahrerakte · Samsara"/><div className="content driverProfileContent">
    <div className="driverProfileTop">
      <Link href="/fahrer" className="filterBtn"><ArrowLeft size={14}/>Zurück zu Fahrer</Link>
      <button className="filterBtn" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/>{loading?'Synchronisieren ...':'Neu laden'}</button>
    </div>
    {message&&<div className="moduleInlineMessage">{message}</div>}

    <section className="driverHeroCard">
      {driver.profileImageUrl?<img className="driverAvatarPhoto" src={driver.profileImageUrl} alt={name}/>:<div className="driverAvatarLarge"><UserRound size={34}/></div>}
      <div className="driverHeroMain">
        <span className={`entityStatus status-${driver.status.toLowerCase()}`}>{driver.status}</span>
        <h2>{name}</h2>
        <p>Samsara ID {driver.samsaraId??'—'}{driver.personnelNumber?` · Pers.-Nr. ${driver.personnelNumber}`:''}</p>
      </div>
      <div className="driverQuickContact">
        {driver.phone&&<a href={`tel:${driver.phone}`}><Phone size={15}/>{driver.phone}</a>}
        {driver.email&&<a href={`mailto:${driver.email}`}><Mail size={15}/>{driver.email}</a>}
      </div>
    </section>

    <div className="driverProfileGrid">
      <section className="tableCard driverDataCard">
        <div className="modulePageHead"><div><h2>Daten aus Samsara</h2><p>Nur Lesen · Änderungen werden in Samsara vorgenommen</p></div><ShieldCheck size={18}/></div>
        <div className="driverInfoGrid">
          <div><span>Name</span><strong>{name}</strong></div>
          <div><span>Status</span><strong>{driver.status}</strong></div>
          <div><span>Personalnummer</span><strong>{driver.personnelNumber??'—'}</strong></div>
          <div><span>Sprache / Locale</span><strong>{driver.language||'—'}</strong></div>
          <div><span>Telefon</span><strong>{driver.phone??'—'}</strong></div>
          <div><span>E-Mail</span><strong>{driver.email??'—'}</strong></div>
          <div><span>Führerscheinnummer</span><strong>{driver.licenseNumber??'—'}</strong></div>
          <div><span>Führerschein Region</span><strong>{driver.licenseState??'—'}</strong></div>
          <div className="wide"><span>Tachographenkarte</span><strong>{driver.driverCardNumber??'—'}</strong></div>
          {driver.notes&&<div className="wide"><span>Samsara Notizen</span><strong>{driver.notes}</strong></div>}
        </div>
      </section>

      <section className="tableCard driverDeadlineCard">
        <div className="modulePageHead"><div><h2>Quelle</h2><p>Synchronisationsstatus</p></div><IdCard size={18}/></div>
        <div className="driverSourceCard">
          <span>Datenquelle</span><strong>Samsara</strong>
          <small>Letzte Synchronisierung: {dateTime(driver.samsaraSyncedAt)}</small>
        </div>
        <p className="driverSourceNote">Control Center speichert hier nur eine lokale Kopie für Suche, DDD-Verknüpfung und Auswertungen. Es gibt keine feste Fahrer-Fahrzeug-Zuordnung.</p>
      </section>
    </div>
  </div></main></div>;
}
