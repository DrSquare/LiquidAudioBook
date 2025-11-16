# Flask Backend Integration Guide

This document describes how the Express backend integrates with the Flask ML service.

## Architecture

```
┌─────────────────────────────────────┐
│   React Frontend (Port 5000)         │
│   • Image Upload Interface           │
│   • Progress Tracking                │
│   • Audio Player with Controls       │
└────────────────┬────────────────────┘
                 │ HTTP Requests
┌────────────────▼────────────────────┐
│   Express Backend (Port 3000)        │
│   • HTTP request routing             │
│   • File upload handling (multer)    │
│   • Job state management (storage)   │
│   • Flask API client (flask-client)  │
└────────────────┬────────────────────┘
                 │ HTTP Requests to Flask
┌────────────────▼────────────────────┐
│   Flask ML Service (Port 5001)       │
│   • Image validation                 │
│   • Ollama API orchestration         │
│   • TTS audio generation             │
└────────────────┬────────────────────┘
                 │ Model Inference
┌────────────────▼────────────────────┐
│   Ollama Server (Port 11434)         │
│   • LFM2-VL-3B (vision-language)     │
│   • LFM2-1.2B-Extract (text)         │
│   • LFM2-Audio-1.5B (TTS - pending)  │
└─────────────────────────────────────┘
```

## Integration Components

### 1. Flask Client (`services/flask-client.ts`)

The `FlaskClient` class handles all communication with the Flask ML service.

**Usage:**

```typescript
import { flaskClient } from "./services/flask-client";

// Check if Flask is healthy
const isHealthy = await flaskClient.isHealthy();

// Extract text from images
const extractResult = await flaskClient.extractText(jobId, imageBuffers);

// Refine text
const refineResult = await flaskClient.refineText(jobId, extractedTexts);

// Generate audio
const audioResult = await flaskClient.generateAudio(jobId, text);
```

**Features:**
- Automatic retry logic (3 retries by default)
- Request timeout handling (120 seconds default)
- Base64 encoding for image transmission
- Error handling with meaningful messages

**Environment Variables:**
- `FLASK_BASE_URL` - Flask service URL (default: `http://localhost:5001`)
- `FLASK_TIMEOUT` - Request timeout in milliseconds (default: `120000`)
- `FLASK_RETRIES` - Number of retry attempts (default: `3`)

### 2. Routes Integration (`routes.ts`)

Express routes now call the Flask client instead of using mocks.

#### Text Extraction Route
- **Endpoint:** `POST /api/extract-text`
- **Input:** Multipart form data with image files
- **Process:**
  1. Create job record
  2. Check Flask service health
  3. Convert images to base64
  4. Call Flask API
  5. Update job status
  6. Return extracted texts
- **Error Handling:** Returns 503 if Flask unavailable, 500 for other errors

#### Text Refinement Route
- **Endpoint:** `POST /api/refine-text`
- **Input:** JSON with jobId, extractedTexts, and optional refinementInstructions
- **Process:**
  1. Update job status to "refining"
  2. Call Flask API with all extracted texts
  3. Update job status to "refining_completed"
  4. Return refined text
- **Error Handling:** Returns 500 on failure

#### Audio Generation Route
- **Endpoint:** `POST /api/generate-audio`
- **Input:** JSON with jobId, text, optional voice and rate
- **Process:**
  1. Update job status to "generating"
  2. Call Flask API with text
  3. Decode base64 audio data
  4. Save audio to storage
  5. Update job status to "completed"
  6. Return audio URL
- **Error Handling:** Returns 500 on failure

#### Health Check Endpoints
- **Endpoint:** `GET /api/health` - Returns Express and Flask service status
- **Endpoint:** `GET /api/flask-status` - Returns detailed Flask ML service status

### 3. Mock Flask Server (`services/mock-flask-server.ts`)

For local development and testing without running actual Flask backend.

**Features:**
- Simulates all Flask API endpoints
- Configurable response delays
- Realistic mock data
- Easy to enable/disable for testing

**Usage:**

```typescript
import { startMockFlaskServer, stopMockFlaskServer } from "./services/mock-flask-server";

// Start mock server
await startMockFlaskServer(5001, false); // port, enableDelay

// Run tests...

// Stop mock server
await stopMockFlaskServer();
```

## Data Flow

### 1. Image Upload & Text Extraction

```
Frontend
  ↓ [POST] /api/extract-text (multipart/form-data with images)
Express Route
  ↓ Create job, validate, convert images to base64
Flask Client
  ↓ [POST] /api/extract-text (application/json with base64 images)
Flask Backend
  ↓ Call Ollama with vision model (LFM2-VL-3B)
Ollama
  ↓ Process images, extract text
Flask Backend
  ↓ Return extractedTexts array
Express Route
  ↓ Save to storage, update job status
Frontend
  ↓ Display extracted texts
```

### 2. Text Refinement

