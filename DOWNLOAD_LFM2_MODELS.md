# LFM2 Model Download Guide

This guide explains how to download and configure the Liquid AI LFM2 models for the LiquidAudio Reader MVP.

## Model Overview

| Model | Purpose | Size | Format | Status |
|-------|---------|------|--------|--------|
| LFM2-VL-3B | Vision-Language (text extraction from images) | ~3.5GB | GGUF F16 | ✅ Configured |
| LFM2-1.2B-Extract | Text Extraction/Refinement | ~1.5GB | GGUF F16 | ✅ Configured |
| LFM2-Audio-1.5B | Text-to-Speech (TTS) | ~2GB (3 components) | GGUF F16 | ⏳ **To Download** |

## Prerequisites

### 1. Ollama Installation
- **Download:** https://ollama.com/download
- **Windows:** `ollama-windows-amd64.exe`
- **Verify:** `ollama --version`
- **Start:** `ollama serve`

### 2. Hugging Face Access
- Create account: https://huggingface.co/join
- Accept model licenses:
  - LFM2-VL-3B: https://huggingface.co/LiquidAI/LFM2-VL-3B-GGUF
  - LFM2-1.2B-Extract: https://huggingface.co/LiquidAI/LFM2-1.2B-Extract-GGUF
  - LFM2-Audio-1.5B: https://huggingface.co/LiquidAI/LFM2-Audio-1.5B-GGUF

### 3. Disk Space
- Total required: **~7GB** (3.5GB + 1.5GB + 2GB)
- Recommended: **~10GB** for overhead and caching

## Option 1: Download via Ollama (Recommended)

### Step 1: Start Ollama Server
```bash
ollama serve
# Server starts on http://localhost:11434
```

### Step 2: Pull Models
In a new terminal:

```bash
# Vision-Language Model (3.5GB)
ollama pull hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16

# Text Extraction Model (1.5GB)
ollama pull hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16

# Audio/TTS Model (2GB)
ollama pull hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF:F16
```

### Step 3: Verify Models
```bash
ollama list
```

Expected output:
```
NAME                                      ID              SIZE     MODIFIED
hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16      abc123def456    3.5GB   2 minutes ago
hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF   xyz789uvw123    1.5GB   1 minute ago
hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF     pqr456stu789    2.0GB   Just now
```

### Step 4: Test Models
```bash
# Test vision model
curl http://localhost:11434/api/generate \
  -d '{
    "model": "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16",
    "prompt": "What is in this image?",
    "stream": false
  }'

# Test text model
curl http://localhost:11434/api/generate \
  -d '{
    "model": "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
    "prompt": "Extract key points from this text.",
    "stream": false
  }'

# Test audio model
curl http://localhost:11434/api/generate \
  -d '{
    "model": "hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF:F16",
    "prompt": "Convert this text to speech.",
    "stream": false
  }'
```

## Option 2: Manual Download from Hugging Face

### Step 1: Install Git LFS
```bash
# Windows (using choco)
choco install git-lfs

# Or download from: https://git-lfs.github.com/
git lfs install
```

### Step 2: Clone Model Repository
```bash
# Create models directory
mkdir C:\Models
cd C:\Models

# Vision Model
git clone https://huggingface.co/LiquidAI/LFM2-VL-3B-GGUF
cd LFM2-VL-3B-GGUF
git lfs pull
cd ..

# Text Extraction Model
git clone https://huggingface.co/LiquidAI/LFM2-1.2B-Extract-GGUF
cd LFM2-1.2B-Extract-GGUF
git lfs pull
cd ..

# Audio Model
git clone https://huggingface.co/LiquidAI/LFM2-Audio-1.5B-GGUF
cd LFM2-Audio-1.5B-GGUF
git lfs pull
cd ..
```

### Step 3: Update Configuration
Edit `backend/.env`:
```bash
# Vision Model Path
IMAGE_MODEL_PATH=C:\Models\LFM2-VL-3B-GGUF\model.gguf

# Text Extraction Model Path
EXTRACTOR_MODEL_PATH=C:\Models\LFM2-1.2B-Extract-GGUF\model.gguf

# Audio Model Paths
AUDIO_MODEL_PATH=C:\Models\LFM2-Audio-1.5B-GGUF\model.gguf
AUDIO_MMPROJ_PATH=C:\Models\LFM2-Audio-1.5B-GGUF\mmproj.gguf
AUDIO_DECODER_PATH=C:\Models\LFM2-Audio-1.5B-GGUF\decoder.gguf
```

## Step 3: Configure LiquidAudio Backend

### Edit `backend/.env`

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=false
FLASK_PORT=5001

# Liquid AI LFM2 Models Configuration
# Vision/Image Model - LLaVA-based vision model for image text extraction
IMAGE_MODEL_PATH=hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16
IMAGE_MODEL_NAME=LFM2-VL-3B

