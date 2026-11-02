import pytesseract
from PIL import Image


# Path to installed Tesseract OCR
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_text_from_image(image_path: str):

    try:
        image = Image.open(image_path)

        extracted_text = pytesseract.image_to_string(image)

        return {
            "success": True,
            "text": extracted_text.strip()
        }

    except Exception as e:

        return {
            "success": False,
            "text": "",
            "error": str(e)
        }