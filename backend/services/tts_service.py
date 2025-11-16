"""
Text-to-Speech Service
Handles audio generation from text using pyttsx3
"""

import logging
import io
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    logger.warning("pyttsx3 not installed. Install with: pip install pyttsx3")


class TTSService:
    """Service for text-to-speech conversion"""

    def __init__(self, engine: str = "pyttsx3", rate: int = 150, voice: Optional[str] = None):
        """
        Initialize TTS service

        Args:
            engine: TTS engine to use ('pyttsx3', 'google', etc.)
            rate: Speech rate (words per minute), default 150
            voice: Optional voice selection (language, gender, etc.)
        """
        self.engine_name = engine
        self.rate = rate
        self.voice = voice
        self.engine = None

        if engine == "pyttsx3":
            if not PYTTSX3_AVAILABLE:
                raise RuntimeError("pyttsx3 is not installed. Install with: pip install pyttsx3")
            self._init_pyttsx3()
        else:
            raise ValueError(f"Unsupported TTS engine: {engine}")

    def _init_pyttsx3(self):
        """Initialize pyttsx3 engine"""
        try:
            self.engine = pyttsx3.init()
            self.engine.setProperty('rate', self.rate)

            # Set voice if specified
            if self.voice:
                voices = self.engine.getProperty('voices')
                for voice in voices:
                    if self.voice.lower() in voice.name.lower():
                        self.engine.setProperty('voice', voice.id)
                        logger.info(f"Selected voice: {voice.name}")
                        break

            logger.info("pyttsx3 engine initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing pyttsx3: {str(e)}")
            raise

    def text_to_speech(self, text: str, voice: Optional[str] = None,
                       rate: Optional[int] = None) -> Dict[str, Any]:
        """
        Convert text to speech

        Args:
            text: Text to convert
            voice: Optional voice override
            rate: Optional rate override

        Returns:
            Dictionary with 'audio' (bytes) and 'durationMs'
        """
        start_time = time.time()

        if not text or len(text.strip()) == 0:
            raise ValueError("Text is empty")

        try:
            # Use pyttsx3
            if self.engine_name == "pyttsx3":
                return self._tts_pyttsx3(text, voice, rate, start_time)
            else:
                raise ValueError(f"Unsupported engine: {self.engine_name}")

        except Exception as e:
            logger.error(f"TTS error: {str(e)}")
            raise

    def _tts_pyttsx3(self, text: str, voice: Optional[str] = None,
                     rate: Optional[int] = None,
                     start_time: float = None) -> Dict[str, Any]:
        """
        Generate speech using pyttsx3

        Args:
            text: Text to convert
            voice: Optional voice override
            rate: Optional rate override
            start_time: Start time for timing

        Returns:
            Dictionary with audio data and metadata
        """
        if start_time is None:
            start_time = time.time()

        try:
            # Create a temporary audio buffer
            audio_buffer = io.BytesIO()

            # Clone engine to avoid global state issues
            engine = pyttsx3.init()

            # Set rate
            if rate:
                engine.setProperty('rate', rate)
            else:
                engine.setProperty('rate', self.rate)

            # Set voice if specified
            if voice and voice != 'default':
                voices = engine.getProperty('voices')
                for v in voices:
                    if voice.lower() in v.name.lower():
                        engine.setProperty('voice', v.id)
                        logger.info(f"Using voice: {v.name}")
                        break

            # Save to file-like object
            engine.save_to_file(text, 'temp_audio.mp3')
            engine.runAndWait()

            # Read the generated audio file
            try:
                with open('temp_audio.mp3', 'rb') as f:
                    audio_data = f.read()

                # Calculate approximate duration (rough estimate)
                # Assuming average of 150 words per minute
                word_count = len(text.split())
                duration_seconds = (word_count / 150) * 60
                duration_ms = int(duration_seconds * 1000)

                processing_time_ms = int((time.time() - start_time) * 1000)

                logger.info(f"Audio generated: {len(audio_data)} bytes, ~{duration_ms}ms duration")

                return {
                    'audio': audio_data,
                    'durationMs': duration_ms,
                    'mimeType': 'audio/mpeg',
                    'processingTimeMs': processing_time_ms
                }

            finally:
                # Clean up temp file
                import os
                if os.path.exists('temp_audio.mp3'):
                    try:
                        os.remove('temp_audio.mp3')
                    except:
                        pass

        except Exception as e:
            logger.error(f"pyttsx3 error: {str(e)}")
            raise

    def get_available_voices(self) -> list:
        """Get list of available voices"""
        try:
            if self.engine:
                voices = self.engine.getProperty('voices')
                return [{'id': v.id, 'name': v.name, 'languages': v.languages}
                        for v in voices]
            return []
        except Exception as e:
            logger.error(f"Error getting voices: {str(e)}")
            return []
