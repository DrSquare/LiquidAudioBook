# Flask API Guide - Audiobook Generator

This guide explains how to use the Flask REST API for the audiobook generator.

## Quick Start

### 1. Install Dependencies

```bash
uv sync
```

### 2. Start the Flask Server

```bash
# Using environment variables for model configuration
export EXTRACTOR_MODEL="hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16"
export IMAGE_MODEL="hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16"
export AUDIO_MODEL="./lfm2-audio-1.5b-f16.gguf"
export AUDIO_MMPROJ="./mmproj-model-f16.gguf"
export AUDIO_DECODER="./audiodecoder-model-f16.gguf"

uv run python -m audiobook_generator.api
```

Or start without environment variables and configure via API:

```bash
uv run python -m audiobook_generator.api
```

The server will start on `http://0.0.0.0:5001` by default.

## API Endpoints

### Health Check

**GET** `/api/health`

Check if the API is running and see which models are configured.

```bash
curl http://localhost:5001/api/health
```

Response:
```json
{
  "status": "healthy",
  "service": "audiobook-generator",
  "models_configured": {
    "text_extraction": true,
    "audio_generation": true
  }
}
```

### Configure Models

**POST** `/api/config`

Configure the models used by the API (if not set via environment variables).

```bash
curl -X POST http://localhost:5001/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "extractor_model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
    "image_model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
    "audio_model": "./lfm2-audio-1.5b-f16.gguf",
    "audio_mmproj": "./mmproj-model-f16.gguf",
    "audio_decoder": "./audiodecoder-model-f16.gguf",
    "voice_description": "A clear, neutral narrator voice"
  }'
```

### 1. Extract Text from Images

**POST** `/api/extract-text`

Extract text from book page images. Two modes available:

#### Mode A: Upload Image Files

Upload image files directly via multipart form data.

```bash
curl -X POST http://localhost:5001/api/extract-text \
  -F "pages=@/path/to/page1.jpg" \
  -F "pages=@/path/to/page2.jpg" \
  -F "book_id=alice-in-wonderland"
```

Response:
```json
{
  "status": "success",
  "book_id": "alice-in-wonderland",
  "csv_path": "./uploads/alice-in-wonderland/pages.csv",
  "total_pages": 2,
  "results": [
    {"filename": "page1.jpg", "status": "success"},
    {"filename": "page2.jpg", "status": "success"}
  ],
  "data": [
    {
      "page_number": 1,
      "text": "Alice was beginning to get very tired...",
      "word_count": 15,
      "file_path": "./uploads/alice-in-wonderland/page1.jpg",
      "processed_at": "2025-11-15 10:00:00"
    }
  ]
}
```

#### Mode B: Process Existing Directory

Process all images in an existing directory.

```bash
curl -X POST http://localhost:5001/api/extract-text \
  -H "Content-Type: application/json" \
  -d '{
    "directory": "/path/to/book/pages",
    "book_id": "my-book"
  }'
```

Response:
```json
{
  "status": "success",
  "book_id": "my-book",
  "directory": "/path/to/book/pages",
  "csv_path": "/path/to/book/pages/pages.csv",
  "processed_files": 20,
  "total_pages": 20,
  "data": [...]
}
```

### 2. Generate Complete Audiobook

**POST** `/api/generate-audiobook`

Generate a complete audiobook from extracted text. This endpoint:
1. Generates individual audio files for each page
2. Combines them into a single audiobook file

All in one step!

#### Using book_id (for uploaded books):

```bash
curl -X POST http://localhost:5001/api/generate-audiobook \
  -H "Content-Type: application/json" \
  -d '{
    "book_id": "alice-in-wonderland",
    "silence_duration": 1.5
  }'
```

#### Using custom CSV path:

```bash
curl -X POST http://localhost:5001/api/generate-audiobook \
  -H "Content-Type: application/json" \
  -d '{
    "csv_path": "/path/to/pages.csv",
    "output_path": "/path/to/audiobook.wav",
    "silence_duration": 1.5
  }'
```

Response:
```json
{
  "status": "success",
  "csv_path": "./uploads/alice-in-wonderland/pages.csv",
  "audio_files_generated": 20,
  "audiobook_path": "./uploads/alice-in-wonderland/audiobook.wav",
  "file_size_bytes": 12345678,
  "file_size_mb": 11.77,
  "silence_duration": 1.5
}
```

### Download Audiobook

**GET** `/api/download/<book_id>/audiobook`

Download the completed audiobook file.

```bash
curl http://localhost:5001/api/download/alice-in-wonderland/audiobook \
  --output alice-in-wonderland.wav
```

Or visit in browser: `http://localhost:5001/api/download/alice-in-wonderland/audiobook`

## Complete Workflow Example

### Workflow 1: Upload Images and Generate Audiobook