# Text Extractor Model - For text refinement and extraction
EXTRACTOR_MODEL_PATH=hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16
EXTRACTOR_MODEL_NAME=LFM2-1.2B-Extract

# Audio Models - For TTS audio generation
AUDIO_MODEL_PATH=hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF:F16
AUDIO_MMPROJ_PATH=hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF/mmproj:F16
AUDIO_DECODER_PATH=hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF/decoder:F16

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=120000

# TTS Configuration (fallback)
TTS_ENGINE=pyttsx3
TTS_RATE=150
TTS_VOICE=default
```

## Step 4: Start Flask Backend

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

Expected output:
```
 * Serving Flask app 'app'
 * Debug mode: off
WARNING: This is a development server. Do not use it in production.
 * Running on http://127.0.0.1:5001
```

## Step 5: Verify Installation

### Check Ollama Models
```bash
curl http://localhost:11434/api/tags
```

### Check Flask Status
```bash
curl http://localhost:3000/api/flask-status
```

Expected response:
```json
{
  "status": "ready",
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

## Troubleshooting

### Issue: "Model not found"

**Solution:**
```bash
# Verify models are downloaded
ollama list

# If missing, pull again
ollama pull hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16
ollama pull hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16
ollama pull hf.co/LiquidAI/LFM2-Audio-1.5B-GGUF:F16
```

### Issue: "Connection refused" to Ollama

**Solution:**
```bash
# Make sure Ollama is running
ollama serve

# Check if running on correct port
curl http://localhost:11434/api/health
```

### Issue: "Out of memory"

**Solution:**
1. Check available RAM: `wmic OS get TotalVisibleMemorySize`
2. Close other applications
3. Use smaller models or enable GPU acceleration
4. Increase swap/virtual memory

### Issue: "Slow inference"

**Solution:**
1. Ensure models are fully loaded (first request is slower)
2. Check system CPU usage
3. Verify no other heavy processes running
4. Consider GPU acceleration with CUDA

## Performance Optimization

### 1. GPU Acceleration (NVIDIA)

```bash
# Install CUDA support
ollama pull hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16
# Ollama will auto-detect and use GPU if available
```

### 2. Model Caching

Models are cached in:
- **Windows:** `C:\Users\<username>\.ollama\models`
- **macOS:** `~/.ollama/models`
- **Linux:** `~/.ollama/models`

### 3. Optimize Ollama Parameters

Edit Ollama config or set environment variables:
```bash
# Increase context window
OLLAMA_NUM_PARALLEL=4
OLLAMA_NUM_THREAD=8

# Run Ollama with optimizations
OLLAMA_NUM_PARALLEL=4 OLLAMA_NUM_THREAD=8 ollama serve
```

## Expected Download Times

| Model | Size | Speed | Time |
|-------|------|-------|------|
| LFM2-VL-3B | 3.5GB | 50 Mbps | ~11 min |
| LFM2-1.2B-Extract | 1.5GB | 50 Mbps | ~5 min |
| LFM2-Audio-1.5B | 2.0GB | 50 Mbps | ~7 min |
| **Total** | **7GB** | **50 Mbps** | **~23 min** |

## Complete Setup Checklist

- [ ] Ollama installed and running
- [ ] LFM2-VL-3B model downloaded (3.5GB)
- [ ] LFM2-1.2B-Extract model downloaded (1.5GB)
- [ ] LFM2-Audio-1.5B model downloaded (2.0GB)
- [ ] Models verified with `ollama list`
- [ ] Ollama health check passing
- [ ] Flask backend started
- [ ] Flask status endpoint responding
- [ ] Express backend running on port 3000
- [ ] React frontend accessible

## Next Steps

Once models are downloaded:

1. **Start the full stack:**
   ```bash
   # Terminal 1: Ollama
   ollama serve

   # Terminal 2: Flask
   cd backend && python app.py

   # Terminal 3: Express
   npm run dev

   # Terminal 4: Frontend
   # Browser: http://localhost:5000
   ```

2. **Test the pipeline:**
   - Upload test images
   - Monitor processing in Flask logs
   - Check Ollama load times
   - Verify audio generation

3. **Performance tuning:**
   - Benchmark individual operations
   - Optimize Ollama parameters
   - Consider GPU acceleration
   - Profile bottlenecks

## Support

For issues with:
- **Ollama:** https://github.com/jmorganca/ollama/issues
- **Hugging Face Models:** https://huggingface.co/LiquidAI
- **LiquidAudio:** See backend/README.md

## References

- Ollama: https://ollama.com
- Hugging Face: https://huggingface.co
- LFM2 Models: https://huggingface.co/LiquidAI
- Git LFS: https://git-lfs.github.com/

---

**Total Setup Time:** ~30-40 minutes (including downloads)
**Disk Space Required:** ~10GB
**Recommended RAM:** 16GB minimum
**Recommended:** NVIDIA GPU for 2-3x faster inference
