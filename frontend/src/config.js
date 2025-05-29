// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
    UPLOAD_AUDIO: `${API_BASE_URL}/upload-audio`,
    TRANSCRIPTS: `${API_BASE_URL}/transcripts`,
    TRANSCRIPT: (id) => `${API_BASE_URL}/transcript/${id}`,
    HEALTH: `${API_BASE_URL}/health`
};

export default {
    API_BASE_URL,
    API_ENDPOINTS
}; 