import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PinGate } from './components/PinLock';
import { ToastProvider } from './components/ui/Toast';
import { DashboardPage } from './pages/Dashboard';
import { OperationFormPage } from './pages/OperationForm';
import { OperationsListPage } from './pages/OperationsList';
import { OperationDetailPage } from './pages/OperationDetail';
import { ClientsPage } from './pages/Clients';
import { SettingsPage } from './pages/Settings';
import { BackupPage } from './pages/Backup';

export function App() {
  return (
    <ToastProvider>
      <PinGate>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/operacoes" element={<OperationsListPage />} />
              <Route path="/operacoes/nova" element={<OperationFormPage />} />
              <Route path="/operacoes/:id" element={<OperationDetailPage />} />
              <Route path="/operacoes/:id/editar" element={<OperationFormPage />} />
              <Route path="/clientes" element={<ClientsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
              <Route path="/backup" element={<BackupPage />} />
              <Route path="*" element={<DashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PinGate>
    </ToastProvider>
  );
}
