import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  useMediaQuery,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ActivityIcon from '@mui/icons-material/MonitorHeartOutlined'
import OverviewIcon from '@mui/icons-material/GridViewOutlined'
import HubIcon from '@mui/icons-material/HubOutlined'
import RouteIcon from '@mui/icons-material/AltRouteOutlined'
import RuleIcon from '@mui/icons-material/RuleOutlined'
import CloudSyncIcon from '@mui/icons-material/CloudSyncOutlined'
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernetOutlined'
import ArticleIcon from '@mui/icons-material/ArticleOutlined'
import MemoryIcon from '@mui/icons-material/MemoryOutlined'
import ShowChartIcon from '@mui/icons-material/ShowChartOutlined'
import DnsIcon from '@mui/icons-material/DnsOutlined'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweepOutlined'
import TuneIcon from '@mui/icons-material/TuneOutlined'
import SettingsIcon from '@mui/icons-material/SettingsOutlined'
import { useConnectionStatus } from '../../context/ConnectionStatusContext'

const DRAWER_WIDTH = 248

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { to: '/', label: 'Activity', icon: <ActivityIcon /> },
      { to: '/overview', label: 'Overview', icon: <OverviewIcon /> },
    ],
  },
  {
    label: 'Routing',
    items: [
      { to: '/proxies', label: 'Proxies', icon: <HubIcon /> },
      { to: '/connections', label: 'Connections', icon: <RouteIcon /> },
      { to: '/rules', label: 'Rules', icon: <RuleIcon /> },
      { to: '/providers', label: 'Providers', icon: <CloudSyncIcon /> },
    ],
  },
  {
    label: 'Diagnostics',
    items: [
      { to: '/logs', label: 'Logs', icon: <ArticleIcon /> },
      { to: '/traffic', label: 'Traffic', icon: <ShowChartIcon /> },
      { to: '/memory', label: 'Memory', icon: <MemoryIcon /> },
      { to: '/dns', label: 'DNS query', icon: <DnsIcon /> },
      { to: '/cache', label: 'Cache', icon: <DeleteSweepIcon /> },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/configs', label: 'Configs', icon: <TuneIcon /> },
      { to: '/grpc', label: 'gRPC API', icon: <SettingsEthernetIcon /> },
      { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
]

function NavList({ onNavigate }) {
  const location = useLocation()
  return (
    <Box sx={{ overflowY: 'auto', py: 1, flex: 1 }}>
      {NAV_SECTIONS.map((section) => (
        <Box key={section.label ?? section.items[0].to} sx={{ mb: 1 }}>
          {section.label && (
            <Typography
              variant="caption"
              sx={{ px: 2.5, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 700 }}
            >
              {section.label}
            </Typography>
          )}
          <List dense disablePadding>
            {section.items.map((item) => (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                selected={location.pathname === item.to}
                onClick={onNavigate}
                sx={{ mx: 1, borderRadius: 1.5, mb: 0.25 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }} primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  )
}

export default function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isUpMd = useMediaQuery('(min-width:900px)')
  const { status, version } = useConnectionStatus()

  const statusMeta = {
    connected: { color: 'success', label: 'Connected' },
    connecting: { color: 'warning', label: 'Connecting…' },
    disconnected: { color: 'default', label: 'Disconnected' },
    error: { color: 'error', label: 'Unreachable' },
  }[status] || { color: 'default', label: 'Unknown' }

  const drawer = <NavList onNavigate={() => setMobileOpen(false)} />

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Toolbar sx={{ gap: 1.5 }}>
          {!isUpMd && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Reference Activity top-bar: a neutral "NO EVENT" pill on the
              left, then "System Proxy" / "Enhanced Mode" indicator pills on
              the right. All three are UI placeholders — the sing-box Clash
              API has no equivalent event-bus or system-proxy state — so the
              chrome stays in place but values are static labels. */}
          <Chip
            size="small"
            label="NO EVENT"
            sx={{
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: 0.04,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Chip
            size="small"
            label="System Proxy"
            icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.light' }} />}
            sx={{
              borderRadius: 4,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Chip
            size="small"
            label="Enhanced Mode"
            icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.light' }} />}
            sx={{
              borderRadius: 4,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />

          {/* Original right-most connection status chip — preserved. */}
          <Chip size="small" color={statusMeta.color} label={statusMeta.label} variant="outlined" />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          <Toolbar />
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' },
          }}
          open
        >
          {/* This sits beside the AppBar (which starts after DRAWER_WIDTH),
              so without a brand mark here the top-left corner of the whole
              app was just blank — this Toolbar previously rendered nothing
              but a stray, non-functional <Divider/>. */}
          <Toolbar sx={{ px: 2.5, gap: 1 }}>
            <HubIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              sing-box
            </Typography>
          </Toolbar>
          <Divider />
          {drawer}
          <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {version && (
              <Chip
                size="small"
                icon={<img src="/assets/icon.svg" alt="" style={{ width: 16, height: 16 }} />}
                label={version.version.replace(/^sing-box\s+/i, '')}
                sx={{ fontSize: 11, height: 24 }}
              />
            )}
          </Box>
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
      </Box>
    </Box>
  )
}
