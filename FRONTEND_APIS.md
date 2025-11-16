# Frontend APIs - Complete Reference

The frontend (React app) communicates with the backend via these REST APIs.

---

## 1. POST /api/extract-text - Extract text from images

**Purpose:** Upload images and extract text using vision model

**Request:**
```
Method: POST
Content-Type: multipart/form-data
Body:
  - Field "images": Image files (up to 50, max 5MB each)
  - Field "jobId": (optional) Job tracking ID
```

**Example:**
```typescript
const formData = new FormData();
formData.append('images', imageFile1);
formData.append('images', imageFile2);
formData.append('jobId', 'optional-job-id');

const response = await fetch('/api/extract-text', {
  method: 'POST',
  body: formData
});
```

**Success Response (200):**
```json
{
  "jobId": "5821f405-7d9c-454a-a41f-020a95706e21",
  "status": "completed",
  "extractedTexts": [
    {
      "pageNumber": 1,
      "text": "Chapter 1...",
      "processingTimeMs": 45000
    },
    {
      "pageNumber": 2,
      "text": "Chapter 2...",
      "processingTimeMs": 42000
    }
  ]
}
```

**Error Response (400/500):**
```json
{
  "jobId": "...",
  "message": "Text extraction failed",
  "error": "Error details..."
}
```

---

## 2. POST /api/refine-text - Refine extracted text

**Purpose:** Clean and improve the extracted text

**Request:**
```json
{
  "jobId": "5821f405-7d9c-454a-a41f-020a95706e21",
  "extractedTexts": [
    "Chapter 1...",
    "Chapter 2..."
  ],
  "refinementInstructions": "Optional: Improve grammar and formatting"
}
```

**Success Response (200):**
```json
{
  "jobId": "5821f405-7d9c-454a-a41f-020a95706e21",
  "status": "completed",
  "refinedText": "REFINED DOCUMENT\n\n[Page 1]\nChapter 1...\n\n---\n\n[Page 2]\nChapter 2...",
  "processingTimeMs": 30000
}
```

**Error Response (400/500):**
```json
{
  "jobId": "...",
  "message": "Text refinement failed",
  "error": "Error details..."
}
```

---

## 3. POST /api/generate-audio - Generate audio from text

**Purpose:** Convert refined text to speech (audio)

**Request:**
```json
{
  "jobId": "5821f405-7d9c-454a-a41f-020a95706e21",
  "text": "REFINED DOCUMENT\n\n[Page 1]\nChapter 1...",
  "voice": "default",
  "rate": 150
}
```

**Success Response (200):**
```json
{
  "jobId": "5821f405-7d9c-454a-a41f-020a95706e21",
  "status": "completed",
  "audioUrl": "http://localhost:5000/api/audio/5821f405-7d9c-454a-a41f-020a95706e21",
  "durationMs": 52400,
  "processingTimeMs": 45000
}
```

**Error Response (400/500):**
```json
{
  "jobId": "...",
  "message": "Audio generation failed",
  "error": "Error details..."
}
```

---

## 4. GET /api/jobs/:jobId - Get job status

**Purpose:** Poll for processing progress

**Request:**
```
Method: GET
URL: /api/jobs/5821f405-7d9c-454a-a41f-020a95706e21
```

**Response:**
```json
{
  "jobId": "5821f405-7d9c-454a-a41f-020a95706e21",
  "stage": 1,
  "currentItem": 2,
  "totalItems": 2,
  "status": "refining_completed"
}
```

**Stage Mapping:**
- `stage: 0` - Extracting text
- `stage: 1` - Refining text
- `stage: 2` - Generating audio (completed)

---

## 5. GET /api/audio/:jobId - Download audio file

**Purpose:** Download the generated audiobook

**Request:**
```
Method: GET
URL: /api/audio/5821f405-7d9c-454a-a41f-020a95706e21
```

**Response:**
- Content-Type: `audio/mpeg`
- File download as: `audiobook-{jobId}.mp3`

---

## 6. GET /api/health - System health check

**Purpose:** Check if all services are running

**Request:**
```
Method: GET
URL: /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T18:00:00.000Z",
  "services": {
    "express": "ok",
    "flask": "connected"
  }
}
```

---

## 7. GET /api/flask-status - Flask service status

**Purpose:** Check Flask ML service and model status

**Request:**
```
Method: GET
URL: /api/flask-status
```

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-11-16T18:00:00.000Z",
  "ollama": {
    "isRunning": true,
    "models": {
      "vision": {
        "name": "LFM2-VL-3B",
        "loaded": true
      },
      "text": {
        "name": "LFM2-1.2B-Extract",
        "loaded": true
      }
    }
  }
}
```

---

## Complete Pipeline Flow

```typescript
// Step 1: Extract text from images
const extractRes = await fetch('/api/extract-text', {
  method: 'POST',
  body: formData  // FormData with images
});
const { jobId, extractedTexts } = await extractRes.json();

// Step 2: Refine the extracted text
const refineRes = await fetch('/api/refine-text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId,
    extractedTexts: extractedTexts.map(t => t.text)
  })
});
const { refinedText } = await refineRes.json();

// Step 3: Generate audio
const audioRes = await fetch('/api/generate-audio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jobId,
    text: refinedText
  })
});
const { audioUrl } = await audioRes.json();

// Step 4: Download audio
const audioLink = document.createElement('a');
audioLink.href = audioUrl;
audioLink.download = 'audiobook.mp3';
audioLink.click();
```

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad Request (missing/invalid parameters) |
| 404 | Not Found (jobId doesn't exist) |
| 503 | Service Unavailable (Flask/Ollama down) |
| 500 | Server Error (processing failed) |

---

## Request/Response Summary Table

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| /api/extract-text | POST | Extract text from images | Images (multipart) | extractedTexts array |
| /api/refine-text | POST | Refine extracted text | extractedTexts array | refinedText string |
| /api/generate-audio | POST | Generate audio from text | refinedText string | audioUrl + duration |
| /api/jobs/:jobId | GET | Poll job progress | jobId param | stage + status |
| /api/audio/:jobId | GET | Download audio file | jobId param | audio/mpeg file |
| /api/health | GET | System health check | (none) | service status |
| /api/flask-status | GET | ML service status | (none) | model status |

---

## Usage Best Practices

### 1. Always use jobId for tracking
```typescript
const { jobId } = await extract();
// Use this jobId for all subsequent requests
```

### 2. Implement polling for long operations
```typescript
async function waitForCompletion(jobId) {
  let isComplete = false;
  while (!isComplete) {
    const { status } = await fetch(`/api/jobs/${jobId}`).then(r => r.json());
    isComplete = status === 'completed';
    if (!isComplete) await new Promise(r => setTimeout(r, 1000));
  }
}
```

### 3. Handle errors gracefully
```typescript
try {
  const response = await fetch('/api/extract-text', { method: 'POST', body: formData });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  return await response.json();
} catch (error) {
  console.error('API Error:', error.message);
  // Show user-friendly error message
}
```

### 4. Validate before sending
```typescript
// Validate image count
if (images.length > 50) throw new Error('Max 50 images allowed');

// Validate file sizes
images.forEach(img => {
  if (img.size > 5 * 1024 * 1024) throw new Error('Max 5MB per image');
});
```

---

**Last Updated:** November 16, 2025
**Status:** Complete and Tested
