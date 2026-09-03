'use client';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { EntityModule } from '@/components/entity-module';

export default function UsersPage(){return <div className="appShell"><Sidebar/><main className="main"><Topbar title="Benutzer" subtitle="Konten und Rollen im Control Center"/><div className="content"><EntityModule title="Benutzerverwaltung" subtitle="Zugriffe werden serverseitig nach Rolle geprüft" endpoint="/api/users" itemsKey="users" createLabel="Benutzer anlegen" deleteLabel="Benutzer deaktivieren" columns={[
 {key:'name',label:'Name'},{key:'email',label:'E-Mail'},{key:'role',label:'Rolle',format:'status'},{key:'active',label:'Aktiv',format:'boolean'},{key:'lastLoginAt',label:'Letzter Login',format:'date'},{key:'createdAt',label:'Angelegt',format:'date'}
]} fields={[
 {key:'name',label:'Name',required:true},{key:'email',label:'E-Mail',type:'email',required:true},{key:'role',label:'Rolle',type:'select',options:[{value:'ADMIN',label:'Administrator'},{value:'FUHRPARK',label:'Fuhrpark'},{value:'PERSONAL',label:'Personal'},{value:'DISPOSITION',label:'Disposition'},{value:'READ_ONLY',label:'Nur lesen'}]},{key:'password',label:'Passwort',placeholder:'bei neuem Benutzer mindestens 10 Zeichen',wide:true},{key:'active',label:'Aktiv',type:'select',options:[{value:'true',label:'Ja'},{value:'false',label:'Nein'}]}
]}/></div></main></div>}
