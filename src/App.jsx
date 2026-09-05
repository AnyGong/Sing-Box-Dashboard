import { CssVarsProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { theme } from './theme'
import { SettingsProvider } from './context/SettingsContext'
import AppShell from './components/Layout/AppShell'

import DashboardPage from './pages/DashboardPage'
import ProxiesPage from './pages/ProxiesPage'
import ConnectionsPage from './pages/ConnectionsPage'
import RulesPage from './pages/RulesPage'
import ProvidersPage from './pages/ProvidersPage'
import LogsPage from './pages/LogsPage'
import TrafficPage from './pages/TrafficPage'
import MemoryPage from './pages/MemoryPage'
import DnsPage from './pages/DnsPage'
import CachePage from './pages/CachePage'
import ConfigsPage from './pages/ConfigsPage'
import GrpcPage from './pages/GrpcPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <CssVarsProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <SettingsProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/proxies" element={<ProxiesPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/traffic" element={<TrafficPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/dns" element={<DnsPage />} />
              <Route path="/cache" element={<CachePage />} />
              <Route path="/configs" element={<ConfigsPage />} />
              <Route path="/grpc" element={<GrpcPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </SettingsProvider>
    </CssVarsProvider>
  )
}
