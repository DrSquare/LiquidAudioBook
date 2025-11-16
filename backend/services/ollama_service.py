"""
Ollama Service
Handles communication with local Ollama server for ML model inference
"""

import requests
import base64
import logging
import time
from typing import Dict, Any, Optional
from io import BytesIO

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with Ollama models"""

    def __init__(self, base_url: str = "http://localhost:11434",
                 vision_model: str = "llava",
                 text_model: str = "mistral",
                 timeout: int = 120000):
        """
        Initialize Ollama service

        Args:
            base_url: Ollama server URL
            vision_model: Name of vision model for image text extraction
            text_model: Name of text model for refinement
            timeout: Timeout in milliseconds for model inference
        """
        self.base_url = base_url.rstrip('/')
        self.vision_model = vision_model
        self.text_model = text_model
        self.timeout = timeout / 1000  # Convert to seconds
        self._model_cache = {}

    def is_server_running(self) -> bool:
        """Check if Ollama server is running"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Ollama server check failed: {str(e)}")
            return False

    def is_model_loaded(self, model_name: str) -> bool:
        """Check if a specific model is loaded"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )
            if response.status_code != 200:
                return False

            data = response.json()
            models = data.get('models', [])

            return any(
                m['name'] == model_name or m['name'].startswith(model_name + ':')
                for m in models
            )
        except Exception as e:
            logger.warning(f"Model check failed for {model_name}: {str(e)}")
            return False

    def check_server_status(self) -> Dict[str, Any]:
        """Get detailed server and models status"""
        is_running = self.is_server_running()

        status = {
            'isRunning': is_running,
            'baseUrl': self.base_url,
            'models': {
                'vision': {
                    'name': self.vision_model,
                    'loaded': is_running and self.is_model_loaded(self.vision_model),
                    'error': None
                },
                'text': {
                    'name': self.text_model,
                    'loaded': is_running and self.is_model_loaded(self.text_model),
                    'error': None
                }
            }
        }

        if not is_running:
            status['error'] = f"Cannot connect to Ollama at {self.base_url}"
        else:
            if not status['models']['vision']['loaded']:
                status['models']['vision']['error'] = f"Model {self.vision_model} not loaded"
            if not status['models']['text']['loaded']:
                status['models']['text']['error'] = f"Model {self.text_model} not loaded"

        return status

    def extract_text_from_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extract text from image using vision model

        Args:
            image_bytes: Image file content as bytes

        Returns:
            Dictionary with 'text' and 'processingTimeMs'
        """
        try:
            start_time = time.time()

            # Convert image bytes to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')

            prompt = "Extract and return all visible text from this image. Return only the text content, nothing else."

            logger.info(f"Sending image to {self.vision_model} for text extraction")

            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.vision_model,
                    "prompt": prompt,
                    "images": [base64_image],
                    "stream": False
                },
                timeout=self.timeout
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")

            result = response.json()
            extracted_text = result.get('response', '').strip()

            processing_time_ms = int((time.time() - start_time) * 1000)

            return {
                'text': extracted_text,
                'confidence': 0.85,  # Default confidence for Ollama
                'processingTimeMs': processing_time_ms
            }

        except requests.Timeout:
            raise Exception(f"Text extraction timeout (exceeded {self.timeout}s)")
        except Exception as e:
            logger.error(f"Text extraction error: {str(e)}")
            raise

    def refine_text(self, text: str, instructions: str = "") -> Dict[str, Any]:
        """
        Refine text using language model

        Args:
            text: Raw text to refine
            instructions: Optional refinement instructions

        Returns:
            Dictionary with 'text' and 'processingTimeMs'
        """
        try:
            start_time = time.time()

            # Build prompt
            base_prompt = """You are a text refinement assistant. Your task is to:
1. Clean up any OCR errors or formatting issues
2. Ensure proper grammar and punctuation
3. Maintain the original meaning and content
4. Fix common typos and inconsistencies
5. Improve readability

Here is the text to refine:

{text}"""

            if instructions:
                base_prompt += f"\n\nAdditional instructions: {instructions}"

            base_prompt += "\n\nReturn only the refined text, without any explanations or metadata."

            prompt = base_prompt.format(text=text)

            logger.info(f"Refining text with {self.text_model} ({len(text)} chars)")

            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.text_model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=self.timeout
            )

            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")

            result = response.json()
            refined_text = result.get('response', '').strip()

            processing_time_ms = int((time.time() - start_time) * 1000)

            return {
                'text': refined_text,
                'processingTimeMs': processing_time_ms
            }

        except requests.Timeout:
            raise Exception(f"Text refinement timeout (exceeded {self.timeout}s)")
        except Exception as e:
            logger.error(f"Text refinement error: {str(e)}")
            raise

    def list_models(self) -> list:
        """Get list of available models"""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags",
                timeout=5
            )

            if response.status_code != 200:
                return []

            data = response.json()
            return [
                {
                    'name': m['name'],
                    'size': m.get('size', 0),
                    'modifiedAt': m.get('modified_at', '')
                }
                for m in data.get('models', [])
            ]

        except Exception as e:
            logger.error(f"Error listing models: {str(e)}")
            return []

    def download_model(self, model_name: str) -> Dict[str, Any]:
        """
        Download/pull a model from Ollama registry

        Args:
            model_name: Name of the model to download (e.g., 'llava', 'mistral')

        Returns:
            Dictionary with download status
        """
        try:
            logger.info(f"Attempting to download model: {model_name}")

            # Check if already loaded
            if self.is_model_loaded(model_name):
                logger.info(f"Model {model_name} already loaded")
                return {
                    'model': model_name,
                    'loaded': True,
                    'message': 'Model already downloaded'
                }

            # Note: Ollama pull typically needs to be done via command line
            # This is more of a check/notification endpoint
            return {
                'model': model_name,
                'loaded': False,
                'message': f'Run: ollama pull {model_name}',
                'instruction': f'Please download the model using: ollama pull {model_name}'
            }

        except Exception as e:
            logger.error(f"Error with model download: {str(e)}")
            raise
