import { useState } from 'react'
import {
  Paper,
  Stack,
  TextField,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  Chip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import PageHeader from '../components/Common/PageHeader'
import { ErrorBlock } from '../components/Common/StateBlocks'
import { useSettings } from '../context/SettingsContext'
import { clashApi } from '../api/clashClient'
import { monoFont } from '../theme'

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR']

export default function DnsPage() {
  const { settings } = useSettings()
  const [name, setName] = useState('')
  const [type, setType] = useState('A')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await clashApi.queryDns(settings, { name: name.trim(), type })
      setResult(res)
    } catch (err) {
      setError(err)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="DNS query"
        description="Resolve a hostname through sing-box's own DNS pipeline via the Clash API's /dns/query endpoint, exactly as the core would resolve it for routing."
      />

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640, mb: 3 }}>
        <Stack component="form" onSubmit={submit} direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Hostname"
            placeholder="example.com"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <Select value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 110 }}>
            {RECORD_TYPES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
          <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={loading}>
            Query
          </Button>
        </Stack>
      </Paper>

      {error && <ErrorBlock error={error} />}

      {result && (
        <Paper variant="outlined" sx={{ p: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Answer
            </Typography>
            <Chip size="small" variant="outlined" label={`Status ${result.Status}`} />
            <Chip size="small" variant="outlined" label={result.TC ? 'truncated' : 'complete'} />
          </Stack>
          {Array.isArray(result.Answer) && result.Answer.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">TTL</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.Answer.map((a, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{a.name}</TableCell>
                    <TableCell>{a.type}</TableCell>
                    <TableCell align="right">{a.TTL}</TableCell>
                    <TableCell sx={{ fontFamily: monoFont, fontSize: 13 }}>{a.data}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography color="text.secondary" sx={{ p: 2, pt: 0 }}>
              No answer records returned.
            </Typography>
          )}
        </Paper>
      )}
    </>
  )
}
