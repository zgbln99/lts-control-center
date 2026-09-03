'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function DokumentVorlagenPage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Dokumentvorlagen" subtitle="Standardtexte und Dateinamensregeln"/><div className="content"><EntityModule title="Dokumentvorlagen" subtitle="Vorlagen für interne Schreiben, Bestätigungen und standardisierte Dokumente" endpoint="/api/document-templates" itemsKey="templates" createLabel="Vorlage anlegen" deleteLabel="Vorlage deaktivieren" columns={[
 {key:'name',label:'Name'},{key:'category',label:'Kategorie'},{key:'language',label:'Sprache'},{key:'filenamePattern',label:'Dateiname'},{key:'active',label:'Aktiv',format:'boolean'},{key:'updatedAt',label:'Geändert',format:'date'}
]} fields={[
 {key:'name',label:'Name',required:true},{key:'category',label:'Kategorie'},{key:'language',label:'Sprache',placeholder:'de'},{key:'filenamePattern',label:'Dateinamensmuster',wide:true,placeholder:'{{kennzeichen}}_{{datum}}.pdf'},{key:'content',label:'Inhalt',type:'textarea',wide:true,required:true},{key:'active',label:'Aktiv',type:'select',options:[{value:'true',label:'Ja'},{value:'false',label:'Nein'}]}
]}/></div></main></div>}
