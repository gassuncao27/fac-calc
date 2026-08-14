import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FileUp, Sheet } from 'lucide-react';
import { db } from '../db/database';
import { exportBackup, parseBackup, restoreBackup, type BackupPreview } from '../services/backupService';
import { exportAllDataCsv } from '../services/csvService';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { formatDateTime } from '../utils/format';

export function BackupPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);

  const counts = useLiveQuery(
    async () => ({
      clients: await db.clients.count(),
      operations: await db.operations.count(),
      receivables: await db.receivables.count(),
    }),
    [],
    { clients: 0, operations: 0, receivables: 0 },
  );

  async function handleExport() {
    try {
      await exportBackup();
      toast('Backup exportado.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    }
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      setPreview(parseBackup(text));
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Arquivo de backup inválido.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRestore() {
    if (!preview) return;
    try {
      await restoreBackup(preview.data);
      toast('Backup restaurado com sucesso.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível restaurar o backup.', 'error');
    } finally {
      setPreview(null);
    }
  }

  async function handleCsvExport() {
    try {
      const [operations, clients, receivables] = await Promise.all([
        db.operations.toArray(),
        db.clients.toArray(),
        db.receivables.toArray(),
      ]);
      exportAllDataCsv(operations, clients, receivables);
      toast('Arquivos CSV exportados.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Backup e restauração"
        subtitle="Todos os dados ficam neste aparelho. Faça backups periodicamente."
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Exportar backup</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gera um arquivo JSON com {counts.clients} cliente(s), {counts.operations} operação(ões),{' '}
            {counts.receivables} título(s) e as configurações.
          </p>
          <Button onClick={handleExport} className="mt-4">
            <Download className="size-4" />
            Exportar backup
          </Button>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Restaurar backup</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecione um arquivo de backup do FactorCalc. Os dados atuais serão substituídos após a sua
            confirmação.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="mt-4">
            <FileUp className="size-4" />
            Selecionar arquivo…
          </Button>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Exportar todos os dados em CSV</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gera planilhas de operações e títulos compatíveis com Excel.
          </p>
          <Button variant="secondary" onClick={handleCsvExport} className="mt-4">
            <Sheet className="size-4" />
            Exportar CSV
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={preview !== null}
        title="Restaurar backup"
        description={
          preview ? (
            <>
              O arquivo contém <strong>{preview.clients}</strong> cliente(s),{' '}
              <strong>{preview.operations}</strong> operação(ões) e <strong>{preview.receivables}</strong>{' '}
              título(s), exportado em {formatDateTime(preview.exportedAt)}.
              <br />
              <br />
              <strong>Todos os dados atuais deste aparelho serão substituídos.</strong> Deseja continuar?
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Substituir dados"
        danger
        onConfirm={handleRestore}
        onCancel={() => setPreview(null)}
      />
    </div>
  );
}
