'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav(){
  const pathname = usePathname();
  const is = (p:string) => pathname === p ? 'active' : '';
  return (
    <nav className="nav">
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span className="badge">Load Portal</span>
      </div>
      <div style={{display:'flex',gap:8}}>
        <Link className={is('/')} href="/">Add Load</Link>
        <Link className={is('/charts')} href="/charts">Charts</Link>
        <a href={(process.env.NEXT_PUBLIC_API_BASE||'') + '/health'} target="_blank" rel="noreferrer">Health</a>
      </div>
    </nav>
  );
}
