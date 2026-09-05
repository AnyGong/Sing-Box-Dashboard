import { useState, useEffect, useRef, useMemo, memo } from 'react'
import {
    Grid,
    Paper,
    Typography,
    Stack,
    Box,
    Button,
    Avatar,
    ToggleButton,
    ToggleButtonGroup,
    Divider,
    Tooltip,
    IconButton,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/RefreshOutlined'
import InfoIcon from '@mui/icons-material/InfoOutlined'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { useTrafficStream } from '../context/TrafficStreamContext'
import { clashApi } from '../api/clashClient'
import { formatBytes, formatBytesCompact, formatBytesPerSec, formatHourLabel } from '../utils/format'
import { useTheme } from '@mui/material/styles'
import { monoFont } from '../theme'

// Placeholder shown for fields the sing-box Clash API does not expose
// (per-hop latency, external IP, per-outbound traffic totals, process /
// device counts, etc.). The UI chrome stays in place so the layout matches
// the reference; values are filled in only when a real source exists.
const NA = '—'

// Splits a formatted "<number> <unit>" string (as produced by formatBytes /
// formatBytesPerSec) into its numeric and unit parts, so the two can be
// styled independently but consistently wherever a value+unit pair appears
// on this page.
function splitValueUnit(formatted) {
    const idx = formatted.lastIndexOf(' ')
    if (idx === -1) return [formatted, '']
    return [formatted.slice(0, idx), formatted.slice(idx + 1)]
}

// Shared number+unit display: bold value with a smaller, secondary-colored
// unit suffix. Placeholders go through this too (value=NA, unit still set)
// so a missing metric keeps the same visual weight as a real one instead of
// collapsing to a bare dash.
function ValueUnit({ value, unit, variant = 'h4', unitVariant = 'h6', sx }) {
    return (
        <Typography variant={variant} sx={{ fontFamily: monoFont, fontWeight: 700, ...sx }} noWrap>
            {value}
            {unit && (
                <Typography component="span" variant={unitVariant} sx={{ fontFamily: monoFont, color: 'text.secondary', ml: 0.5 }}>
                    {unit}
                </Typography>
            )}
        </Typography>
    )
}

// ---------------------------------------------------------------------------
// Top meta row: NETWORK / PROFILE / OUTBOUND MODE / EXTERNAL IP
// ---------------------------------------------------------------------------
// OUTBOUND MODE reflects the live `mode` field from GET /configs (see
// MODE_LABELS below) — sing-box actually reports this, so it's no longer a
// placeholder. NETWORK, PROFILE, and EXTERNAL IP still have no equivalent
// anywhere in the Clash API and stay as placeholders: a browser page has no
// way to read the host's network name, host OS, or true egress IP. (A local
// companion agent running on the sing-box host could supply all three —
// that's a separate, opt-in follow-up, not something reachable from here.)
const MODE_LABELS = {
    rule: 'Rule-Based Proxy',
    global: 'Global',
    direct: 'Direct',
}

function MetaInfoRow({ mode }) {
    // Only the IP is a technical/numeric value — it gets the monospace
    // treatment. The rest (Home, macOS, Rule-Based Proxy) are plain words and
    // should sit in the regular UI font, matching the reference.
    // NETWORK / PROFILE / EXTERNAL IP remain dummy preview values — the
    // sing-box Clash API doesn't expose any of them, so the page reads like
    // the reference at a glance instead of showing a dash. OUTBOUND MODE is
    // real now (see MODE_LABELS above).
    const items = [
        { label: 'NETWORK', value: 'Home' },
        { label: 'PROFILE', value: 'macOS' },
        {
            label: 'OUTBOUND MODE',
            value: mode ? MODE_LABELS[String(mode).toLowerCase()] || String(mode) : NA,
        },
        { label: 'EXTERNAL IP', value: '203.0.113.1', mono: true },
    ]
    return (
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
            {items.map((it) => (
                <Grid item xs={6} sm={3} key={it.label}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.04 }}>
                        {it.label}
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{ fontFamily: it.mono ? monoFont : undefined, fontWeight: 700, mt: 0.25 }}
                        noWrap
                    >
                        {it.value}
                    </Typography>
                </Grid>
            ))}
        </Grid>
    )
}

