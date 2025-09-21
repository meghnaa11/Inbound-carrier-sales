'use client';
import { useState } from 'react';
import Field from './components/Field';
import { createLoad, Load } from '@/lib/api';

export default function AddLoadPage(){
  const [form,setForm] = useState<Load>({
    load_id: '', origin: '', destination: '',
    pickup_datetime: new Date().toISOString(),
    delivery_datetime: new Date(Date.now()+24*3600*1000).toISOString(),
    equipment_type: 'Dry Van', loadboard_rate: 1200,
    miles: undefined, notes: '', weight: undefined, commodity_type: '',
  });
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);
  function set<K extends keyof Load>(k:K,v:Load[K]){ setForm(p=>({...p,[k]:v})); }

  async function onSubmit(e:React.FormEvent){
    e.preventDefault(); setBusy(true); setMsg(null);
    try{
      if(!form.load_id.trim()) throw new Error('Load ID is required');
      if(!form.origin.trim()||!form.destination.trim()) throw new Error('Origin & Destination are required');
      await createLoad(form);
      setMsg('✅ Load created');
    }catch(e:any){ setMsg(`❌ ${e.message??e}`); }
    finally{ setBusy(false); }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Add New Load</h1>
        <p className="p">POSTs to <span className="kbd">/loads</span>.</p>
        <form onSubmit={onSubmit}>
          <div className="grid">
            <Field label="Load ID"><input value={form.load_id} onChange={e=>set('load_id',e.target.value)} required/></Field>
            <Field label="Equipment Type">
              <select value={form.equipment_type} onChange={e=>set('equipment_type', e.target.value as Load['equipment_type'])}>
                <option>Dry Van</option><option>Reefer</option><option>Flatbed</option>
              </select>
            </Field>
            <Field label="Origin"><input value={form.origin} onChange={e=>set('origin',e.target.value)} required/></Field>
            <Field label="Destination"><input value={form.destination} onChange={e=>set('destination',e.target.value)} required/></Field>
            <Field label="Pickup Datetime (ISO)"><input value={form.pickup_datetime} onChange={e=>set('pickup_datetime',e.target.value)} /></Field>
            <Field label="Delivery Datetime (ISO)"><input value={form.delivery_datetime} onChange={e=>set('delivery_datetime',e.target.value)} /></Field>
            <Field label="Loadboard Rate ($)"><input type="number" value={form.loadboard_rate} onChange={e=>set('loadboard_rate', Number(e.target.value))} /></Field>
            <Field label="Miles"><input type="number" value={form.miles ?? ''} onChange={e=>set('miles', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Weight (lbs)"><input type="number" value={form.weight ?? ''} onChange={e=>set('weight', e.target.value===''?undefined:Number(e.target.value))} /></Field>
            <Field label="Commodity Type"><input value={form.commodity_type ?? ''} onChange={e=>set('commodity_type',e.target.value)} /></Field>
          </div>
          <Field label="Notes"><textarea rows={3} value={form.notes ?? ''} onChange={e=>set('notes',e.target.value)} /></Field>
          <div className="btnrow">
            <button type="button" className="ghost" onClick={()=>{
              setForm({ load_id:'', origin:'', destination:'',
                pickup_datetime:new Date().toISOString(),
                delivery_datetime:new Date(Date.now()+24*3600*1000).toISOString(),
                equipment_type:'Dry Van', loadboard_rate:1200,
                miles:undefined, notes:'', weight:undefined, commodity_type:''});
            }}>Clear</button>
            <button disabled={busy}>{busy?'Saving…':'Create Load'}</button>
          </div>
          {msg && <p className="p" style={{marginTop:12}}>{msg}</p>}
        </form>
      </div>
    </div>
  );
}
