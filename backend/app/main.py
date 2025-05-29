import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import json
from deepgram import (
    DeepgramClient,
    PrerecordedOptions,
    FileSource,
)
from typing import List
from datetime import datetime
from supabase import create_client, Client
from pydantic import BaseModel
from pathlib import Path
import time

load_dotenv()

class TranscriptResponse(BaseModel):
    id: int
    text: str
    status: str
    created_at: datetime
    audio_url: str = None

    class Config:
        from_attributes = True

class TranscriptRequest(BaseModel):
    text: str
    status: str

# Configure Deepgram
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
if not DEEPGRAM_API_KEY:
    raise ValueError("No DEEPGRAM_API_KEY in .env")

# Configure Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_KEY:
    raise ValueError("No SUPABASE_KEY in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# FastAPI app setup
app = FastAPI(
    title="Speech-to-Text API",
    description="""
    File-based speech-to-text transcription API using Deepgram.
    Features:
    - Upload audio files for transcription
    - Batch processing with Nova-3 model
    - Persistent storage in Supabase
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-audio", tags=["Transcription"])
async def upload_audio(file: UploadFile = File(...)):
    """
    Upload an audio file and transcribe it using Deepgram.
    Returns the transcript ID and completed transcription.
    """
    try:
        # Validate file type
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Create initial transcript record
        try:
            response = supabase.table("transcripts").insert({
                "text": "",
                "status": "processing"
            }).execute()
            
            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to create transcript record")
                
            transcript_id = response.data[0]['id']
            print(f"Created transcript record with ID: {transcript_id}")
            
        except Exception as e:
            print(f"Database error: {e}")
            raise HTTPException(status_code=500, detail="Database error")

        try:
            # Read the uploaded file content
            content = await file.read()
            print(f"Audio file received, size: {len(content)} bytes")

            # STEP 1: Create a Deepgram client using the API key
            deepgram = DeepgramClient(DEEPGRAM_API_KEY)
            
            # STEP 2: Prepare the payload
            payload: FileSource = {
                "buffer": content,
            }
            
            # STEP 3: Configure Deepgram options for audio analysis
            options = PrerecordedOptions(
                model="nova-2",
                smart_format=True,
                language="en",
                punctuate=True,
                diarize=True,
                utterances=False,
            )
            
            print(f"Starting transcription with Deepgram...")
            
            # STEP 4: Call the transcribe_file method with the payload and options
            response = deepgram.listen.rest.v("1").transcribe_file(payload, options)
            
            # Extract transcript text
            transcript_text = ""
            if response.results and response.results.channels:
                channel = response.results.channels[0]
                if channel.alternatives:
                    transcript_text = channel.alternatives[0].transcript
            
            if not transcript_text:
                transcript_text = "No speech detected"
            
            print(f"Transcription completed: {transcript_text[:100]}...")
            
            # Print detailed word-level information if available
            if response.results and response.results.channels:
                channel = response.results.channels[0]
                if channel.alternatives and channel.alternatives[0].words:
                    for word in channel.alternatives[0].words:
                        print(f"{word.word} ({word.start}s - {word.end}s, confidence: {word.confidence})")
            
            # Update database with final transcript
            supabase.table("transcripts").update({
                "text": transcript_text,
                "status": "completed"
            }).eq("id", transcript_id).execute()
            
            return {
                "transcript_id": transcript_id,
                "status": "completed",
                "text": transcript_text,
                "message": "Transcription completed successfully"
            }
            
        except Exception as e:
            print(f"Deepgram error: {e}")
            
            # Update database with error
            try:
                supabase.table("transcripts").update({
                    "text": f"Transcription error: {str(e)}",
                    "status": "error"
                }).eq("id", transcript_id).execute()
            except:
                pass
                
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/transcript/{transcript_id}", response_model=TranscriptResponse, tags=["Transcription"])
async def get_transcript(transcript_id: int):
    """
    Get a specific transcript by ID.
    """
    try:
        response = supabase.table("transcripts").select("*").eq("id", transcript_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Transcript not found")
            
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching transcript: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch transcript")

@app.get("/transcripts", response_model=List[TranscriptResponse], tags=["Transcripts"])
async def get_transcripts():
    """
    Retrieve all transcripts ordered by creation date (newest first).
    Returns a list of transcripts with their text, status, and timestamps.
    """
    try:
        response = supabase.table("transcripts").select("*").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching transcripts: {e}")
        return []

@app.delete("/transcript/{transcript_id}", tags=["Transcripts"])
async def delete_transcript(transcript_id: int):
    """
    Delete a specific transcript by ID.
    """
    try:
        response = supabase.table("transcripts").delete().eq("id", transcript_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Transcript not found")
            
        return {"message": "Transcript deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting transcript: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete transcript")

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "message": "Speech-to-Text API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)