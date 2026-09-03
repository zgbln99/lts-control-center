'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function FuehrerscheinePage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Führerscheine" subtitle="Gültigkeiten und Klassen"/><div className="content"><EntityModule title="Führerscheine" subtitle="Ablaufende Dokumente werden automatisch hervorgehoben" endpoint="/api/drivers" itemsKey="drivers" allowDelete={false} columns={[
  {key:'personnelNumber',label:'Pers.-Nr.'},{key:'lastName',label:'Nachname'},{key:'firstName',label:'Vorname'},{key:'licenseNumber',label:'Führerscheinnr.'},{key:'licenseClasses',label:'Klassen',format:'array'},{key:'licenseExpiresAt',label:'Gültig bis',format:'date'},{key:'code95ExpiresAt',label:'Code 95',format:'date'},{key:'medicalExpiresAt',label:'Untersuchung',format:'date'},{key:'status',label:'Status',format:'status'}
]}/></div></main></div>}
