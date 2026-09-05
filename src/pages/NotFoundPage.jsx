import { Box, Typography, Button } from '@mui/material'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
        404
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        This route doesn&apos;t exist in the control panel.
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Back to Activity
      </Button>
    </Box>
  )
}
