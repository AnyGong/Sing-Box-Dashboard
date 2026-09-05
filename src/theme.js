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
        // "Inter" was referenced here previously but never actually loaded —
        // no <link>/@font-face and no font files ship with the app — so every
        // browser was silently falling back past it anyway. Rather than pull
        // in a Google Fonts request (this is meant to be a tool that only ever
        // talks to a local `external_controller`, so calling out to a third-
        // party CDN for a typeface is the wrong trade-off) or bundle font
        // files, just declare the fallback stack the browser was already
        // rendering with.
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
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
        // Every in-app tab strip (Activity's TODAY/MONTH, ALL/PROXY,
        // CLIENT/DOMAIN/POLICY, and any future ToggleButtonGroup) renders as a
        // filled track with a solid pill on the active button, rather than
        // MUI's default bordered-buttons-with-tinted-selection look. Built
        // entirely from tokens already defined above (action.hover, the paper
        // surface, the theme's own elevation) so it tracks light/dark mode
        // automatically instead of introducing a one-off color.
        MuiToggleButtonGroup: {
            styleOverrides: {
                root: ({ theme }) => ({
                    display: 'flex',
                    padding: theme.spacing(0.5),
                    borderRadius: 999,
                    backgroundColor: theme.vars.palette.action.hover,
                    gap: 0,
                }),
            },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: ({ theme }) => ({
                    flex: 1,
                    minWidth: 0,
                    border: 0,
                    borderRadius: '999px !important',
                    padding: `${theme.spacing(0.25)} ${theme.spacing(1.5)}`,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: theme.vars.palette.text.secondary,
                    '&.Mui-selected': {
                        backgroundColor: theme.vars.palette.background.paper,
                        color: theme.vars.palette.text.primary,
                        boxShadow: theme.shadows[1],
                        '&:hover': {
                            backgroundColor: theme.vars.palette.background.paper,
                        },
                    },
                }),
            },
        },
    },
})

// Shared monospace stack for numeric / protocol data (bytes, ms, IDs, JSON).
// Same reasoning as above: "JetBrains Mono" was never loaded, so this is the
// stack every browser was already falling back to — named explicitly.
export const monoFont = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'

export const signalColors = { SIGNAL, SIGNAL_DARK, AMBER, CRIMSON }