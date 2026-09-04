'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function FahrerPage(){
  return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrer" subtitle="Synchronisiert aus Samsara"/><div className="content">
    <EntityModule title="Fahrer" subtitle="Samsara ist die einzige Datenquelle. Änderungen erfolgen direkt in Samsara." endpoint="/api/drivers" itemsKey="drivers" columns={[
      {key:'samsaraName',label:'Name'},{key:'personnelNumber',label:'Pers.-Nr.'},{key:'phone',label:'Telefon'},{key:'email',label:'E-Mail'},{key:'licenseNumber',label:'Führerschein'},{key:'driverCardNumber',label:'Fahrerkarte'},{key:'language',label:'Sprache'},{key:'status',label:'Status',format:'status'}
    ]} detailHrefBase="/fahrer" detailLabel="Fahrerakte öffnen"/>
  </div></main></div>
}