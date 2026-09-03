'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';
import { MetaTemplateManager } from '@/components/meta-template-manager';

export default function KommunikationsVorlagen(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Vorlagen" subtitle="Lokale Kommunikation und Meta WhatsApp Templates"/><div className="content">
  <EntityModule title="Kommunikationsvorlagen" subtitle="Lokale Vorlagen mit optionaler Zuordnung zu Meta WhatsApp Templates" endpoint="/api/message-templates" itemsKey="templates" createLabel="Vorlage anlegen" deleteLabel="Vorlage deaktivieren" columns={[
    {key:'name',label:'Name'},{key:'channel',label:'Kanal',format:'status'},{key:'language',label:'Sprache'},{key:'category',label:'Kategorie'},{key:'metaTemplateName',label:'Meta Template'},{key:'active',label:'Aktiv',format:'boolean'},{key:'updatedAt',label:'Geändert',format:'date'}
  ]} fields={[
    {key:'name',label:'Name',required:true},{key:'channel',label:'Kanal',type:'select',options:[{value:'WHATSAPP',label:'WhatsApp'},{value:'EMAIL',label:'E-Mail'},{value:'LETTER',label:'Brief'},{value:'SYSTEM',label:'System'}]},{key:'language',label:'Sprache',placeholder:'de'},{key:'category',label:'Kategorie'},{key:'subject',label:'Betreff',wide:true},{key:'metaTemplateName',label:'Meta Template Name',wide:true},{key:'body',label:'Inhalt',type:'textarea',required:true,wide:true},{key:'active',label:'Aktiv',type:'select',options:[{value:'true',label:'Ja'},{value:'false',label:'Nein'}]}
  ]}/>
  <MetaTemplateManager/>
</div></main></div>}
