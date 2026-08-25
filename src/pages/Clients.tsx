import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { db } from '../db/database';
import { createClient, deleteClient, searchClients, updateClient } from '../services/clientService';
import type { Client } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, TextInput, Textarea, inputClass } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome ou razão social.'),
  tradeName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

function ClientFormDialog({
  client,
  onClose,
}: {
  client: Client | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? '',
      tradeName: client?.tradeName ?? '',
      document: client?.document ?? '',
      phone: client?.phone ?? '',
      email: client?.email ?? '',
      notes: client?.notes ?? '',
    },
  });

  async function onSubmit(data: ClientFormData) {
    try {
      const input = {
        name: data.name.trim(),
        tradeName: data.tradeName?.trim() || undefined,
        document: data.document?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };
      if (client) {
        await updateClient(client.id, input);
        toast('Cliente atualizado.');
      } else {
        await createClient(input);
        toast('Cliente cadastrado.');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast('Não foi possível salvar o cliente. Tente novamente.', 'error');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={client ? 'Editar cliente' : 'Novo cliente'}
      onClick={onClose}
    >
      <div
        className="max-h-sheet w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-900">{client ? 'Editar cliente' : 'Novo cliente'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <Field label="Nome / Razão social">
            <TextInput {...register('name')} autoFocus placeholder="Ex.: Comercial ABC Ltda" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome fantasia">
              <TextInput {...register('tradeName')} placeholder="Opcional" />
            </Field>
            <Field label="CPF/CNPJ">
              <TextInput {...register('document')} placeholder="Opcional" inputMode="numeric" />
            </Field>
            <Field label="Telefone">
              <TextInput {...register('phone')} placeholder="Opcional" inputMode="tel" type="tel" />
            </Field>
            <Field label="E-mail">
              <TextInput {...register('email')} placeholder="Opcional" inputMode="email" />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </Field>
          </div>
          <Field label="Observações">
            <Textarea {...register('notes')} rows={2} placeholder="Opcional" />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {client ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; client: Client | null }>({ open: false, client: null });
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const { toast } = useToast();

  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), []);

  if (!clients) return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;

  const filtered = searchClients(clients, query);

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await deleteClient(toDelete.id);
      toast('Cliente excluído. As operações dele foram mantidas.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível excluir o cliente.', 'error');
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} ${clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}`}
        actions={
          <Button onClick={() => setDialog({ open: true, client: null })}>
            <Plus className="size-4" />
            Novo cliente
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title="Nenhum cliente cadastrado."
          description="Cadastre clientes para vinculá-los às operações — ou calcule sem cliente."
          action={
            <Button onClick={() => setDialog({ open: true, client: null })}>
              <Plus className="size-4" />
              Novo cliente
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar cliente…"
              aria-label="Pesquisar clientes"
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            <ul className="divide-y divide-slate-50">
              {filtered.map((client) => (
                <li key={client.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{client.name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-slate-400">
                      {[client.tradeName, client.document, client.phone].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, client })}
                    aria-label={`Editar ${client.name}`}
                    className="flex size-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(client)}
                    aria-label={`Excluir ${client.name}`}
                    className="flex size-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-5 py-10 text-center text-sm text-slate-400">
                  Nenhum cliente encontrado para “{query}”.
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {dialog.open && (
        <ClientFormDialog client={dialog.client} onClose={() => setDialog({ open: false, client: null })} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir cliente"
        description={
          <>
            Excluir <strong>{toDelete?.name}</strong>? As operações já registradas serão mantidas, apenas sem o
            vínculo com este cliente.
          </>
        }
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
