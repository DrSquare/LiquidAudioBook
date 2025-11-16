"""
Page processor module for handling image processing and text extraction.
"""

from loguru import logger
import ollama
from pydantic import BaseModel


class PageText(BaseModel):
    text_content: str


class PageData(BaseModel):
    page_number: int
    text: str
    word_count: int


class PageProcessor:
    """Handles book page image processing and text extraction."""

    def __init__(self, extractor_model: str, image_process_model: str):
        self.extractor_model = extractor_model
        self.image_process_model = image_process_model

        self._download_model(model=extractor_model)
        self._download_model(model=image_process_model)

    def _download_model(self, model: str):
        """Ensure the specified model is downloaded locally."""
        try:
            logger.info(f"Pulling model: {model}")
            ollama.pull(model=model)
            logger.info(f"Model {model} is ready.")
        except Exception as e:
            logger.error(f"Error pulling model {model}: {e}")

    def process(self, image_path: str) -> PageData | None:
        """Process a book page image to extract structured data."""
        page_text = self.image2text(image_path)
        if not page_text:
            logger.warning(f"No text extracted from {image_path}")
            return None

        page_data = self.text2json(page_text, image_path)
        if not page_data:
            logger.warning("No structured data extracted from text.")
            return None

        return page_data

    def image2text(self, image_path: str) -> PageText | None:
        """Extract text content from book page image using vision model."""
        try:
            response = ollama.chat(
                model=self.image_process_model,
                messages=[
                    {
                        "role": "user",
                        "content": "Extract all text from this book page image. Preserve paragraph breaks and formatting. Provide the complete text content.",
                        "images": [image_path],
                    }
                ],
                format=PageText.model_json_schema(),
                options={"temperature": 0.0},
            )
            response_content = response["message"]["content"]
            return PageText.model_validate_json(response_content)

        except Exception as e:
            logger.error(f"Error extracting text from {image_path}: {e}")
            return None

    def text2json(self, page_text: PageText, image_path: str) -> PageData | None:
        """Extract structured page data from text content."""
        try:
            # Extract page number from filename if possible
            from pathlib import Path
            import re

            filename = Path(image_path).stem
            page_number_match = re.search(r'\d+', filename)
            page_number = int(page_number_match.group()) if page_number_match else 0

            system_prompt = """Identify and extract the following information. Present as a JSON object.

            page_number: Page number if visible in the text (use 0 if not found).
            text: The cleaned and formatted text content from the page.
            word_count: Count of words in the text.
            """

            response = ollama.chat(
                model=self.extractor_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": page_text.text_content},
                ],
                format=PageData.model_json_schema(),
                options={"temperature": 0.0},
            )

            page_data = PageData.model_validate_json(
                response["message"]["content"]
            )

            # Override page_number with filename-based number if available
            if page_number > 0:
                page_data.page_number = page_number

            return page_data

        except Exception as e:
            logger.error(f"Error extracting page data: {e}")
            return None
