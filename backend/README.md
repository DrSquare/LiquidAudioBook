# LiquidAudio Flask Backend

Flask-based microservice for ML model processing using Ollama.

## Features

- **Text Extraction**: Extract text from book page images using Ollama vision model (llava)
- **Text Refinement**: Refine and enhance extracted text using Ollama language model (mistral)
- **TTS Audio**: Generate audio from text using pyttsx3
- **Model Management**: Check and manage Ollama models

## Architecture

```
React Frontend (Port 5000)
        ↓
Express Backend (Port 5000)
        ↓
Flask Backend (Port 5001)
        ↓
Ollama Server (Port 11434)
```

## Prerequisites

1. **Python 3.8+**
2. **Ollama Server** running on `http://localhost:11434`
   - Install from https://ollama.com/download
   - Models downloaded:
     - `ollama pull llava` (Vision model, ~47GB)
     - `ollama pull mistral` (Text model, ~13GB)

## Installation

### 1. Setup Python Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your settings
# - OLLAMA_BASE_URL (default: http://localhost:11434)
# - OLLAMA_VISION_MODEL (default: llava)
# - OLLAMA_TEXT_MODEL (default: mistral)
```

### 4. Download Ollama Models

```bash
# In separate terminal, start Ollama
ollama serve

# In another terminal, download models
ollama pull llava      # Vision model (~47GB, takes 15-30 mins)
ollama pull mistral    # Text model (~13GB, takes 5-15 mins)

# Verify models are downloaded
ollama list
```

## Usage

### Start Flask Backend

```bash
python app.py
```

Backend will start on `http://localhost:5001`

### Check Service Status

```bash
curl http://localhost:5001/api/health

# Get detailed status
curl http://localhost:5001/api/status
```

### API Endpoints

#### 1. Health Check
```bash
GET /api/health
```

#### 2. System Status
```bash
GET /api/status

Response:
{
  "status": "ready",
  "ollama": {
    "isRunning": true,
    "models": {
      "vision": {"name": "llava", "loaded": true},
      "text": {"name": "mistral", "loaded": true}
    }
  }
}
```

#### 3. Extract Text from Images
```bash
POST /api/extract-text
Content-Type: application/json

{
  "jobId": "uuid",
  "images": ["base64_image_1", "base64_image_2"]
}

Response:
{
  "jobId": "uuid",
  "status": "completed",
  "extractedTexts": [
    {
      "pageNumber": 1,
      "text": "extracted text",
      "processingTimeMs": 45000
    }
  ]
}
```

#### 4. Refine Text
```bash
POST /api/refine-text
Content-Type: application/json

{
  "jobId": "uuid",
  "extractedTexts": ["text1", "text2"],
  "refinementInstructions": "optional"
}

Response:
{
  "jobId": "uuid",
  "refinedText": "refined combined text",
  "processingTimeMs": 35000
}
```

#### 5. Generate Audio
```bash
POST /api/generate-audio
Content-Type: application/json

{
  "jobId": "uuid",
  "text": "text to convert",
  "voice": "default",
  "rate": 150
}

Response:
{
  "jobId": "uuid",
  "audioData": "base64_encoded_audio",
  "durationMs": 120000,
  "processingTimeMs": 45000
}
```

#### 6. Get Available Models
```bash
GET /api/models

Response:
{
  "models": [
    {
      "name": "llava:13b",
      "size": 47000000000,
      "modifiedAt": "2025-11-15T..."
    }
  ]
}
```

## Processing Times (Approximate)

| Operation | Time | Notes |
|-----------|------|-------|
| Load vision model | 30-60s | One-time on startup |
| Extract text (1 image) | 30-60s | Depends on image complexity |
| Extract text (5 images) | 150-300s | Sequential processing |
| Refine text (5 pages) | 20-40s | Fast turnaround |
| Generate audio (5 min read) | 30-60s | Depends on text length |
| **Total (5 pages)** | **3-7 min** | **Typical workflow** |

## Environment Variables

```bash
# Flask Configuration
FLASK_ENV=development           # development or production
FLASK_DEBUG=false              # Enable debug mode
FLASK_PORT=5001                # Port to run on

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434  # Ollama server URL
OLLAMA_VISION_MODEL=llava               # Vision model name
OLLAMA_TEXT_MODEL=mistral               # Text model name
OLLAMA_TIMEOUT=120000                   # Timeout in ms

# TTS Configuration
TTS_ENGINE=pyttsx3              # TTS engine
TTS_RATE=150                    # Speech rate (WPM)
TTS_VOICE=default               # Voice selection
```

## Troubleshooting

### Issue: "Cannot connect to Ollama"

```
Solution:
1. Verify Ollama is running: ollama serve
2. Check URL in .env: OLLAMA_BASE_URL=http://localhost:11434
3. Test connectivity: curl http://localhost:11434/api/tags
```

### Issue: "Model not found"

```
Solution:
1. Check loaded models: ollama list
2. Download model: ollama pull llava
3. Wait for download to complete
4. Verify with: ollama list
```

### Issue: "Out of memory"

```
Solution:
1. Check available RAM: 16GB recommended
2. Use smaller model: ollama pull llava:7b (27GB instead of 47GB)
3. Close other applications
4. Check: nvidia-smi (if using GPU)
```

### Issue: "Slow processing"

```
Solution:
1. Use smaller model: mistral instead of llama2
2. Enable GPU: Configure NVIDIA CUDA
3. Reduce batch size: Process 1 image at a time
4. Upgrade hardware: More RAM or faster SSD
```

## Development

### Run with Debug Enabled

```bash
FLASK_DEBUG=true FLASK_ENV=development python app.py
```

### Run Tests (Future)

```bash
pytest tests/
```

### Code Style

```bash
# Format code
black .

# Check style
flake8 .
```

## Integration with Express Backend

The Express backend (app/server) will call this Flask backend for AI/ML processing:

```typescript
// Express backend
const flaskUrl = 'http://localhost:5001';

// Forward requests to Flask
fetch(`${flaskUrl}/api/extract-text`, {
  method: 'POST',
  body: JSON.stringify({ images, jobId })
})
```

## Performance Optimization

### 1. Use GPU Acceleration

For NVIDIA GPU support:
```bash
# Install CUDA support
ollama run llava
# Ollama will use GPU if available
```

### 2. Use Smaller Models

```bash
# Faster but less accurate
ollama pull llava:7b        # 27GB instead of 47GB
ollama pull neural-chat     # 4.1GB instead of mistral 13GB
```

### 3. Batch Processing

Process multiple images in parallel (future enhancement).

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in console output
3. Verify Ollama is running and models are loaded
4. Check system resources (RAM, disk space)

## Next Steps

1. ✅ Create Flask backend with Ollama integration
2. ✅ Implement text extraction, refinement, TTS
3. ⏳ Update Express routes to call Flask backend
4. ⏳ Test end-to-end integration
5. ⏳ Performance optimization
6. ⏳ Add caching layer
7. ⏳ Deploy as containerized service
