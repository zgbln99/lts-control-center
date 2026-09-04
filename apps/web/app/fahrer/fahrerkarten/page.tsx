'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function FahrerkartenPage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Fahrerkarten" subtitle="Tachographenkarten aus Samsara"/><div className="content"><EntityModule title="Fahrerkarten" subtitle="Kartennummern werden direkt aus Samsara synchronisiert." endpoint="/api/drivers" itemsKey="drivers" allowDelete={false} columns={[
  {key:'samsaraName',label:'Fahrer'},{key:'personnelNumber',label:'Pers.-Nr.'},{key:'driverCardNumber',label:'Kartennummer'},{key:'phone',label:'Telefon'},{key:'status',label:'Status',format:'status'}
]} detailHrefBase="/fahrer" detailLabel="Fahrerakte öffnen"/></div></main></div>}