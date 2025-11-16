"""
LiquidAudio Flask Backend
Handles ML model processing: Vision extraction, text refinement, and TTS
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
import json
import logging
from datetime import datetime
from typing import Dict, Any, Tuple

from services.ollama_service import OllamaService
from services.tts_service import TTSService
from services.image_processor import ImageProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize services
ollama = OllamaService(
    base_url=os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434'),
    vision_model=os.getenv('OLLAMA_VISION_MODEL', 'llava'),
    text_model=os.getenv('OLLAMA_TEXT_MODEL', 'mistral'),
    timeout=int(os.getenv('OLLAMA_TIMEOUT', '120000'))
)

tts = TTSService(
    engine=os.getenv('TTS_ENGINE', 'pyttsx3'),
    rate=int(os.getenv('TTS_RATE', '150'))
)

image_processor = ImageProcessor()

# Error handler
@app.errorhandler(Exception)
def handle_error(error):
    logger.error(f"Error: {str(error)}", exc_info=True)
    return jsonify({
        'error': str(error),
        'timestamp': datetime.utcnow().isoformat()
    }), 500


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'LiquidAudio Backend',
        'timestamp': datetime.utcnow().isoformat()
    })


@app.route('/api/status', methods=['GET'])
def status():
    """Get system and models status"""
    logger.info("Status check requested")

    ollama_status = ollama.check_server_status()

    return jsonify({
        'status': 'ready' if ollama_status['is_running'] else 'error',
        'timestamp': datetime.utcnow().isoformat(),
        'ollama': ollama_status,
        'tts': {
            'engine': tts.engine,
            'available': True
        }
    })


# ============================================================================
# Text Extraction from Images
# ============================================================================

@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    """
    Extract text from images using vision model

    Expected request:
    {
        "images": [base64_image_1, base64_image_2, ...],
        "job_id": "uuid"
    }
    """
    try:
        data = request.get_json()

        if not data or 'images' not in data:
            return jsonify({'error': 'No images provided'}), 400

        images = data.get('images', [])
        job_id = data.get('job_id', 'unknown')

        logger.info(f"[{job_id}] Extracting text from {len(images)} images")

        # Check Ollama availability
        if not ollama.is_server_running():
            logger.error(f"[{job_id}] Ollama server not available")
            return jsonify({
                'error': 'Ollama server not available',
                'message': f'Cannot connect to Ollama at {ollama.base_url}'
            }), 503

        # Check vision model
        if not ollama.is_model_loaded(ollama.vision_model):
            logger.error(f"[{job_id}] Vision model not loaded: {ollama.vision_model}")
            return jsonify({
                'error': f'Vision model not loaded: {ollama.vision_model}',
                'message': f'Please download the model with: ollama pull {ollama.vision_model}'
            }), 503

        extracted_texts = []

        for page_number, image_data in enumerate(images, 1):
            try:
                # Decode base64 if necessary
                if isinstance(image_data, str):
                    # Remove data URL prefix if present
                    if image_data.startswith('data:'):
                        image_data = image_data.split(',')[1]
                    image_bytes = base64.b64decode(image_data)
                else:
                    image_bytes = image_data

                logger.info(f"[{job_id}] Processing image {page_number}/{len(images)}")

                # Extract text using vision model
                result = ollama.extract_text_from_image(image_bytes)

                extracted_texts.append({
                    'pageNumber': page_number,
                    'text': result['text'],
                    'confidence': result.get('confidence', 0.85),
                    'processingTimeMs': result['processingTimeMs']
                })

                logger.info(f"[{job_id}] Image {page_number} processed: {result['processingTimeMs']}ms")

            except Exception as e:
                logger.error(f"[{job_id}] Error processing image {page_number}: {str(e)}")
                return jsonify({
                    'error': f'Failed to process image {page_number}',
                    'message': str(e)
                }), 500

        logger.info(f"[{job_id}] Text extraction complete")

        return jsonify({
            'jobId': job_id,
            'status': 'completed',
            'extractedTexts': extracted_texts,
            'totalPages': len(images),
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"Text extraction error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Text extraction failed',
            'message': str(e)
        }), 500


# ============================================================================
# Text Refinement
# ============================================================================

@app.route('/api/refine-text', methods=['POST'])
def refine_text():
    """
    Refine extracted text using language model

    Expected request:
    {
        "jobId": "uuid",
        "extractedTexts": ["text1", "text2", ...],
        "refinementInstructions": "optional instructions"
    }
    """
    try:
        data = request.get_json()

        if not data or 'extractedTexts' not in data:
            return jsonify({'error': 'No text provided'}), 400

        job_id = data.get('jobId', 'unknown')
        extracted_texts = data.get('extractedTexts', [])
        instructions = data.get('refinementInstructions', '')

        logger.info(f"[{job_id}] Refining text ({len(extracted_texts)} pages)")

        # Check Ollama availability
        if not ollama.is_server_running():
            logger.error(f"[{job_id}] Ollama server not available")
            return jsonify({
                'error': 'Ollama server not available',
                'message': f'Cannot connect to Ollama at {ollama.base_url}'
            }), 503

        # Check text model
        if not ollama.is_model_loaded(ollama.text_model):
            logger.error(f"[{job_id}] Text model not loaded: {ollama.text_model}")
            return jsonify({
                'error': f'Text model not loaded: {ollama.text_model}',
                'message': f'Please download the model with: ollama pull {ollama.text_model}'
            }), 503

        # Combine all texts
        combined_text = '\n\n'.join(extracted_texts)

        logger.info(f"[{job_id}] Combined text length: {len(combined_text)} characters")

        # Refine text using language model
        result = ollama.refine_text(combined_text, instructions)

        logger.info(f"[{job_id}] Text refinement complete: {result['processingTimeMs']}ms")

        return jsonify({
            'jobId': job_id,
            'status': 'completed',
            'refinedText': result['text'],
            'processingTimeMs': result['processingTimeMs'],
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"[{job_id}] Text refinement error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Text refinement failed',
            'message': str(e)
        }), 500


# ============================================================================
# Audio Generation (TTS)
# ============================================================================

@app.route('/api/generate-audio', methods=['POST'])
def generate_audio():
    """
    Generate audio from text using TTS

    Expected request:
    {
        "jobId": "uuid",
        "text": "text to convert to speech",
        "voice": "optional voice selection",
        "rate": 150
    }
    """
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400

        job_id = data.get('jobId', 'unknown')
        text = data.get('text', '')
        voice = data.get('voice', 'default')
        rate = data.get('rate', 150)

        logger.info(f"[{job_id}] Generating audio from text ({len(text)} chars)")

        if not text or len(text.strip()) == 0:
            return jsonify({'error': 'Text is empty'}), 400

        # Generate audio
        result = tts.text_to_speech(text, voice=voice, rate=rate)

        audio_data = result['audio']
        duration_ms = result['durationMs']

        logger.info(f"[{job_id}] Audio generated: {len(audio_data)} bytes, {duration_ms}ms duration")

        return jsonify({
            'jobId': job_id,
            'status': 'completed',
            'audioData': base64.b64encode(audio_data).decode('utf-8'),
            'durationMs': duration_ms,
            'mimeType': 'audio/mpeg',
            'processingTimeMs': result['processingTimeMs'],
            'timestamp': datetime.utcnow().isoformat()
        })

    except Exception as e:
        logger.error(f"[{job_id}] Audio generation error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Audio generation failed',
            'message': str(e)
        }), 500


# ============================================================================
# Utility Endpoints
# ============================================================================

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    try:
        models = ollama.list_models()
        return jsonify({
            'models': models,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/download-model/<model_name>', methods=['POST'])
def download_model(model_name: str):
    """Download a model"""
    try:
        logger.info(f"Starting download for model: {model_name}")
        result = ollama.download_model(model_name)

        return jsonify({
            'model': model_name,
            'status': 'downloading' if not result['loaded'] else 'ready',
            'message': result.get('message', ''),
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Error downloading model {model_name}: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting LiquidAudio Backend on port {port}")
    logger.info(f"Ollama: {os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}")
    logger.info(f"Vision Model: {os.getenv('OLLAMA_VISION_MODEL', 'llava')}")
    logger.info(f"Text Model: {os.getenv('OLLAMA_TEXT_MODEL', 'mistral')}")
    logger.info(f"TTS Engine: {os.getenv('TTS_ENGINE', 'pyttsx3')}")

    app.run(host='0.0.0.0', port=port, debug=debug)
