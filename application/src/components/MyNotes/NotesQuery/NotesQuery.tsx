import React, { useState } from 'react';
import { Box, TextField, Button, Card, CardContent, Typography, CircularProgress, List, ListItem, ListItemText } from '@mui/material';

/**
 * NotesQuery component: ask natural language questions over your notes
 */
export default function NotesQuery() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ noteId: string; title: string; content: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);
    try {
      const res = await fetch('/api/ai/query-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Query failed');
      } else {
        setAnswer(data.answer);
        setSources(data.sources || []);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Ask your notes</Typography>
        <Box display="flex" gap={1} mt={1} mb={2}>
          <TextField placeholder="What did I write about X?" fullWidth value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !query.trim()}>
            {loading ? <CircularProgress size={20} /> : 'Ask'}
          </Button>
        </Box>

        {error && <Typography color="error">{error}</Typography>}

        {answer && (
          <Box mt={2}>
            <Typography variant="subtitle1">Answer</Typography>
            <Typography variant="body1">{answer}</Typography>
          </Box>
        )}

        {sources.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2">Sources ({sources.length} notes)</Typography>
            <List dense>
              {sources.map((s, i) => (
                <ListItem key={`${s.noteId}:${i}`}>
                  <ListItemText primary={`"${s.title}"`} secondary={s.content} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
