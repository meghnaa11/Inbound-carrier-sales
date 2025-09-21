'use client';
import { Load } from '@/lib/api';

export default function DataTable({ rows }: { rows: Load[] }){
  if(!rows?.length) return <p className="p">No rows.</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Load ID</th><th>Origin</th><th>Destination</th>
          <th>Pickup</th><th>Delivery</th>
          <th>Equipment</th><th>Rate</th><th>Miles</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(ld => (
          <tr key={ld.load_id}>
            <td>{ld.load_id}</td>
            <td>{ld.origin}</td>
            <td>{ld.destination}</td>
            <td>{ld.pickup_datetime}</td>
            <td>{ld.delivery_datetime}</td>
            <td>{ld.equipment_type}</td>
            <td>${ld.loadboard_rate}</td>
            <td>{ld.miles ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