```
Frontend
  ↓ [POST] /api/refine-text (application/json with extractedTexts)
Express Route
  ↓ Update job status, validate input
Flask Client
  ↓ [POST] /api/refine-text (application/json with combined texts)
Flask Backend
  ↓ Call Ollama with text model (LFM2-1.2B-Extract)
Ollama
  ↓ Process text, refine and enhance
Flask Backend
  ↓ Return refinedText
Express Route
  ↓ Update job status
Frontend
  ↓ Display refined text
```

### 3. Audio Generation

```
Frontend
  ↓ [POST] /api/generate-audio (application/json with text)
Express Route
  ↓ Update job status, validate input
Flask Client
  ↓ [POST] /api/generate-audio (application/json with text)
Flask Backend
  ↓ Call pyttsx3 TTS (or LFM2-Audio-1.5B in future)
TTS Engine
  ↓ Generate MP3 audio from text
Flask Backend
  ↓ Return base64 audio data
Express Route
  ↓ Decode audio, save to storage, update job status
Frontend
  ↓ Get audio URL, play audio
```

## Error Handling

### Flask Service Unavailable

If Flask is not running:
1. Health check in extract-text route fails
2. Returns HTTP 503 with message
3. Job status is updated to "error"
4. Frontend displays error message to user

### Request Timeout

If Flask request takes longer than timeout:
1. Flask client automatically retries (3 times)
2. Wait time increases with each retry: 1s, 2s, 3s
3. If all retries fail, returns HTTP 500
4. Express route catches error and updates job status

### Invalid Request

If request data is missing or malformed:
1. Express route validates input
2. Returns HTTP 400 with error message
3. No Flask call is made
4. Job status remains unchanged

## Testing

### Run Integration Tests

```bash
npm test -- app/server/routes.test.ts
```

**What Tests Cover:**
- Health check endpoints
- Text extraction with single and multiple images
- Text refinement
- Audio generation
- Job status polling
- Audio download
- Complete end-to-end pipeline
- Error handling and validation

### Test Environment

Tests use the Mock Flask Server by default:
1. Mock server starts before tests
2. Tests run against mock endpoints
3. Mock server stops after tests

To test against real Flask backend:
1. Start Flask server: `python backend/app.py`
2. Modify test configuration to use real Flask URL
3. Run tests

## Development Workflow

### With Mock Flask Server (Recommended for Development)

```bash
# 1. Start Express backend
npm run dev

# 2. Frontend will call Express
# 3. Express will call Mock Flask Server (runs in same process)
# 4. Quick feedback loop, no dependency on Flask
```

### With Real Flask Backend

```bash
# 1. Start Flask backend (in another terminal)
cd backend
python app.py

# 2. Set Flask URL environment variable
export FLASK_BASE_URL=http://localhost:5001

# 3. Start Express backend
npm run dev

# 4. Frontend will call Express
# 5. Express will call real Flask backend
```

## Configuration

### Environment Variables

Create `.env` or `.env.local` in Express backend directory:

```env
# Flask ML Service Configuration
FLASK_BASE_URL=http://localhost:5001
FLASK_TIMEOUT=120000
FLASK_RETRIES=3

# Server Configuration
EXPRESS_PORT=3000

# Node Environment
NODE_ENV=development
```

## Performance Considerations

### Request Timeouts

- Vision extraction: 30-60 seconds per image
- Text refinement: 20-40 seconds
- Audio generation: 30-60 seconds
- Total pipeline: 3-7 minutes for 5 pages

**Flask timeout is set to 120 seconds to accommodate:**
- Ollama model loading
- Sequential image processing
- Network delays

### Retry Logic

- 3 retries by default
- Exponential backoff: 1s, 2s, 3s
- Useful for temporary network issues

### Health Checks

- Performed before each extraction request
- Helps fail fast if Flask is unavailable
- Should be called periodically by frontend

## Troubleshooting

### "Flask ML service is unavailable"

**Solution:**
1. Check if Flask backend is running: `curl http://localhost:5001/api/health`
2. Check Flask URL in environment variables
3. Verify network connectivity: `ping localhost`

### Request timeout errors

**Solution:**
1. Check if Ollama is running and models are loaded
2. Increase `FLASK_TIMEOUT` environment variable
3. Check system resources (CPU, RAM)
4. Review Flask logs for slow processing

### "Extract text error" or "Refine text error"

**Solution:**
1. Check Flask logs for detailed error messages
2. Verify image files are valid (not corrupted)
3. Ensure text is not too long (may exceed token limits)
4. Check Ollama model status: `curl http://localhost:11434/api/tags`

## Next Steps

1. **Test with Real Flask Backend** - Once Flask is set up with actual Ollama
2. **Performance Optimization** - Profile and optimize slow requests
3. **LFM2-Audio Integration** - Replace pyttsx3 with LFM2-Audio-1.5B TTS
4. **Database Integration** - Replace in-memory storage with PostgreSQL
5. **Production Deployment** - Docker containers for both services

## References

- Flask Backend: See `backend/README.md`
- Architecture: See `ARCHITECTURE_LFM2.md`
- PRD: See `audiobook_app_prd.md`
