'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function FahrerkartenPage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerkarten" subtitle="Kartennummern und Ablaufdaten"/><div className="content"><EntityModule title="Fahrerkarten" subtitle="Zentrale Übersicht für digitale Fahrerkarten" endpoint="/api/drivers" itemsKey="drivers" allowDelete={false} columns={[
  {key:'personnelNumber',label:'Pers.-Nr.'},{key:'lastName',label:'Nachname'},{key:'firstName',label:'Vorname'},{key:'driverCardNumber',label:'Kartennummer'},{key:'driverCardExpiresAt',label:'Gültig bis',format:'date'},{key:'phone',label:'Telefon'},{key:'status',label:'Status',format:'status'}
]}/></div></main></div>}
