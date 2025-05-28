# Speech-to-Text Application

A full-stack application for recording audio and converting it to text using Deepgram's speech-to-text API.

## Features

- 🎤 Record audio directly in the browser
- 📝 Convert audio to text using Deepgram Nova-2 model
- 💾 Store transcriptions in Supabase database
- 📱 Responsive web interface
- 🔄 View all past transcriptions

## Architecture

- **Frontend**: React with Material-UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Speech-to-Text**: Deepgram API

## Setup Instructions

### Prerequisites

1. **Deepgram Account**: Sign up at [Deepgram](https://console.deepgram.com/) and get your API key
2. **Supabase Account**: Create a project at [Supabase](https://supabase.com/) and get your API key
3. **Node.js**: Install Node.js (v16 or higher)
4. **Python**: Install Python (v3.8 or higher)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # On Windows:
   venv\Scripts\activate
   
   # On Mac/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment file**:
   Create a `.env` file in the `backend` directory with:
   ```env
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_KEY=your_supabase_anon_key_here
   CORS_ORIGINS=["http://localhost:5173"]
   ```

5. **Set up Supabase database**:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run this SQL to create the transcripts table:
   ```sql
   CREATE TABLE transcripts (
     id SERIAL PRIMARY KEY,
     text TEXT,
     status VARCHAR(50),
     audio_url TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Disable RLS for simplicity (or set up proper policies)
   ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
   ```

6. **Start the backend server**:
   ```bash
   uvicorn app.main:app --reload
   ```
   
   The API will be available at `http://localhost:8000`
   API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## Usage

1. **Record Audio**:
   - Click "Start Recording" to begin recording
   - Speak clearly into your microphone
   - Click "Stop Recording" when finished

2. **Transcribe**:
   - Click "Transcribe Audio" to process your recording
   - Wait for the transcription to complete (may take a few moments)

3. **View Results**:
   - Your transcription will appear in the "Recent Transcriptions" section
   - All past transcriptions are saved and displayed

## API Endpoints

- `POST /upload-audio` - Upload audio file for transcription
- `GET /transcripts` - Get all transcriptions
- `GET /transcript/{id}` - Get specific transcription
- `DELETE /transcript/{id}` - Delete transcription
- `GET /health` - Health check

## Troubleshooting

### Common Issues

1. **Microphone not working**:
   - Ensure you're using HTTPS or localhost
   - Check browser permissions for microphone access
   - Try refreshing the page and allowing microphone access

2. **Deepgram errors**:
   - Verify your API key is correct
   - Check that you have credits in your Deepgram account
   - Ensure the audio file format is supported
   - Try using a different model if transcription fails

3. **Database errors**:
   - Verify your Supabase API key and URL are correct
   - Check that the transcripts table exists
   - Ensure RLS is disabled or properly configured

4. **CORS errors**:
   - Make sure the frontend URL is in the CORS_ORIGINS environment variable
   - Check that both frontend and backend are running

### Audio Format Support

The application supports:
- WebM audio (default from browser recording)
- WAV, MP3, M4A, FLAC, and other common audio formats
- Sample rates from 8kHz to 48kHz
- Deepgram automatically handles format detection

## Development

### Project Structure

```
speech_app/
├── backend/
│   ├── app/
│   │   └── main.py          # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── AudioRecorder.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json         # Node.js dependencies
│   └── vite.config.js       # Vite configuration
└── README.md
```

### Key Technologies

- **FastAPI**: Modern Python web framework
- **React**: Frontend library
- **Material-UI**: React component library
- **Deepgram**: Speech-to-text API with Nova-2 model
- **Supabase**: Backend-as-a-Service
- **Vite**: Frontend build tool

### Deepgram Features Used

- **Nova-2 Model**: High-accuracy speech recognition
- **Smart Formatting**: Automatic punctuation and capitalization
- **Speaker Diarization**: Identifies different speakers
- **Word-level Timestamps**: Precise timing information
- **Confidence Scores**: Quality metrics for each word

## License

This project is open source and available under the MIT License. 