// ---------------------------------------------------------------------------
// INTERNET LATENCY card — main latency + Diagnostics + Router/DNS/Proxy
// ---------------------------------------------------------------------------
function InternetLatencyCard() {
    // Dummy preview values — sing-box's Clash API doesn't expose a per-hop
    // latency breakdown, so these stand in for the real numbers until that
    // source exists.
    const hops = [
        { label: 'ROUTER', value: '≤1' },
        { label: 'DNS', value: '6' },
        { label: 'Proxy', value: '260' },
    ]
    return (
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.04 }}>
                        INTERNET LATENCY
                    </Typography>
                    <RefreshIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
                </Stack>
                <Button size="small" variant="outlined" disabled sx={{ borderRadius: 2, py: 0.25, px: 1.5, fontSize: 12 }}>
                    Diagnostics
                </Button>
            </Stack>

            <ValueUnit value="9" unit="ms" variant="h4" unitVariant="h6" sx={{ mt: 1.5, mb: 'auto' }} />

            <Grid container sx={{ mt: 2.5 }}>
                {hops.map((h, i) => (
                    <Grid item xs={4} key={h.label} sx={{ pl: i === 0 ? 0 : 2, borderLeft: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {h.label}
                        </Typography>
                        <ValueUnit value={h.value} unit="ms" variant="h5" unitVariant="body2" sx={{ fontWeight: 600, mt: 0.25 }} />
                    </Grid>
                ))}
            </Grid>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// UPLOAD / DOWNLOAD card — big rate + peak placeholder + sparkline
// ---------------------------------------------------------------------------
const ThroughputCard = memo(function ThroughputCard({ label, value, data, color, peak = NA, avg = NA }) {
    const [num, unit] = splitValueUnit(value)
    // peak/avg are now computed from the same /traffic WebSocket samples
    // already driving the sparkline (see the session peak/average tracker in
    // ActivityPage below) — the NA fallback here just keeps the corner text
    // reading "— KB/s" instead of an unadorned dash for the brief window
    // before the first sample arrives.
    const peakText = peak === NA ? `${NA} ${unit}` : peak
    const avgText = avg === NA ? `${NA} ${unit}` : avg

    return (
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.04 }}>
                    {label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: monoFont }}>
                    {peakText}
                </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 'auto' }}>
                <ValueUnit value={num} unit={unit} variant="h4" unitVariant="h6" sx={{ mt: 0.75 }} />
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: monoFont }}>
                    {avgText}
                </Typography>
            </Stack>

            {/* Fixed height + overflow hidden + flexShrink so a tall data
                spike can never grow into (or push out) the rows above —
                the chart is fully isolated below the peak/avg labels
                rather than sharing space with them. */}
            <Box sx={{ height: 64, flexShrink: 0, mt: 1, mx: -1, overflow: 'hidden' }}>
                {data.length > 1 && (
                    <LineChart
                        height={64}
                        series={[{ data, color, showMark: false, area: true }]}
                        xAxis={[{ data: data.map((_, i) => i), scaleType: 'point' }]}
                        margin={{ top: 2, right: 4, bottom: 2, left: 4 }}
                        slotProps={{ legend: { hidden: true } }}
                        sx={{ '& .MuiChartsAxis-root': { display: 'none' } }}
                    />
                )}
            </Box>
        </Paper>
    )
})

