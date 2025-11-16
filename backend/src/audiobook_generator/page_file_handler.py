#!/usr/bin/env python3
"""
File handler for processing book page images in a watched directory.
"""

import csv
import os
from pathlib import Path
import time
from typing import Any

from loguru import logger
from watchdog.events import FileSystemEventHandler

from audiobook_generator.page_processor import PageData


class PageFileHandler(FileSystemEventHandler):
    """Handles file system events for new book page images."""

    def __init__(self, processor, output_file: str):
        self.processor = processor
        self.output_file = output_file
        self.processed_files = set()
        logger.info(f"Output will be saved to: {self.output_file}")

        # Supported image extensions
        self.image_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".bmp",
            ".tiff",
            ".webp",
        }

    def on_created(self, event):
        """Handle new file creation events."""
        if event.is_directory:
            return

        file_path = str(event.src_path)
        file_ext = Path(file_path).suffix.lower()

        # Check if it's an image file and hasn't been processed yet
        if file_ext in self.image_extensions and file_path not in self.processed_files:
            logger.info(f"New image detected: {file_path}")
            self.process_page(file_path)

    def process_page(self, image_path: str):
        """Process a single book page image."""
        try:
            self.processed_files.add(image_path)

            logger.info(f"Processing page: {image_path}")
            page_data_obj: PageData = self.processor.process(image_path)

            # transform to dict
            page_data = page_data_obj.model_dump()

            # Add metadata
            page_data.update(
                {
                    "file_path": image_path,
                    "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "audio_path": "",  # Will be populated when audio is generated
                }
            )
            logger.info(f"Structured data extracted: {page_data}")

            # Append to CSV
            self.append_to_csv(page_data)

            logger.info(
                f"Successfully processed {image_path}: Page {page_data['page_number']} - {page_data['word_count']} words"
            )

        except Exception as e:
            logger.error(f"Error processing page {image_path}: {e}")

    def append_to_csv(self, data: dict[str, Any]):
        """Append page data to CSV file."""
        try:
            # Define CSV columns
            logger.info(f"Appending data to CSV: {self.output_file}")
            columns = ["page_number", "text", "word_count", "file_path", "processed_at", "audio_path"]

            # Check if file exists
            file_exists = os.path.exists(self.output_file)
            logger.debug(f"File exists: {file_exists}")

            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.output_file), exist_ok=True)

            # Write to CSV
            with open(self.output_file, "a", newline="", encoding="utf-8") as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=columns)

                # Write header if file is new
                if not file_exists:
                    writer.writeheader()

                writer.writerow({col: data.get(col, "") for col in columns})

            logger.info("Data appended to CSV successfully.")
        except Exception as e:
            logger.error(f"Error writing to CSV {self.output_file}: {e}")
