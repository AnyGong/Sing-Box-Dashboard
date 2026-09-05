import { extendTheme } from '@mui/material/styles'

// Design tokens
// ----------------------------------------------------------------------
// This is an operator's control panel for a proxy/routing core, not a
// marketing surface, so the palette leans "instrument panel": a cool
// slate surface, a single signal-teal accent used for anything "live" or
// actionable, and amber/red reserved strictly for warnings and errors so
// they keep their meaning. Data (bytes, latencies, IDs, rule payloads) is
// always set in a monospace face so it reads as raw values, distinct from
// UI chrome set in the sans face.
const SIGNAL = '#2DD4BF' // teal-400 - "live" / connected / primary action
const SIGNAL_DARK = '#0F9C8D'
const AMBER = '#F5A524' // warnings, latency caution
const CRIMSON = '#E5484D' // errors, destructive actions

export const theme = extendTheme({
  colorSchemeSelector: 'media', // follow the OS/browser color-scheme, no manual toggle needed
  colorSchemes: {
    light: {
      palette: {
        primary: { main: SIGNAL_DARK, contrastText: '#FFFFFF' },
        warning: { main: AMBER },
        error: { main: CRIMSON },
        background: {
          default: '#F4F6F6',
          paper: '#FFFFFF',
        },
        divider: 'rgba(15, 30, 28, 0.12)',
      },
    },
    dark: {
      palette: {
        primary: { main: SIGNAL, contrastText: '#04201C' },
        warning: { main: AMBER },
        error: { main: CRIMSON },
        background: {
          default: '#0E1416',
          paper: '#141C1F',
        },
        divider: 'rgba(226, 240, 238, 0.10)',
      },
    },
  },
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontFamily: 'inherit', fontWeight: 700 },
    h2: { fontFamily: 'inherit', fontWeight: 700 },
    h3: { fontFamily: 'inherit', fontWeight: 600 },
    h4: { fontFamily: 'inherit', fontWeight: 600 },
    h5: { fontFamily: 'inherit', fontWeight: 600 },
    h6: { fontFamily: 'inherit', fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.02em' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: 'inherit' },
      },
    },
  },
})

// Shared monospace stack for numeric / protocol data (bytes, ms, IDs, JSON).
export const monoFont =
  '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'

export const signalColors = { SIGNAL, SIGNAL_DARK, AMBER, CRIMSON }
