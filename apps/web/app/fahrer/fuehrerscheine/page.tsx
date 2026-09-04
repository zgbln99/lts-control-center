'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function FuehrerscheinePage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Führerscheine" subtitle="Führerscheindaten aus Samsara"/><div className="content"><EntityModule title="Führerscheine" subtitle="Nummer und Ausstellungsregion werden aus Samsara synchronisiert." endpoint="/api/drivers" itemsKey="drivers" allowDelete={false} columns={[
  {key:'samsaraName',label:'Fahrer'},{key:'personnelNumber',label:'Pers.-Nr.'},{key:'licenseNumber',label:'Führerscheinnr.'},{key:'licenseState',label:'Region'},{key:'phone',label:'Telefon'},{key:'status',label:'Status',format:'status'}
]} detailHrefBase="/fahrer" detailLabel="Fahrerakte öffnen"/></div></main></div>}