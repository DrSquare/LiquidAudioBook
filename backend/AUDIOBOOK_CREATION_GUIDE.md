# Audiobook Creation Guide

Complete step-by-step guide for creating an audiobook from book page images using the LFM2-based audiobook generator.

## Prerequisites

### Required Software
1. **Python 3.12+** installed
2. **UV package manager** - Install with: `curl -LsSf https://astral.sh/uv/install.sh | sh`
3. **Ollama** - Download from https://ollama.ai
4. **llama-lfm2-audio binary** - For TTS generation

### Required Models

#### 1. Vision and Text Extraction Models (via Ollama)
```bash
# Pull the vision model for image-to-text extraction
ollama pull hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16

# Pull the extraction model for structured data parsing
ollama pull hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16
```

#### 2. Audio Generation Models (GGUF files)
Download three GGUF files from [LFM2-Audio-1.5B-GGUF](https://huggingface.co/LiquidAI/LFM2-Audio-1.5B-GGUF):

1. **Main model**: `lfm2-audio-1.5b-f16.gguf` (~3GB)
2. **MMProj**: `mmproj-model-f16.gguf` (~1GB)
3. **Audio decoder**: `audiodecoder-model-f16.gguf` (~100MB)

Place these files in your project directory or note their paths.

#### 3. Install llama-lfm2-audio Binary
```bash
# Clone and build the binary (follow instructions at the model page)
# Or download pre-built binary and place in project directory
# The binary should be accessible as './llama-lfm2-audio'
```

### Install Project Dependencies
```bash
# Navigate to the project directory
cd /path/to/invoice-parser

# Install dependencies using uv
uv sync
```

## Complete Workflow

### Step 1: Prepare Your Book Pages

Organize your book page images in a directory:
```bash
# Create a directory for your book
mkdir -p books/my-book

# Copy your page images to this directory
# Images should be named sequentially (e.g., page-01.jpg, page-02.jpg, etc.)
cp /path/to/pages/*.jpg books/my-book/
```

**Supported image formats**: JPG, JPEG, PNG

### Step 2: Extract Text from Pages (Phase 1)

Run the audiobook generator to process images and extract text:

```bash
uv run python -m audiobook_generator.main \
  --dir books/my-book \
  --extractor-model "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16" \
  --image-model "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16" \
  --process-existing
```

**What this does**:
- Scans `books/my-book/` for image files
- Uses LFM2-VL-3B to extract text from each image
- Uses LFM2-1.2B-Extract to structure the data
- Creates `books/my-book/pages.csv` with extracted text

**Processing time**: ~2-3 minutes per page

**Output CSV format**:
```csv
page_number,text,word_count,file_path,processed_at,audio_path
1,"Alice was beginning to get very tired...",15,books/my-book/page-01.jpg,2025-11-15 16:00:00,
2,"So she was considering in her own mind...",20,books/my-book/page-02.jpg,2025-11-15 16:01:00,
```

**Tips**:
- You can stop the process anytime with Ctrl+C
- The CSV is saved incrementally, so processed pages are preserved
- To process only specific pages, move them to a separate directory

### Step 3: Generate Audio from Text (Phase 2a)

Generate individual audio files for each page:

```bash
uv run python -m audiobook_generator.main \
  --dir books/my-book \
  --extractor-model "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16" \
  --image-model "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16" \
  --audio-model lfm2-audio-1.5b-f16.gguf \
  --audio-mmproj mmproj-model-f16.gguf \
  --audio-decoder audiodecoder-model-f16.gguf \
  --generate-audio
```

**What this does**:
- Reads text from `books/my-book/pages.csv`
- Generates WAV audio file for each page using LFM2-Audio-1.5B
- Saves audio files to `books/my-book/audio/`
- Updates CSV with audio file paths

**Output**:
```
books/my-book/audio/page_001.wav
books/my-book/audio/page_002.wav
books/my-book/audio/page_003.wav
...
```

**Audio specifications**:
- Format: WAV
- Sample rate: 24kHz
- Channels: Mono or stereo (model-dependent)

### Step 4: Combine into Complete Audiobook (Phase 2b)

Merge all individual audio files into a single audiobook:

```bash
uv run python -m audiobook_generator.main \
  --dir books/my-book \
  --extractor-model "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16" \
  --image-model "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16" \
  --audio-model lfm2-audio-1.5b-f16.gguf \
  --audio-mmproj mmproj-model-f16.gguf \
  --audio-decoder audiodecoder-model-f16.gguf \
  --generate-audio \
  --combine-audiobook
```

**What this does**:
- Generates audio for any pages without audio (same as Step 3)
- Combines all audio files in page order
- Inserts 1 second of silence between pages
- Creates final audiobook: `books/my-book/audiobook.wav`

**Output**:
```
books/my-book/audiobook.wav
```

The console will show the total duration:
```
Audiobook created: books/my-book/audiobook.wav
Duration: 45.23 minutes (2714.0 seconds)
```

## Quick Start: All-in-One Command

To run the complete pipeline (text extraction + audio generation + combination) in one command:

```bash
uv run python -m audiobook_generator.main \
  --dir books/my-book \
  --extractor-model "hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16" \
  --image-model "hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16" \
  --audio-model lfm2-audio-1.5b-f16.gguf \
  --audio-mmproj mmproj-model-f16.gguf \
  --audio-decoder audiodecoder-model-f16.gguf \
  --process-existing \
  --generate-audio \
  --combine-audiobook
```

**Note**: This will take a long time for books with many pages!

## Advanced Options

### Custom Voice Description
While the GGUF model doesn't fully support custom voices, you can specify a voice description:
```bash
--voice-description "A clear, neutral narrator voice with excellent quality."
```

### Custom Audio Output Directory
```bash
--output-dir /path/to/output
```

### Adjust Silence Between Pages
Edit the `silence_duration` parameter in the code (default: 1.0 second):
```python
tts.combine_audiobook(csv_path, audiobook_path, silence_duration=2.0)
```

## Programmatic Usage

### Python Script Example

```python
from pathlib import Path
from audiobook_generator.page_processor import PageProcessor
from audiobook_generator.page_file_handler import PageFileHandler
from audiobook_generator.text_to_speech import TTSProcessor

# Step 1: Extract text from images
processor = PageProcessor(
    extractor_model="hf.co/LiquidAI/LFM2-1.2B-Extract-GGUF:F16",
    image_model="hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16"
)
handler = PageFileHandler(processor, "books/my-book/pages.csv")

# Process all images in directory
for image_path in Path("books/my-book").glob("*.jpg"):
    handler.process_page(str(image_path))

# Step 2: Generate audio
tts = TTSProcessor(
    model_path="lfm2-audio-1.5b-f16.gguf",
    mmproj_path="mmproj-model-f16.gguf",
    audiodecoder_path="audiodecoder-model-f16.gguf"
)

# Generate audio for all pages
tts.text_to_speech_batch(
    csv_path="books/my-book/pages.csv",
    output_dir="books/my-book/audio"
)

# Step 3: Combine into audiobook
tts.combine_audiobook(
    csv_path="books/my-book/pages.csv",
    output_path="books/my-book/audiobook.wav",
    silence_duration=1.0
)
```

## Troubleshooting

### Issue: "llama-lfm2-audio not found"
**Solution**: Make sure the binary is in your PATH or specify the full path:
```python
TTSProcessor(
    model_path="...",
    binary_path="/full/path/to/llama-lfm2-audio"
)
```

### Issue: "Model not found" errors
**Solution**: Ensure Ollama is running and models are pulled:
```bash
ollama list  # Check available models
ollama pull hf.co/LiquidAI/LFM2-VL-3B-GGUF:F16
```

### Issue: Text extraction taking too long
**Solution**: Process a subset of pages first:
```bash
# Create a test directory with just 2-3 pages
mkdir books/my-book-test
cp books/my-book/page-01.jpg books/my-book/page-02.jpg books/my-book-test/
# Run on the test directory
```

### Issue: Audio generation fails with UTF-8 errors
**Solution**: This is handled automatically in the code. If you see errors, ensure you're using the latest version of the codebase.

### Issue: Out of memory during audio combination
**Solution**: Process pages in batches or increase system memory. The current implementation loads all audio into memory.

## File Structure After Completion

```
books/my-book/
├── page-01.jpg                  # Original images
├── page-02.jpg
├── page-03.jpg
├── ...
├── pages.csv                    # Extracted text data
├── audio/                       # Individual page audio files
│   ├── page_001.wav
│   ├── page_002.wav
│   ├── page_003.wav
│   └── ...
└── audiobook.wav               # Final combined audiobook
```

## Performance Notes

- **Text extraction**: ~2-3 minutes per page (depends on hardware and model size)
- **Audio generation**: ~30-60 seconds per page (depends on text length)
- **Audio combination**: Nearly instant (just concatenation)
- **Recommended**: For long books (100+ pages), run overnight or use a subset for testing first

## Next Steps

Once you have your audiobook:
1. **Convert to MP3**: Use `ffmpeg` to compress and convert to MP3
   ```bash
   ffmpeg -i books/my-book/audiobook.wav -codec:a libmp3lame -qscale:a 2 books/my-book/audiobook.mp3
   ```

2. **Add metadata**: Use tools like `eyeD3` or `mp3tag` to add book title, author, cover art

3. **Split into chapters**: If you tracked chapters in your CSV, you can split the audiobook into chapter files

## Summary

The complete workflow:
1. **Prepare**: Get book page images
2. **Extract**: Run with `--process-existing` to extract text
3. **Generate**: Add `--generate-audio` to create WAV files
4. **Combine**: Add `--combine-audiobook` to merge into one file
5. **Enjoy**: Listen to your custom audiobook!

For questions or issues, check the project documentation or create an issue on GitHub.
