import { lazy, Suspense } from 'react'
import { CssVarsProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { theme } from './theme'
import { SettingsProvider } from './context/SettingsContext'
import { ConnectionStatusProvider } from './context/ConnectionStatusContext'
import AppShell from './components/Layout/AppShell'
import ErrorBoundary from './components/Common/ErrorBoundary'

// Each page is its own chunk instead of one ~750KB bundle: @mui/x-charts
// (only used by Activity/Traffic/Memory) and every other page's code no
// longer has to download before someone who only ever opens Settings sees
// anything.
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const ProxiesPage = lazy(() => import('./pages/ProxiesPage'))
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'))
const RulesPage = lazy(() => import('./pages/RulesPage'))
const ProvidersPage = lazy(() => import('./pages/ProvidersPage'))
const LogsPage = lazy(() => import('./pages/LogsPage'))
const TrafficPage = lazy(() => import('./pages/TrafficPage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const DnsPage = lazy(() => import('./pages/DnsPage'))
const CachePage = lazy(() => import('./pages/CachePage'))
const ConfigsPage = lazy(() => import('./pages/ConfigsPage'))
const GrpcPage = lazy(() => import('./pages/GrpcPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress size={28} />
    </Box>
  )
}

export default function App() {
  return (
    <CssVarsProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <ErrorBoundary>
        <SettingsProvider>
          <ConnectionStatusProvider>
            <BrowserRouter>
              <AppShell>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<ActivityPage />} />
                    <Route path="/overview" element={<OverviewPage />} />
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
                </Suspense>
              </AppShell>
            </BrowserRouter>
          </ConnectionStatusProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </CssVarsProvider>
  )
}