// ---------------------------------------------------------------------------
// ACTIVE CONNECTION card — count + live dot + Processes/Devices/DHCP
// ---------------------------------------------------------------------------
function ActiveConnectionCard({ count }) {
    // Dummy preview values — process/device/DHCP counts aren't exposed by the
    // Clash API, so these stand in for the real numbers until that source
    // exists.
    const sub = [
        { label: 'Processes', value: '16' },
        { label: 'Devices', value: '0' },
        { label: 'DHCP Devices', value: '2' },
    ]
    return (
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.04 }}>
                    ACTIVE CONNECTION
                </Typography>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
            </Stack>

            <Typography variant="h4" sx={{ fontFamily: monoFont, fontWeight: 700, mt: 1, mb: 'auto' }} noWrap>
                {count}
            </Typography>

            <Grid container sx={{ mt: 2.5 }}>
                {sub.map((s, i) => (
                    <Grid item xs={4} key={sub.label} sx={{ pl: i === 0 ? 0 : 2, borderLeft: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h5" sx={{ fontFamily: monoFont, fontWeight: 600 }} noWrap>
                            {s.value}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                            {s.label}
                        </Typography>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// TRAFFIC card — ALL/PROXY toggle + 24h bars + CLIENT/DOMAIN/POLICY list
// ---------------------------------------------------------------------------
// Groups currently-tracked connections by a per-tab key and sums each
// group's upload+download — real numbers straight from the same
// GET /connections payload the CLIENT tab always used, just grouped
// differently per tab instead of two of the three being mock datasets.
//
// The one honest caveat, inherited from /connections itself: this only
// covers connections the controller is tracking *right now*. A connection
// that opens and fully closes between two 5s polls never contributes here,
// so — like useDailyTraffic's daily tally — this is a live snapshot, not a
// complete historical ledger.
// Extract a human-readable process name from sing-box's full processPath.
// The Clash API reports the complete executable path. For macOS .app bundles
// the real application name lives in the "*.app" directory segment, not in
// the Contents/MacOS/<binary> leaf (e.g. VS Code's binary is "Electron").
// Windows/POSIX executables fall back to the last path segment.
function extractProcessName(processPath) {
    if (!processPath) return null
    const normalized = processPath.replace(/\\/g, '/')
    // macOS .app bundle: capture the name before ".app/"
    const appMatch = normalized.match(/([^/]+)\.app\//i)
    if (appMatch) return appMatch[1]
    // Otherwise take the last path segment
    const name = normalized.split('/').pop()
    return name || null
}

const TRAFFIC_GROUP_KEY = {
    // sing-box's Clash API reports this field as `processPath`, not
    // `process` (confirmed against sing-box's own
    // experimental/clashapi/trafficontrol/tracker.go) — the previous
    // `c.metadata?.process` lookup here never matched anything and silently
    // fell through to host/IP on every connection.
    client: (c) => extractProcessName(c.metadata?.processPath) || c.metadata?.host || c.metadata?.destinationIP,
    domain: (c) => c.metadata?.host || c.metadata?.destinationIP,
    // chains[0] is the outbound sing-box actually routed through (e.g.
    // "DIRECT", "REJECT", or a proxy/selector name) — the same field the
    // Connections page's Chain column already reads.
    policy: (c) => c.chains?.[0],
}

function topConnectionsBy(connections, keyFn, limit = 5) {
    const totals = new Map()
    ;(connections?.connections || []).forEach((c) => {
        const key = keyFn(c) || 'unknown'
        const total = (c.upload || 0) + (c.download || 0)
        totals.set(key, (totals.get(key) || 0) + total)
    })
    return Array.from(totals, ([label, total]) => ({ id: label, label, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
}

// Hour labels never change (pure function of bucket index), but `hourly`
// gets a new array reference as traffic samples land — computing these from
// scratch on every render was pure waste; same 24 strings every time.
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => formatHourLabel(h))
// Stable function reference — passing a fresh closure to the chart on every
// render defeats any memoization x-charts does internally on its own props.
const everySixthHour = (_, index) => index % 6 === 0

const TrafficCard = memo(function TrafficCard({ hourly, connections }) {
    const theme = useTheme()
    const [scope, setScope] = useState('all')
    const [tab, setTab] = useState('client')

    const list = useMemo(() => topConnectionsBy(connections, TRAFFIC_GROUP_KEY[tab]), [connections, tab])
    const max = list[0]?.total || 1

    // Always render exactly 5 row slots — every tab now sources from
    // topConnectionsBy(), which returns 0-5 groups depending on how many
    // distinct processes/hosts/outbounds are actually active, so without
    // padding the list's rendered height changes with the tab and the
    // connection count, reflowing this card's height and the whole row next
    // to it. Padding with same-markup placeholder rows (hidden, not
    // removed) keeps the height constant using the real row height rather
    // than a guessed pixel value.
    const ROW_COUNT = 5
    const rows = Array.from({ length: ROW_COUNT }, (_, i) => list[i] ?? null)

    return (
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.04 }}>
                    TRAFFIC
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={scope}
                    onChange={(_, v) => v && setScope(v)}
                    sx={{ minWidth: 130 }}
                >
                    <ToggleButton value="all">ALL</ToggleButton>
                    <ToggleButton value="proxy">PROXY</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <Box sx={{ height: 130, mx: -1 }}>
                <BarChart
                    height={130}
                    series={[{ data: hourly, color: theme.palette.info.light, valueFormatter: (v) => formatBytes(v) }]}
                    xAxis={[
                        {
                            scaleType: 'band',
                            data: HOUR_LABELS,
                            tickLabelInterval: everySixthHour,
                        },
                    ]}
                    yAxis={[
                        {
                            position: 'right',
                            // Compact form ("12.3M" instead of "12.3 MB") keeps
                            // every label within a predictable, narrow width so
                            // the fixed `margin.right` below is always enough
                            // room — formatBytes's longer form was overflowing
                            // that gutter and getting clipped by the chart's
                            // SVG boundary.
                            valueFormatter: (v) => formatBytesCompact(v),
                            tickNumber: 3,
                        },
                    ]}
                    // x-charts doesn't auto-size margins to fit axis label
                    // content — it needs the gutter reserved explicitly. 40px
                    // comfortably fits this axis's widest realistic label
                    // ("999.9G"); the previous unset margin fell back to a
                    // value too small for anything past a couple of chars.
                    margin={{ top: 8, right: 40, bottom: 20, left: 4 }}
                    grid={{ horizontal: false, vertical: false }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{
                        '& .MuiChartsAxis-root .MuiChartsAxis-line': { display: 'none' },
                        '& .MuiChartsAxis-tickLabel': { fontFamily: monoFont, fontSize: 10.5 },
                        '& .MuiChartsGrid-line': { display: 'none' },
                    }}
                />
            </Box>

            <Stack direction="row" justifyContent="center" sx={{ mt: 1, mb: 0.5 }}>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={tab}
                    onChange={(_, v) => v && setTab(v)}
                    sx={{ width: '100%' }}
                >
                    <ToggleButton value="client">CLIENT</ToggleButton>
                    <ToggleButton value="domain">DOMAIN</ToggleButton>
                    <ToggleButton value="policy">POLICY</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
                <Stack spacing={1.25}>
                    {rows.map((c, i) =>
                        c ? (
                            <Stack key={c.id} direction="row" alignItems="center" spacing={1.25}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: 'action.hover', color: 'text.primary' }}>
                                    {c.label.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.25 }}>
                                        <Typography variant="body2" noWrap sx={{ fontSize: 13 }}>
                                            {c.label}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: monoFont, fontWeight: 600, flexShrink: 0, ml: 1 }}>
                                            {formatBytes(c.total)}
                                        </Typography>
                                    </Stack>
                                    <Box sx={{ height: 4, borderRadius: 1, width: `${(c.total / max) * 100}%`, bgcolor: 'action.selected' }} />
                                </Box>
                            </Stack>
                        ) : (
                            // Same markup as a real row, just invisible — this is what
                            // reserves the identical row height without a magic number.
                            <Stack key={`empty-${i}`} direction="row" alignItems="center" spacing={1.25} sx={{ visibility: 'hidden' }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>·</Avatar>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.25 }}>
                                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                                            &nbsp;
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: monoFont, fontWeight: 600 }}>
                                            &nbsp;
                                        </Typography>
                                    </Stack>
                                    <Box sx={{ height: 4, borderRadius: 1 }} />
                                </Box>
                            </Stack>
                        )
                    )}
                </Stack>

                {list.length === 0 && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        No active connections.
                    </Typography>
                )}
            </Box>
        </Paper>
    )
})

