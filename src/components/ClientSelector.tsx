import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { Select } from './ui/Field';

interface ClientSelectorProps {
  value: string | null;
  onChange: (clientId: string | null) => void;
}

/** Seleção de cliente existente — ou cálculo sem cliente. */
export function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [], []);
  return (
    <Select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Cliente"
    >
      <option value="">Sem cliente</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </Select>
  );
}
