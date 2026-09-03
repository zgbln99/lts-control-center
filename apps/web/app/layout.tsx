import './globals.css';
import './modules.css';
import './drawer.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LTS Control Center',
  description: 'LTS Logistik internal operations platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
