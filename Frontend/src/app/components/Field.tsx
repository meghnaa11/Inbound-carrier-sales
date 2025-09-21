import { ReactNode } from 'react';
export default function Field({label, children}:{label:string; children:ReactNode}){
  return (<div><label>{label}</label>{children}</div>);
}
