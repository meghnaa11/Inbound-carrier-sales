import './globals.css';
import type { ReactNode } from 'react';
import Nav from './components/Nav';

export const metadata = { title: 'Load Portal', description: 'Add loads and view charts' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
