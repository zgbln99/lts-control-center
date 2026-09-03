'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function KostenPage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Kosten" subtitle="Fahrzeug- und Betriebskosten"/><div className="content"><EntityModule title="Kostenbuch" subtitle="Manuelle Kosten heute, automatisierte Diesel-/Maut-/Leasingdaten später über dieselbe Struktur" endpoint="/api/costs" itemsKey="costs" createLabel="Kosten erfassen" deleteLabel="Kostenposition löschen" columns={[
 {key:'date',label:'Datum',format:'date'},{key:'vehicle.plate',label:'Fahrzeug'},{key:'category',label:'Kategorie',format:'status'},{key:'amount',label:'Betrag',format:'money'},{key:'vendor',label:'Lieferant'},{key:'invoiceNumber',label:'Rechnung'},{key:'description',label:'Beschreibung'},{key:'source',label:'Quelle'}
]} fields={[
 {key:'date',label:'Datum',type:'date',required:true},{key:'plate',label:'Kennzeichen',placeholder:'optional'},{key:'personnelNumber',label:'Personalnummer Fahrer',placeholder:'optional'},{key:'category',label:'Kategorie',type:'select',options:[{value:'FUEL',label:'Diesel / Energie'},{value:'MAUT',label:'Maut'},{value:'LEASING',label:'Leasing'},{value:'INSURANCE',label:'Versicherung'},{value:'TAX',label:'Steuer'},{value:'SERVICE',label:'Service'},{value:'REPAIR',label:'Reparatur'},{value:'TIRES',label:'Reifen'},{value:'CLEANING',label:'Reinigung'},{value:'OTHER',label:'Sonstiges'}]},{key:'amount',label:'Betrag (€)',type:'number',required:true},{key:'vendor',label:'Lieferant'},{key:'invoiceNumber',label:'Rechnungsnummer'},{key:'source',label:'Quelle',placeholder:'manuell / import / API'},{key:'description',label:'Beschreibung',type:'textarea',wide:true}
]}/></div></main></div>}
