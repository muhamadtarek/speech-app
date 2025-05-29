import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Divider, Chip, Alert } from '@mui/material';
import AudioRecorder from './components/AudioRecorder';
import { API_ENDPOINTS } from './config';

function App() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch existing transcripts on component mount
  useEffect(() => {
    fetchTranscripts();
  }, []);

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.TRANSCRIPTS);
      if (response.ok) {
        const data = await response.json();
        setTranscripts(data);
      } else {
        console.error('Failed to fetch transcripts');
      }
    } catch (error) {
      console.error('Error fetching transcripts:', error);
      setError('Failed to load transcripts');
    } finally {
      setLoading(false);
    }
  };

  const handleTranscriptionComplete = (result) => {
    console.log('Transcription completed:', result);

    // Add the new transcript to the list
    const newTranscript = {
      id: result.transcript_id,
      text: result.text,
      status: result.status,
      created_at: new Date().toISOString(),
      audio_url: null
    };

    setTranscripts(prev => [newTranscript, ...prev]);

    // Show success message
    setError(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Speech-to-Text App
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Record audio and get instant transcriptions
        </Typography>
      </Box>

      {/* Audio Recorder */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Record Audio
        </Typography>
        <AudioRecorder onTranscriptionComplete={handleTranscriptionComplete} />
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Transcripts List */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Recent Transcriptions
        </Typography>

        {loading ? (
          <Typography>Loading transcripts...</Typography>
        ) : transcripts.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No transcriptions yet. Record some audio to get started!
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {transcripts.map((transcript, index) => (
              <Box key={transcript.id || index}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(transcript.created_at)}
                  </Typography>
                  <Chip
                    label={transcript.status}
                    color={getStatusColor(transcript.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body1" sx={{ mb: 2 }}>
                  {transcript.text || 'No text available'}
                </Typography>

                {index < transcripts.length - 1 && <Divider />}
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Instructions */}
      <Paper elevation={1} sx={{ p: 2, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          How to use:
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li>Click "Start Recording" to begin recording audio</li>
            <li>Speak clearly into your microphone</li>
            <li>Click "Stop Recording" when finished</li>
            <li>Click "Transcribe Audio" to process your recording</li>
            <li>Wait for the transcription to complete</li>
            <li>View your transcription in the list below</li>
          </ol>
        </Typography>
      </Paper>
    </Container>
  );
}

export default App;
