'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';
import { N8nWorkflowPanel } from '@/components/n8n-workflow-panel';

export default function AutomationenPage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Automationen" subtitle="n8n und interne Workflows"/><div className="content"><EntityModule title="Automationen" subtitle="Definitionen im Control Center, ausführbar über n8n oder interne Jobs" endpoint="/api/automations" itemsKey="automations" createLabel="Automation anlegen" deleteLabel="Automation deaktivieren" columns={[
  {key:'name',label:'Name'},{key:'provider',label:'Provider',format:'status'},{key:'triggerType',label:'Trigger'},{key:'schedule',label:'Zeitplan'},{key:'externalId',label:'Externe ID'},{key:'active',label:'Aktiv',format:'boolean'},{key:'lastRunAt',label:'Letzter Lauf',format:'date'},{key:'lastStatus',label:'Status',format:'status'}
]} fields={[
  {key:'name',label:'Name',required:true},{key:'provider',label:'Provider',type:'select',options:[{value:'N8N',label:'n8n'},{value:'SYSTEM',label:'Control Center'}]},{key:'triggerType',label:'Trigger',placeholder:'schedule / webhook / event'},{key:'schedule',label:'Zeitplan',placeholder:'z. B. 0 8 * * *'},{key:'externalId',label:'n8n Workflow ID',wide:true},{key:'description',label:'Beschreibung',type:'textarea',wide:true},{key:'active',label:'Aktiv',type:'select',options:[{value:'false',label:'Nein'},{value:'true',label:'Ja'}]}
]}/><N8nWorkflowPanel/></div></main></div>}
