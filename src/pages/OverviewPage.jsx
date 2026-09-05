import { Typography, Box } from '@mui/material'
import PageHeader from '../components/Common/PageHeader'

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="High-level summary of the sing-box core — placeholder until a data source is wired up."
      />
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No data source for Overview yet.
        </Typography>
      </Box>
    </>
  )
}
