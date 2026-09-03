import { Bell, Search, Sun } from 'lucide-react';

type TopbarProps = {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
};

export function Topbar({
  title='Fuhrpark',
  subtitle='Übersicht aller Fahrzeuge',
  searchPlaceholder='Fahrzeug suchen (Kennzeichen, VIN, Inventarnr. ...)',
}:TopbarProps){return <header className="topbar">
  <div><h1>{title}</h1><p>{subtitle}</p></div>
  <div className="topSearch"><Search size={17}/><span>{searchPlaceholder}</span><kbd>⌘ K</kbd></div>
  <div className="topActions"><button><Sun size={18}/></button><button className="bell"><Bell size={18}/><em>8</em></button><div className="user"><div className="avatar">C</div><div><strong>Clemens</strong><span>Administrator</span></div></div></div>
</header>}
