import React, { useState, useRef } from 'react';
import { Button, Box, CircularProgress, Snackbar, Alert, Typography, LinearProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import UploadIcon from '@mui/icons-material/Upload';
import { API_ENDPOINTS } from '../config';

const AudioRecorder = ({ onTranscriptionComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const recordingTimer = useRef(null);

    const startRecording = async () => {
        try {
            console.log('Requesting microphone access...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            console.log('Microphone access granted');

            // Clear previous recording
            audioChunks.current = [];
            setRecordedBlob(null);
            setRecordingDuration(0);

            // Create MediaRecorder
            mediaRecorder.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = () => {
                console.log('Recording stopped');
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                setRecordedBlob(blob);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Clear timer
                if (recordingTimer.current) {
                    clearInterval(recordingTimer.current);
                    recordingTimer.current = null;
                }
            };

            // Start recording
            mediaRecorder.current.start();
            setIsRecording(true);

            // Start timer
            recordingTimer.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

            console.log('Recording started');

        } catch (error) {
            console.error('Error starting recording:', error);
            if (error.name === 'NotAllowedError') {
                setError('Microphone access denied. Please allow microphone access and try again.');
            } else if (error.name === 'NotFoundError') {
                setError('No microphone found. Please connect a microphone and try again.');
            } else {
                setError(`Failed to start recording: ${error.message}`);
            }
        }
    };

    const stopRecording = () => {
        console.log('Stopping recording...');

        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
        }

        setIsRecording(false);
    };

    const uploadAndTranscribe = async () => {
        if (!recordedBlob) {
            setError('No recording available to upload');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            console.log('Uploading audio for transcription...');

            // Create FormData for file upload
            const formData = new FormData();
            const audioFile = new File([recordedBlob], 'recording.webm', { type: 'audio/webm' });
            formData.append('file', audioFile);

            // Upload to backend
            const response = await fetch(API_ENDPOINTS.UPLOAD_AUDIO, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Transcription result:', result);

            // Call the callback with the transcription result
            if (onTranscriptionComplete) {
                onTranscriptionComplete(result);
            }

            // Clear the recorded blob
            setRecordedBlob(null);
            setRecordingDuration(0);

        } catch (error) {
            console.error('Error uploading audio:', error);

            // Provide more specific error messages
            let errorMessage = 'Transcription failed';

            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please make sure the backend is running.';
            } else if (error.message.includes('File must be an audio file')) {
                errorMessage = 'Invalid audio format. Please try recording again.';
            } else if (error.message.includes('Transcription failed')) {
                errorMessage = 'Deepgram transcription failed. Please check your API key and account credits.';
            } else {
                errorMessage = `Transcription failed: ${error.message}`;
            }

            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const discardRecording = () => {
        setRecordedBlob(null);
        setRecordingDuration(0);
        setError(null);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCloseError = () => {
        setError(null);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2, gap: 2 }}>
            {/* Recording Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {!recordedBlob ? (
                    <Button
                        variant="contained"
                        color={isRecording ? "error" : "primary"}
                        onClick={isRecording ? stopRecording : startRecording}
                        startIcon={isRecording ? <StopIcon /> : <MicIcon />}
                        sx={{ borderRadius: 28, px: 4 }}
                        disabled={isProcessing}
                    >
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={uploadAndTranscribe}
                            startIcon={<UploadIcon />}
                            sx={{ borderRadius: 28, px: 4 }}
                            disabled={isProcessing}
                        >
                            Transcribe Audio
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={discardRecording}
                            sx={{ borderRadius: 28, px: 3 }}
                            disabled={isProcessing}
                        >
                            Discard
                        </Button>
                    </>
                )}
            </Box>

            {/* Recording Status */}
            {isRecording && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: 'red', animation: 'pulse 1s infinite' }} />
                    <Typography variant="body2" color="error">
                        Recording: {formatDuration(recordingDuration)}
                    </Typography>
                </Box>
            )}

            {/* Recorded Audio Info */}
            {recordedBlob && !isRecording && (
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="success.main">
                        ✓ Audio recorded ({formatDuration(recordingDuration)})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Click "Transcribe Audio" to process your recording
                    </Typography>
                </Box>
            )}

            {/* Processing Status */}
            {isProcessing && (
                <Box sx={{ width: '100%', maxWidth: 400 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">
                            Processing audio...
                        </Typography>
                    </Box>
                    <LinearProgress />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        This may take a few moments depending on the audio length
                    </Typography>
                </Box>
            )}

            {/* Error Snackbar */}
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={handleCloseError}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>

            {/* CSS for pulse animation */}
            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </Box>
    );
};

export default AudioRecorder; 