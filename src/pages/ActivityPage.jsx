import { useState, memo } from 'react'
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
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/RefreshOutlined'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import PageHeader from '../components/Common/PageHeader'
import { useSettings } from '../context/SettingsContext'
import { useClashResource } from '../hooks/useClashResource'
import { useClashWebSocket } from '../hooks/useClashWebSocket'
import { useDailyTraffic } from '../hooks/useDailyTraffic'
import { clashApi, wsUrl } from '../api/clashClient'
import { formatBytes, formatBytesPerSec, formatHourLabel } from '../utils/format'
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
function MetaInfoRow() {
    // Only the IP is a technical/numeric value — it gets the monospace
    // treatment. The rest (Home, macOS, Rule-Based Proxy) are plain words and
    // should sit in the regular UI font, matching the reference.
    // Dummy preview values below (the IP) stand in for fields the sing-box
    // Clash API doesn't expose, so the page reads like the reference at a
    // glance instead of showing a dash.
    const items = [
        { label: 'NETWORK', value: 'Home' },
        { label: 'PROFILE', value: 'macOS' },
        { label: 'OUTBOUND MODE', value: 'Rule-Based Proxy' },
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
    // peak/avg are placeholders today (no source in the Clash API), but they
    // still carry the card's own unit so the corner text reads "— KB/s"
    // rather than an unadorned dash.
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
const TrafficCard = memo(function TrafficCard({ hourly, connections }) {
    const theme = useTheme()
    const [scope, setScope] = useState('all')
    const [tab, setTab] = useState('client')

    const top = (connections?.connections || [])
        .map((c) => ({
            id: c.id,
            label: c.metadata?.process || c.metadata?.host || c.metadata?.destinationIP || 'unknown',
            total: (c.upload || 0) + (c.download || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

    // Dummy preview values — sing-box's Clash API doesn't expose a per-domain
    // or per-policy breakdown, so these stand in for the real numbers until
    // that source exists. The CLIENT tab above uses live connection data.
    const domainMock = [
        { id: 'd1', label: 'youtube.com', total: 96 * 1024 * 1024 },
        { id: 'd2', label: 'github.com', total: 54 * 1024 * 1024 },
        { id: 'd3', label: 'api.anthropic.com', total: 41 * 1024 * 1024 },
        { id: 'd4', label: 'dropbox.com', total: 22 * 1024 * 1024 },
        { id: 'd5', label: 'telegram.org', total: 14 * 1024 * 1024 },
    ]
    const policyMock = [
        { id: 'p1', label: 'PROXY', total: 551 * 1024 * 1024 },
        { id: 'p2', label: 'DIRECT', total: 178 * 1024 * 1024 },
        { id: 'p3', label: 'REJECT', total: 3 * 1024 * 1024 },
    ]
    const list = tab === 'client' ? top : tab === 'domain' ? domainMock : policyMock
    const max = list[0]?.total || 1

    // Always render exactly 5 row slots — CLIENT can have 0-5 real
    // connections while DOMAIN/POLICY carry fixed-length mock data (5 and 3
    // items), so without padding the list's rendered height changes with
    // the tab, which reflows this card's height and the whole row next to
    // it. Padding with same-markup placeholder rows (hidden, not removed)
    // keeps the height constant using the real row height rather than a
    // guessed pixel value.
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
                    series={[{ data: hourly, color: theme.palette.info.light }]}
                    xAxis={[
                        {
                            scaleType: 'band',
                            data: hourly.map((_, h) => formatHourLabel(h)),
                            tickLabelInterval: (_, index) => index % 6 === 0,
                        },
                    ]}
                    yAxis={[{ position: 'right', valueFormatter: (v) => formatBytes(v), tickNumber: 3 }]}
                    grid={{ horizontal: false, vertical: false }}
                    slotProps={{ legend: { hidden: true } }}
                    sx={{
                        '& .MuiChartsAxis-root .MuiChartsAxis-line': { display: 'none' },
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
                                    <Box sx={{ height: 4, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
                                        <Box sx={{ height: '100%', width: `${(c.total / max) * 100}%`, bgcolor: 'action.selected' }} />
                                    </Box>
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
// TOTAL TRAFFIC card — total + TODAY/MONTH + DIRECT/PROXY bar
// ---------------------------------------------------------------------------
function TotalTrafficCard({ total }) {
    const [range, setRange] = useState('today')
    // Dummy preview values — sing-box's Clash API doesn't expose a
    // direct/proxy traffic split or a monthly total, so these stand in for
    // the real numbers until that source exists.
    const directMB = 178
    const proxyMB = 551
    const directPct = (directMB / (directMB + proxyMB)) * 100
    return (
        <Paper variant="outlined" sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.02, flexShrink: 0 }}>
                    TOTAL TRAFFIC
                </Typography>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={range}
                    onChange={(_, v) => v && setRange(v)}
                    sx={{ minWidth: 130 }}
                >
                    <ToggleButton value="today">TODAY</ToggleButton>
                    <ToggleButton value="month">MONTH</ToggleButton>
                </ToggleButtonGroup>
            </Stack>

            {(() => {
                const [totalNum, totalUnit] = range === 'today' ? splitValueUnit(formatBytes(total)) : ['18.4', 'GB']
                return (
                    <ValueUnit
                        value={totalNum}
                        unit={totalUnit}
                        variant="h4"
                        unitVariant="h6"
                        sx={{ mt: 1, mb: 'auto', alignSelf: 'flex-start' }}
                    />
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

    const trafficUrl = secretReady ? wsUrl(settings, '/traffic') : null
    const { items: trafficItems } = useClashWebSocket(trafficUrl, {
        maxItems: 60,
        pauseWhenHidden: true,
    })

    const daily = useDailyTraffic(trafficItems)

    const connCount = connections ? (connections.connections || []).length : NA
    const latestTraffic = trafficItems[trafficItems.length - 1]?.data
    const up = trafficItems.map((i) => i.data?.up ?? 0)
    const down = trafficItems.map((i) => i.data?.down ?? 0)

    return (
        <>
            <PageHeader
                title="Activity"
                description="A live snapshot of the sing-box core reachable at the configured Clash API address."
            />

            <MetaInfoRow />

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
                        peak="2.0 MB/s"
                        avg="1.0 MB/s"
                    />
                </Grid>
                <Grid item xs={6} md={3} sx={{ display: 'flex' }}>
                    <ThroughputCard
                        label="DOWNLOAD"
                        value={formatBytesPerSec(latestTraffic?.down ?? 0)}
                        data={down}
                        color={theme.palette.info.main}
                        peak="18.5 MB/s"
                        avg="9.2 MB/s"
                    />
                </Grid>

                {/* Row 2: active connection + total traffic (stacked, left) vs traffic (right) */}
                <Grid item xs={12} md={6}>
                    <Stack spacing={2.5} sx={{ height: '100%' }}>
                        <ActiveConnectionCard count={connCount} />
                        <TotalTrafficCard total={daily.up + daily.down} />
                    </Stack>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: 'flex' }}>
                    <TrafficCard hourly={daily.hourly} connections={connections} />
                </Grid>
            </Grid>
        </>
    )
}