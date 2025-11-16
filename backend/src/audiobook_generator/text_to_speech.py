"""Text-to-Speech module using LFM2-Audio-1.5B-GGUF via llama-lfm2-audio.

This module handles converting extracted text to audio using the Liquid AI
LFM2-Audio-1.5B-GGUF model through the llama-lfm2-audio binary.
"""

import subprocess
from pathlib import Path

import pandas as pd


class TTSProcessor:
    """Text-to-Speech processor using LFM2-Audio-1.5B-GGUF model.

    This class handles audio generation from text using the llama-lfm2-audio binary,
    which provides fast inference for the quantized GGUF model.
    """

    def __init__(
        self,
        model_path: str,
        mmproj_path: str,
        audiodecoder_path: str,
        voice_description: str = "A clear, neutral narrator voice with excellent quality.",
        binary_path: str = "./llama-lfm2-audio",
    ):
        """Initialize TTS processor with LFM2-Audio-1.5B-GGUF model.

        Args:
            model_path: Path to the main GGUF model file (e.g., "lfm2-audio-1.5b-f16.gguf").
            mmproj_path: Path to the mmproj GGUF file.
            audiodecoder_path: Path to the audio decoder GGUF file.
            voice_description: Natural language description of desired voice characteristics.
            binary_path: Path to llama-lfm2-audio binary (default: "llama-lfm2-audio" in PATH).
        """
        self.model_path = model_path
        self.mmproj_path = mmproj_path
        self.audiodecoder_path = audiodecoder_path
        self.voice_description = voice_description
        self.binary_path = binary_path

        # Verify binary exists
        try:
            result = subprocess.run(
                [self.binary_path, "--version"],
                capture_output=True,
                timeout=5,
            )
            # Try to decode output, handle binary data gracefully
            try:
                version_info = result.stdout.decode('utf-8', errors='replace').strip()
                print(f"Using llama-lfm2-audio: {version_info if result.returncode == 0 and version_info else 'found'}")
            except:
                print(f"Using llama-lfm2-audio: found")
        except FileNotFoundError:
            raise FileNotFoundError(
                f"llama-lfm2-audio not found at '{self.binary_path}'. "
                "Please install it from https://huggingface.co/LiquidAI/LFM2-Audio-1.5B-GGUF"
            )

        print(f"TTS processor initialized with model: {self.model_path}")

    def generate_audio(
        self,
        text: str,
        output_path: str,
    ) -> str:
        """Generate audio from text using llama-lfm2-audio binary.

        Args:
            text: Text to convert to speech.
            output_path: Path where the audio file will be saved (WAV format).

        Returns:
            Path to the generated audio file.
        """
        # Build command following the documented pattern:
        # bin/llama-lfm2-audio -m [model.gguf] --mmproj [mmproj.gguf] -mv [audiodecoder.gguf]
        # -sys "Perform TTS." -p "[text input]" --output [output.wav]

        # Format system prompt correctly (must be on separate lines)
        system_prompt = f"Perform TTS."

        cmd = [
            self.binary_path,
            "-m", self.model_path,
            "--mmproj", self.mmproj_path,
            "-mv", self.audiodecoder_path,
            "-sys", system_prompt,
            "-p", text,
            "--output", output_path,
        ]

        try:
            # Run the binary (don't use text=True as output may contain binary data)
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=300,  # 5 minute timeout
            )

            if result.returncode != 0:
                # Try to decode stderr, but handle binary data gracefully
                try:
                    error_msg = result.stderr.decode('utf-8', errors='replace')
                    print(f"Error running llama-lfm2-audio: {error_msg}")
                except:
                    print(f"Error running llama-lfm2-audio (return code: {result.returncode})")
                return ""

            # Check if output file was created
            if Path(output_path).exists():
                return output_path
            else:
                print(f"Warning: Audio file not created: {output_path}")
                return ""

        except subprocess.TimeoutExpired:
            print(f"Timeout generating audio for text: {text[:50]}...")
            return ""
        except Exception as e:
            print(f"Error generating audio: {e}")
            return ""

    def text_to_speech_batch(
        self,
        csv_path: str,
        output_dir: str,
    ) -> None:
        """Process entire CSV and generate audio for each row.

        Reads the CSV file containing extracted text, generates audio for each page,
        and updates the CSV with audio file paths.

        Args:
            csv_path: Path to the CSV file with extracted text.
            output_dir: Directory where audio files will be saved.
        """
        df = pd.read_csv(csv_path)
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        print(f"\nGenerating audio for {len(df)} pages...")

        for idx, row in df.iterrows():
            page_num = row["page_number"]
            text = row["text"]

            # Skip if no text
            if pd.isna(text) or not text.strip():
                print(f"Skipping page {page_num} (no text)")
                continue

            # Generate audio file name
            audio_filename = f"page_{page_num:03d}.wav"
            audio_path = output_dir / audio_filename

            print(f"Generating audio for page {page_num}... ", end="", flush=True)

            try:
                # Generate audio
                result_path = self.generate_audio(
                    text=text,
                    output_path=str(audio_path),
                )

                if result_path:
                    # Update CSV with audio path
                    df.at[idx, "audio_path"] = str(audio_path)
                    print("✓")
                else:
                    print("✗ (no audio generated)")

            except Exception as e:
                print(f"✗ (error: {e})")
                continue

        # Save updated CSV
        df.to_csv(csv_path, index=False)
        print(f"\nAudio generation complete! Updated CSV: {csv_path}")

    def combine_audiobook(
        self, csv_path: str, output_path: str, silence_duration: float = 1.0
    ) -> str:
        """Combine individual audio files into a single audiobook file.

        Args:
            csv_path: Path to the CSV file with audio_path column.
            output_path: Path for the combined audiobook file.
            silence_duration: Duration of silence (in seconds) to insert between pages.

        Returns:
            Path to the combined audiobook file.
        """
        try:
            import torch
            import soundfile as sf
        except ImportError:
            raise ImportError(
                "soundfile and torch are required for combining audio files. "
                "Install with: pip install soundfile torch"
            )

        df = pd.read_csv(csv_path)

        # Filter rows with valid audio paths
        audio_rows = df[df["audio_path"].notna()].sort_values("page_number")

        if len(audio_rows) == 0:
            raise ValueError("No audio files found in CSV")

        print(f"\nCombining {len(audio_rows)} audio files into audiobook...")

        # Load all audio files
        waveforms = []
        sample_rate = 24_000  # LFM2-Audio-1.5B outputs at 24kHz

        for idx, row in audio_rows.iterrows():
            audio_path = row["audio_path"]
            if not Path(audio_path).exists():
                print(f"Warning: Audio file not found: {audio_path}")
                continue

            # Load audio file with soundfile
            audio_data, sr = sf.read(audio_path)

            # Convert to torch tensor and ensure correct shape (channels, samples)
            waveform = torch.from_numpy(audio_data.T).float()
            if waveform.dim() == 1:
                waveform = waveform.unsqueeze(0)  # Add channel dimension if mono

            # Resample if necessary
            if sr != sample_rate:
                import torchaudio.transforms
                resampler = torchaudio.transforms.Resample(sr, sample_rate)
                waveform = resampler(waveform)

            waveforms.append(waveform)

            # Add silence between pages
            if idx < len(audio_rows) - 1:  # Don't add silence after last page
                silence_samples = int(silence_duration * sample_rate)
                silence = torch.zeros(waveform.shape[0], silence_samples)
                waveforms.append(silence)

        # Concatenate all waveforms
        combined_waveform = torch.cat(waveforms, dim=1)

        # Save combined audiobook using soundfile
        # Convert back to numpy for soundfile (samples, channels)
        audio_numpy = combined_waveform.T.numpy()
        sf.write(output_path, audio_numpy, sample_rate)

        duration_seconds = combined_waveform.shape[1] / sample_rate
        duration_minutes = duration_seconds / 60

        print(f"Audiobook created: {output_path}")
        print(f"Duration: {duration_minutes:.2f} minutes ({duration_seconds:.1f} seconds)")

        return output_path
