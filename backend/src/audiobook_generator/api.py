#!/usr/bin/env python3
"""
Flask API for Audiobook Generator.

Provides REST endpoints for:
1. Text extraction from book page images
2. Batch audio generation from extracted text
3. Combining audio files into a complete audiobook
"""

from pathlib import Path
from typing import Dict, Any
import os

from flask import Flask, request, jsonify, send_file
from loguru import logger
from werkzeug.utils import secure_filename

from audiobook_generator.page_file_handler import PageFileHandler
from audiobook_generator.page_processor import PageProcessor
from audiobook_generator.text_to_speech import TTSProcessor


app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = Path("./uploads")
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'}

# Global state for models (initialized on first use)
page_processor = None
tts_processor = None
config = {
    'extractor_model': None,
    'image_model': None,
    'audio_model': None,
    'audio_mmproj': None,
    'audio_decoder': None,
    'voice_description': "A clear, neutral narrator voice with excellent quality."
}


def allowed_file(filename: str) -> bool:
    """Check if file has an allowed extension."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def initialize_page_processor():
    """Initialize the page processor for text extraction."""
    global page_processor

    if page_processor is None:
        if not config['extractor_model'] or not config['image_model']:
            raise ValueError("Extractor and image models must be configured")

        logger.info("Initializing page processor...")
        page_processor = PageProcessor(
            extractor_model=config['extractor_model'],
            image_process_model=config['image_model']
        )

    return page_processor


def initialize_tts_processor():
    """Initialize the TTS processor for audio generation."""
    global tts_processor

    if tts_processor is None:
        if not config['audio_model'] or not config['audio_mmproj'] or not config['audio_decoder']:
            raise ValueError("All three audio model files must be configured")

        logger.info("Initializing TTS processor...")
        tts_processor = TTSProcessor(
            model_path=config['audio_model'],
            mmproj_path=config['audio_mmproj'],
            audiodecoder_path=config['audio_decoder'],
            voice_description=config['voice_description']
        )

    return tts_processor


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'audiobook-generator',
        'models_configured': {
            'text_extraction': bool(config['extractor_model'] and config['image_model']),
            'audio_generation': bool(config['audio_model'] and config['audio_mmproj'] and config['audio_decoder'])
        }
    })


@app.route('/api/config', methods=['POST'])
def configure_models():
    """
    Configure the models used by the API.

    Request JSON:
    {
        "extractor_model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
        "image_model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
        "audio_model": "/path/to/lfm2-audio-1.5b-f16.gguf",
        "audio_mmproj": "/path/to/mmproj-model-f16.gguf",
        "audio_decoder": "/path/to/audiodecoder-model-f16.gguf",
        "voice_description": "Optional voice description"
    }
    """
    data = request.get_json()

    if 'extractor_model' in data:
        config['extractor_model'] = data['extractor_model']
    if 'image_model' in data:
        config['image_model'] = data['image_model']
    if 'audio_model' in data:
        config['audio_model'] = data['audio_model']
    if 'audio_mmproj' in data:
        config['audio_mmproj'] = data['audio_mmproj']
    if 'audio_decoder' in data:
        config['audio_decoder'] = data['audio_decoder']
    if 'voice_description' in data:
        config['voice_description'] = data['voice_description']

    # Reset processors to force reinitialization with new config
    global page_processor, tts_processor
    page_processor = None
    tts_processor = None

    return jsonify({
        'status': 'success',
        'message': 'Models configured successfully',
        'config': {
            'extractor_model': config['extractor_model'],
            'image_model': config['image_model'],
            'audio_model': config['audio_model'],
            'audio_mmproj': config['audio_mmproj'],
            'audio_decoder': config['audio_decoder'],
            'voice_description': config['voice_description']
        }
    })


@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    """
    Extract text from book page images.

    Accepts:
    - Multipart form data with image files
    - JSON with 'directory' path to process existing files

    For file upload:
    - Field name: 'pages' (can upload multiple files)
    - Returns CSV data with extracted text

    For directory processing:
    - JSON: {"directory": "/path/to/images", "book_id": "optional-book-id"}
    - Processes all images in directory
    """
    try:
        processor = initialize_page_processor()

        # Check if request has files or directory path
        if 'pages' in request.files:
            # Handle file uploads
            files = request.files.getlist('pages')

            if not files or files[0].filename == '':
                return jsonify({'error': 'No files provided'}), 400

            # Create temporary directory for this request
            book_id = request.form.get('book_id', 'temp_book')
            book_dir = UPLOAD_FOLDER / book_id
            book_dir.mkdir(parents=True, exist_ok=True)

            csv_path = str(book_dir / 'pages.csv')
            handler = PageFileHandler(processor, csv_path)

            results = []
            for file in files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = book_dir / filename
                    file.save(str(filepath))

                    # Process the page
                    result = handler.process_page(str(filepath))
                    results.append({
                        'filename': filename,
                        'status': 'success' if result else 'failed'
                    })

            # Read the CSV and return data
            import pandas as pd
            df = pd.read_csv(csv_path)

            return jsonify({
                'status': 'success',
                'book_id': book_id,
                'csv_path': csv_path,
                'total_pages': len(df),
                'results': results,
                'data': df.to_dict(orient='records')
            })

        elif request.is_json:
            # Handle directory processing
            data = request.get_json()
            directory = data.get('directory')
            book_id = data.get('book_id', Path(directory).name)

            if not directory:
                return jsonify({'error': 'Directory path required'}), 400

            dir_path = Path(directory)
            if not dir_path.exists():
                return jsonify({'error': f'Directory not found: {directory}'}), 404

            csv_path = str(dir_path / 'pages.csv')
            handler = PageFileHandler(processor, csv_path)

            # Process all image files in directory
            processed_count = 0
            for file_path in dir_path.rglob("*"):
                if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
                    handler.process_page(str(file_path))
                    processed_count += 1

            # Read the CSV and return data
            import pandas as pd
            df = pd.read_csv(csv_path)

            return jsonify({
                'status': 'success',
                'book_id': book_id,
                'directory': directory,
                'csv_path': csv_path,
                'processed_files': processed_count,
                'total_pages': len(df),
                'data': df.to_dict(orient='records')
            })

        else:
            return jsonify({'error': 'Invalid request format. Send files or JSON with directory path'}), 400

    except Exception as e:
        logger.exception("Error in text extraction")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate-audio', methods=['POST'])
def generate_audio():
    """
    Generate audio files from extracted text.

    Request JSON:
    {
        "csv_path": "/path/to/pages.csv",
        "output_dir": "/path/to/audio/output"  # optional
    }

    Or use book_id for uploaded books:
    {
        "book_id": "my-book"
    }
    """
    try:
        tts = initialize_tts_processor()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'JSON data required'}), 400

        # Get CSV path
        if 'book_id' in data:
            book_id = data['book_id']
            book_dir = UPLOAD_FOLDER / book_id
            csv_path = str(book_dir / 'pages.csv')
            output_dir = str(book_dir / 'audio')
        else:
            csv_path = data.get('csv_path')
            if not csv_path:
                return jsonify({'error': 'csv_path or book_id required'}), 400

            output_dir = data.get('output_dir')
            if not output_dir:
                # Default to 'audio' subdirectory next to CSV
                csv_parent = Path(csv_path).parent
                output_dir = str(csv_parent / 'audio')

        # Check if CSV exists
        if not Path(csv_path).exists():
            return jsonify({'error': f'CSV file not found: {csv_path}'}), 404

        # Generate audio for all pages
        logger.info(f"Generating audio from {csv_path} to {output_dir}")
        tts.text_to_speech_batch(csv_path, output_dir)

        # Read updated CSV to get audio file paths
        import pandas as pd
        df = pd.read_csv(csv_path)

        audio_files = df[df['audio_path'].notna()]['audio_path'].tolist()

        return jsonify({
            'status': 'success',
            'csv_path': csv_path,
            'output_dir': output_dir,
            'audio_files_generated': len(audio_files),
            'audio_files': audio_files
        })

    except Exception as e:
        logger.exception("Error in audio generation")
        return jsonify({'error': str(e)}), 500


@app.route('/api/combine-audiobook', methods=['POST'])
def combine_audiobook():
    """
    Combine individual audio files into a complete audiobook.

    Request JSON:
    {
        "csv_path": "/path/to/pages.csv",
        "output_path": "/path/to/audiobook.wav",  # optional
        "silence_duration": 1.0  # optional, seconds between pages
    }

    Or use book_id for uploaded books:
    {
        "book_id": "my-book",
        "silence_duration": 1.0  # optional
    }
    """
    try:
        tts = initialize_tts_processor()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'JSON data required'}), 400

        # Get paths
        if 'book_id' in data:
            book_id = data['book_id']
            book_dir = UPLOAD_FOLDER / book_id
            csv_path = str(book_dir / 'pages.csv')
            output_path = str(book_dir / 'audiobook.wav')
        else:
            csv_path = data.get('csv_path')
            if not csv_path:
                return jsonify({'error': 'csv_path or book_id required'}), 400

            output_path = data.get('output_path')
            if not output_path:
                # Default to 'audiobook.wav' next to CSV
                csv_parent = Path(csv_path).parent
                output_path = str(csv_parent / 'audiobook.wav')

        silence_duration = data.get('silence_duration', 1.0)

        # Check if CSV exists
        if not Path(csv_path).exists():
            return jsonify({'error': f'CSV file not found: {csv_path}'}), 404

        # Combine audio files
        logger.info(f"Combining audiobook from {csv_path} to {output_path}")
        result_path = tts.combine_audiobook(csv_path, output_path, silence_duration)

        # Get file size
        file_size = Path(result_path).stat().st_size

        return jsonify({
            'status': 'success',
            'audiobook_path': result_path,
            'file_size_bytes': file_size,
            'silence_duration': silence_duration
        })

    except Exception as e:
        logger.exception("Error in audiobook combination")
        return jsonify({'error': str(e)}), 500


@app.route('/api/download/<book_id>/audiobook', methods=['GET'])
def download_audiobook(book_id: str):
    """Download the completed audiobook file."""
    try:
        book_dir = UPLOAD_FOLDER / book_id
        audiobook_path = book_dir / 'audiobook.wav'

        if not audiobook_path.exists():
            return jsonify({'error': 'Audiobook not found. Generate it first using /api/combine-audiobook'}), 404

        return send_file(
            audiobook_path,
            mimetype='audio/wav',
            as_attachment=True,
            download_name=f'{book_id}_audiobook.wav'
        )

    except Exception as e:
        logger.exception("Error downloading audiobook")
        return jsonify({'error': str(e)}), 500


def main():
    """Run the Flask development server."""
    # Create upload directory
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

    # Get configuration from environment variables or use defaults
    config['extractor_model'] = os.getenv('EXTRACTOR_MODEL')
    config['image_model'] = os.getenv('IMAGE_MODEL')
    config['audio_model'] = os.getenv('AUDIO_MODEL')
    config['audio_mmproj'] = os.getenv('AUDIO_MMPROJ')
    config['audio_decoder'] = os.getenv('AUDIO_DECODER')

    port = int(os.getenv('PORT', 5001))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('DEBUG', 'False').lower() == 'true'

    logger.info(f"Starting Flask API server on {host}:{port}")
    logger.info("Configure models using POST /api/config or environment variables")

    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    main()
