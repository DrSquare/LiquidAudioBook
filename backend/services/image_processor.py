"""
Image Processor Service
Handles image validation and preprocessing
"""

import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Service for image processing and validation"""

    SUPPORTED_FORMATS = {'jpeg', 'jpg', 'png', 'gif', 'webp'}
    MAX_SIZE_MB = 5

    def validate_image(self, image_bytes: bytes) -> Tuple[bool, str]:
        """
        Validate image format and size

        Args:
            image_bytes: Image file content as bytes

        Returns:
            Tuple of (is_valid, message)
        """
        # Check file size
        size_mb = len(image_bytes) / (1024 * 1024)
        if size_mb > self.MAX_SIZE_MB:
            return False, f"Image too large: {size_mb:.2f}MB (max {self.MAX_SIZE_MB}MB)"

        # Check file format by magic bytes
        is_valid, format_name = self._check_format(image_bytes)
        if not is_valid:
            return False, f"Unsupported format: {format_name}"

        return True, "Valid"

    def _check_format(self, image_bytes: bytes) -> Tuple[bool, str]:
        """
        Check image format by magic bytes

        Args:
            image_bytes: Image file content as bytes

        Returns:
            Tuple of (is_supported, format_name)
        """
        if len(image_bytes) < 4:
            return False, "Unknown"

        # Check magic bytes
        if image_bytes[:3] == b'\xff\xd8\xff':
            return True, "JPEG"
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            return True, "PNG"
        elif image_bytes[:3] == b'GIF':
            return True, "GIF"
        elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            return True, "WebP"
        else:
            return False, "Unknown"

    def get_image_info(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Get image information

        Args:
            image_bytes: Image file content as bytes

        Returns:
            Dictionary with image metadata
        """
        size_mb = len(image_bytes) / (1024 * 1024)
        is_valid, format_name = self._check_format(image_bytes)

        return {
            'sizeBytes': len(image_bytes),
            'sizeMB': round(size_mb, 2),
            'format': format_name,
            'isValid': is_valid
        }
