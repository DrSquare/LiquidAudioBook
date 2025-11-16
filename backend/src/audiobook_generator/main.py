#!/usr/bin/env python3
"""
Audiobook generator that processes book page images using Large Foundation Models.
Extracts text from pages and generates audio using TTS for audiobook creation.
"""

from pathlib import Path
import time

import click
from loguru import logger
from watchdog.observers import Observer

from audiobook_generator.page_file_handler import PageFileHandler
from audiobook_generator.page_processor import PageProcessor
from audiobook_generator.text_to_speech import TTSProcessor


def process_existing_files(directory: str, handler: PageFileHandler):
    """Process any existing image files in the directory."""
    logger.info(f"Processing existing files in {directory}")

    for file_path in Path(directory).rglob("*"):
        if file_path.is_file():
            file_ext = file_path.suffix.lower()
            if file_ext in handler.image_extensions:
                handler.process_page(str(file_path))


@click.command()
@click.option(
    "--dir",
    required=True,
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
    help="Directory to watch for book page images",
)
@click.option(
    "--extractor-model",
    required=True,
    help="LFM model name for data extraction (e.g., LFM2-1.2B-Extract)",
)
@click.option(
    "--image-model",
    required=True,
    help="LFM vision model name for image processing (e.g., LFM2-VL-3B)",
)
@click.option(
    "--process-existing",
    is_flag=True,
    help="Process existing files in the directory on startup",
)
@click.option(
    "--output-dir",
    type=click.Path(file_okay=False, dir_okay=True, path_type=Path),
    default=None,
    help="Output directory for audiobook files (default: same as --dir)",
)
@click.option(
    "--audio-model",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    default=None,
    help="Path to main GGUF audio model file (e.g., lfm2-audio-1.5b-f16.gguf)",
)
@click.option(
    "--audio-mmproj",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    default=None,
    help="Path to mmproj GGUF file",
)
@click.option(
    "--audio-decoder",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    default=None,
    help="Path to audio decoder GGUF file",
)
@click.option(
    "--voice-description",
    default="A clear, neutral narrator voice with excellent quality.",
    help="Natural language description of desired voice characteristics",
)
@click.option(
    "--generate-audio",
    is_flag=True,
    help="Generate audio files from extracted text",
)
@click.option(
    "--combine-audiobook",
    is_flag=True,
    help="Combine individual audio files into a single audiobook",
)
def main(
    dir: Path,
    extractor_model: str,
    image_model: str,
    process_existing: bool,
    output_dir: Path | None,
    audio_model: Path | None,
    audio_mmproj: Path | None,
    audio_decoder: Path | None,
    voice_description: str,
    generate_audio: bool,
    combine_audiobook: bool,
):
    """Audiobook generator using Large Foundation Models.

    This tool watches a directory for new book page images, processes them using
    LFM models to extract text, generates audio, and creates audiobooks.
    """
    # Set output directory
    if output_dir is None:
        output_dir = dir

    # Create output directory if it doesn't exist
    output_dir.mkdir(parents=True, exist_ok=True)

    # CSV file path
    csv_path = str(dir / 'pages.csv')

    # Initialize processor and handler
    processor = PageProcessor(extractor_model, image_model)
    handler = PageFileHandler(processor, csv_path)

    # Process existing files if requested
    if process_existing:
        process_existing_files(str(dir), handler)

    # Generate audio if requested
    if generate_audio or combine_audiobook:
        # Validate all three audio model paths are provided
        if audio_model is None or audio_mmproj is None or audio_decoder is None:
            logger.error(
                "All three audio model files are required when using --generate-audio or --combine-audiobook:\n"
                "  --audio-model (main GGUF model)\n"
                "  --audio-mmproj (mmproj GGUF)\n"
                "  --audio-decoder (audio decoder GGUF)"
            )
            return

        logger.info("Initializing TTS processor...")
        tts = TTSProcessor(
            model_path=str(audio_model),
            mmproj_path=str(audio_mmproj),
            audiodecoder_path=str(audio_decoder),
            voice_description=voice_description
        )

        # Generate audio for all extracted text
        audio_output_dir = output_dir / "audio"
        logger.info(f"Generating audio files to: {audio_output_dir}")
        tts.text_to_speech_batch(csv_path, str(audio_output_dir))

        # Combine into single audiobook if requested
        if combine_audiobook:
            audiobook_path = str(output_dir / "audiobook.wav")
            logger.info(f"Combining audio files into: {audiobook_path}")
            tts.combine_audiobook(csv_path, audiobook_path)
            logger.info("Audiobook creation complete!")

        # If only generating audio (not watching), exit here
        if not process_existing:
            logger.info("Audio generation complete. Exiting...")
            return

    # Set up file watcher (only if we didn't just do a one-time audio generation)
    if process_existing and not (generate_audio or combine_audiobook):
        # User wants to watch for new files after processing existing ones
        observer = Observer()
        observer.schedule(handler, str(dir), recursive=True)

        logger.info("Starting audiobook generator...")
        logger.info(f"Watching directory: {dir}")
        logger.info(f"Image processing model: {image_model}")
        logger.info(f"Extractor model: {extractor_model}")

        observer.start()

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping audiobook generator...")
            observer.stop()

        observer.join()
        logger.info("Audiobook generator stopped.")


if __name__ == "__main__":
    main()