```bash
# Step 1: Configure models (if not using environment variables)
curl -X POST http://localhost:5001/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "extractor_model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
    "image_model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
    "audio_model": "./lfm2-audio-1.5b-f16.gguf",
    "audio_mmproj": "./mmproj-model-f16.gguf",
    "audio_decoder": "./audiodecoder-model-f16.gguf"
  }'

# Step 2: Upload book pages and extract text
curl -X POST http://localhost:5001/api/extract-text \
  -F "pages=@page001.jpg" \
  -F "pages=@page002.jpg" \
  -F "pages=@page003.jpg" \
  -F "book_id=my-first-book"

# Step 3: Generate complete audiobook
curl -X POST http://localhost:5001/api/generate-audiobook \
  -H "Content-Type: application/json" \
  -d '{"book_id": "my-first-book", "silence_duration": 2.0}'

# Step 4: Download the audiobook
curl http://localhost:5001/api/download/my-first-book/audiobook \
  --output my-first-book.wav
```

### Workflow 2: Process Existing Directory

```bash
# Step 1: Extract text from existing directory
curl -X POST http://localhost:5001/api/extract-text \
  -H "Content-Type: application/json" \
  -d '{
    "directory": "/Users/me/books/alice-wonderland",
    "book_id": "alice"
  }'

# Step 2: Generate complete audiobook
curl -X POST http://localhost:5001/api/generate-audiobook \
  -H "Content-Type: application/json" \
  -d '{"book_id": "alice", "silence_duration": 1.5}'
```

## Python Client Example

```python
import requests

API_BASE = "http://localhost:5001/api"

# Configure models
config = {
    "extractor_model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
    "image_model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
    "audio_model": "./lfm2-audio-1.5b-f16.gguf",
    "audio_mmproj": "./mmproj-model-f16.gguf",
    "audio_decoder": "./audiodecoder-model-f16.gguf"
}
response = requests.post(f"{API_BASE}/config", json=config)
print(response.json())

# Upload pages
files = [
    ('pages', open('page1.jpg', 'rb')),
    ('pages', open('page2.jpg', 'rb'))
]
data = {'book_id': 'my-book'}
response = requests.post(f"{API_BASE}/extract-text", files=files, data=data)
print(response.json())

# Generate complete audiobook
response = requests.post(
    f"{API_BASE}/generate-audiobook",
    json={"book_id": "my-book", "silence_duration": 1.5}
)
print(response.json())

# Download audiobook
response = requests.get(f"{API_BASE}/download/my-book/audiobook")
with open("my-book-audiobook.wav", "wb") as f:
    f.write(response.content)
print("Audiobook downloaded!")
```

## Configuration Options

### Environment Variables

- `EXTRACTOR_MODEL`: Model for text extraction (e.g., `hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16`)
- `IMAGE_MODEL`: Model for image processing (e.g., `hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16`)
- `AUDIO_MODEL`: Path to main GGUF audio model
- `AUDIO_MMPROJ`: Path to MMProj GGUF file
- `AUDIO_DECODER`: Path to audio decoder GGUF file
- `PORT`: Server port (default: 5001)
- `HOST`: Server host (default: 0.0.0.0)
- `DEBUG`: Enable debug mode (default: False)

### API Configuration

Models can also be configured via the `/api/config` endpoint at runtime.

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid request (missing parameters, invalid format)
- `404 Not Found`: Resource not found (file, directory, audiobook)
- `500 Internal Server Error`: Server error (model initialization, processing errors)

Error response format:
```json
{
  "error": "Description of what went wrong"
}
```

## Performance Notes

- **Text Extraction**: ~2-3 minutes per page (depends on hardware)
- **Audio Generation**: ~30-60 seconds per page
- **Audiobook Combination**: Near-instant (just concatenation)

For large books (50+ pages), the complete process may take 2-4 hours.

## Troubleshooting

### Models Not Configured

**Error**: `"All three audio model files must be configured"`

**Solution**: Configure models via environment variables or `/api/config` endpoint before calling audio generation endpoints.

### File Not Found

**Error**: `"CSV file not found"`

**Solution**: Make sure you've run text extraction first, or verify the CSV path exists.

### Upload Folder Permission Issues

**Error**: Permission denied when creating upload folder

**Solution**: Ensure the Flask process has write permissions to create the `./uploads` directory.

## Security Considerations

**Important**: This is a development server. For production:

1. Use a production WSGI server (gunicorn, uWSGI)
2. Add authentication/authorization
3. Validate and sanitize all file uploads
4. Add rate limiting
5. Use HTTPS
6. Configure CORS appropriately

Example with gunicorn:

```bash
uv run gunicorn -w 4 -b 0.0.0.0:5001 audiobook_generator.api:app
```
