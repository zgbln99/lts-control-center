'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function FahrerPage(){
  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrer" subtitle="Personal- und Fahrerdaten"/><div className="content">
    <EntityModule title="Fahrer" subtitle="Aktive und ehemalige Fahrer mit Führerschein- und Fahrerkartei" endpoint="/api/drivers" itemsKey="drivers" createLabel="Fahrer hinzufügen" columns={[
      {key:'personnelNumber',label:'Pers.-Nr.'},{key:'lastName',label:'Nachname'},{key:'firstName',label:'Vorname'},{key:'phone',label:'Telefon'},{key:'language',label:'Sprache'},{key:'status',label:'Status',format:'status'},{key:'employmentStart',label:'Eintritt',format:'date'},{key:'documentCount',label:'Dokumente'}
    ]} detailHrefBase="/fahrer" detailLabel="Fahrerakte öffnen" fields={[
      {key:'personnelNumber',label:'Personalnummer'},{key:'firstName',label:'Vorname',required:true},{key:'lastName',label:'Nachname',required:true},{key:'phone',label:'Telefon',type:'tel'},{key:'email',label:'E-Mail',type:'email'},{key:'language',label:'Sprache',placeholder:'de'},{key:'status',label:'Status',type:'select',options:[{value:'ACTIVE',label:'Aktiv'},{value:'INACTIVE',label:'Inaktiv'},{value:'LEFT',label:'Ausgeschieden'}]},{key:'employmentStart',label:'Eintritt',type:'date'},{key:'employmentEnd',label:'Austritt',type:'date'},{key:'licenseNumber',label:'Führerscheinnummer'},{key:'licenseClasses',label:'Führerscheinklassen',placeholder:'C, CE'},{key:'licenseExpiresAt',label:'Führerschein gültig bis',type:'date'},{key:'driverCardNumber',label:'Fahrerkarte'},{key:'driverCardExpiresAt',label:'Fahrerkarte gültig bis',type:'date'},{key:'code95ExpiresAt',label:'Code 95 gültig bis',type:'date'},{key:'medicalExpiresAt',label:'Ärztliche Untersuchung bis',type:'date'},{key:'notes',label:'Notizen',type:'textarea',wide:true}
    ]}/>
  </div></main></div>
}