// ---------------------------------------------------------------------------
// TOTAL TRAFFIC card — total + TOTAL/MONTH + DIRECT/PROXY bar
// ---------------------------------------------------------------------------
function TotalTrafficCard({ total }) {
    const [range, setRange] = useState('today')
    // DIRECT/PROXY split stays a dummy preview value — sing-box's Clash API
    // exposes no per-outbound breakdown of the cumulative total below (only
    // per-connection `chains`, which is what the TRAFFIC card's POLICY tab
    // uses instead, scoped to currently-tracked connections). MONTH is a
    // dummy preview value too — no sing-box endpoint reports a rolling
    // monthly total.
    const directMB = 178
    const proxyMB = 551
    const directPct = (directMB / (directMB + proxyMB)) * 100
    return (
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.02, flexShrink: 0 }}>
                        TOTAL TRAFFIC
                    </Typography>
                    <Tooltip title="Since sing-box was last started" arrow placement="top">
                        <IconButton size="small" sx={{ p: 0.25 }}>
                            <InfoIcon fontSize="small" sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={range}
                    onChange={(_, v) => v && setRange(v)}
                    sx={{ minWidth: 130 }}
                >
                    <ToggleButton value="today">TOTAL</ToggleButton>
                    <ToggleButton value="month">MONTH</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {(() => {
                const [totalNum, totalUnit] = range === 'today' ? splitValueUnit(formatBytes(total)) : ['18.4', 'GB']
                return (
                    <Box sx={{ mb: 'auto' }}>
                        <ValueUnit
                            value={totalNum}
                            unit={totalUnit}
                            variant="h4"
                            unitVariant="h6"
                            sx={{ mt: 1, alignSelf: 'flex-start' }}
                        />
                        {/* `total` now comes from GET /connections'
                            uploadTotal/downloadTotal — sing-box's own
                            cumulative counters, more authoritative than
                            tallying /traffic samples client-side (as this
                            card did before). It resets when sing-box
                            restarts rather than at local midnight, so the
                            toggle reads TOTAL rather than TODAY. */}
                    </Box>
                )
            })()}

            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2, mb: 0.75 }}>
                <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        DIRECT
                    </Typography>
                    <ValueUnit value={directMB} unit="MB" variant="body1" unitVariant="body2" sx={{ fontWeight: 700, mt: 0.25 }} />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        PROXY
                    </Typography>
                    <ValueUnit value={proxyMB} unit="MB" variant="body1" unitVariant="body2" sx={{ fontWeight: 700, mt: 0.25 }} />
                </Box>
            </Stack>
            {/* gap between the two segments so they read as distinct bars
                rather than one continuous strip — flex-basis 0% + flex-grow
                divides the track (minus the gap) exactly by directPct, so the
                ratio stays correct regardless of gap width */}
            <Box sx={{ display: 'flex', height: 10, gap: 0.75 }}>
                <Box sx={{ flex: `${directPct} 0 0%`, minWidth: 0, borderRadius: 1.5, bgcolor: 'secondary.main' }} />
                <Box sx={{ flex: `${100 - directPct} 0 0%`, minWidth: 0, borderRadius: 1.5, bgcolor: 'info.main' }} />
            </Box>
        </Paper>
    )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ActivityPage() {
    const theme = useTheme()
    const { settings, secretReady } = useSettings()

    const { data: connections } = useClashResource(clashApi.getConnections, settings, {
        intervalMs: 5000,
        enabled: secretReady,
    })

    // Only used for the OUTBOUND MODE field in MetaInfoRow — ConfigsPage
    // polls the same endpoint for its own (editable) copy; this is kept as a
    // separate, read-only fetch so the two pages don't share poll timing.
    const { data: configs } = useClashResource(clashApi.getConfigs, settings, {
        enabled: secretReady,
    })

    // Reads from the single app-wide /traffic subscription (TrafficStreamContext)
    // instead of opening its own — previously this page's sparkline (and the
    // daily accumulator it drives) reset to empty every time you navigated
    // here, since it tore down and reopened its own WebSocket per visit.
    // Only the most recent 60 samples are used for the sparkline itself; the
    // shared buffer retains more (for the dedicated Traffic page's fuller
    // chart) but this card was always meant to show "the last minute", not
    // everything the shared buffer happens to be holding.
    const { items: allTrafficItems, daily } = useTrafficStream()
    const trafficItems = allTrafficItems.slice(-60)

    // Session peak/average for the UPLOAD and DOWNLOAD cards, derived from
    // the same /traffic samples as the sparkline. `trafficItems` is a capped
    // ring buffer (maxItems: 60 above), so peak/average can't be computed
    // from whatever's currently in it — that would silently forget a spike,
    // or skew the average, once older samples fall out of the buffer.
    // Folding each sample in by its timestamp (not array position) exactly
    // once is the same technique useDailyTraffic and TrafficPage's session
    // totals both already use.
    const [throughputStats, setThroughputStats] = useState({ peakUp: 0, peakDown: 0, sumUp: 0, sumDown: 0, count: 0 })
    const lastThroughputAtRef = useRef(0)
    useEffect(() => {
        const last = trafficItems[trafficItems.length - 1]
        if (!last || last.at <= lastThroughputAtRef.current) return
        lastThroughputAtRef.current = last.at
        const up = last.data?.up || 0
        const down = last.data?.down || 0
        setThroughputStats((s) => ({
            peakUp: Math.max(s.peakUp, up),
            peakDown: Math.max(s.peakDown, down),
            sumUp: s.sumUp + up,
            sumDown: s.sumDown + down,
            count: s.count + 1,
        }))
    }, [trafficItems])

    const connCount = connections ? (connections.connections || []).length : NA
    const latestTraffic = trafficItems[trafficItems.length - 1]?.data
    const up = trafficItems.map((i) => i.data?.up ?? 0)
    const down = trafficItems.map((i) => i.data?.down ?? 0)
    // GET /connections reports its own cumulative uploadTotal/downloadTotal
    // (sing-box's traffic manager tracks these itself) — more authoritative
    // than tallying /traffic samples client-side. See the caption
    // TotalTrafficCard renders alongside it for the reset-boundary caveat.
    const totalTraffic = (connections?.uploadTotal || 0) + (connections?.downloadTotal || 0)

    return (
        <>
            <PageHeader
                title="Activity"
                description="A live snapshot of the sing-box core reachable at the configured Clash API address."
            />

            <MetaInfoRow mode={configs?.mode} />

            <Grid container spacing={2.5}>
                {/* Row 1: latency + upload + download — Grid's default stretch
            gives all three the same height, matching the reference */}
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <InternetLatencyCard />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: 'flex' }}>
                    <ThroughputCard
                        label="UPLOAD"
                        value={formatBytesPerSec(latestTraffic?.up ?? 0)}
                        data={up}
                        color={theme.palette.secondary.main}
                        peak={formatBytesPerSec(throughputStats.peakUp)}
                        avg={formatBytesPerSec(throughputStats.sumUp / (throughputStats.count || 1))}
                    />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: 'flex' }}>
                    <ThroughputCard
                        label="DOWNLOAD"
                        value={formatBytesPerSec(latestTraffic?.down ?? 0)}
                        data={down}
                        color={theme.palette.info.main}
                        peak={formatBytesPerSec(throughputStats.peakDown)}
                        avg={formatBytesPerSec(throughputStats.sumDown / (throughputStats.count || 1))}
                    />
                </Grid>

                {/* Row 2: active connection + total traffic (stacked, left) vs traffic (right) */}
                <Grid item xs={12} md={6}>
                    <Stack spacing={2.5} sx={{ height: '100%' }}>
                        <ActiveConnectionCard count={connCount} />
                        <TotalTrafficCard total={totalTraffic} />
                    </Stack>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <TrafficCard hourly={daily.hourly} connections={connections} />
                </Grid>
            </Grid>
        </>
    )
}