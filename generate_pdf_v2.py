from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import os

def create_blueprint_pdf(output_path, image_path):
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 50, "Ultimate Stealth: Teleprompter 2.0 Blueprint")

    # Image
    if os.path.exists(image_path):
        img = ImageReader(image_path)
        img_width, img_height = img.getSize()
        aspect = img_height / float(img_width)
        display_width = 500
        display_height = display_width * aspect
        
        c.drawImage(image_path, (width - display_width) / 2, height - 100 - display_height, width=display_width, height=display_height)
        y_offset = height - 120 - display_height
    else:
        c.setFont("Helvetica", 12)
        c.drawString(100, height - 100, "Image not found.")
        y_offset = height - 150

    # Instructions
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y_offset, "Hardware Setup: The Optical Loop")
    
    c.setFont("Helvetica", 12)
    instructions = [
        "1. Material A (Display): A clear glass plate tilted at 45 degrees over the webcam.",
        "2. Material B (Capture): A tiny 1-inch mirror sticky-tacked near the webcam bezel.",
        "3. Calibration: Angle the tiny mirror DOWN so it reflects the laptop screen center.",
        "4. Phone Placement: Place your phone flat. The BACK CAMERA must be aligned to 'see'",
        "   the tiny mirror. This captures the screen reflection clandestinely.",
        "5. Loop Closure: The AI phone app OCRs the back-camera feed, solves the question,",
        "   and displays the answer on the FRONT screen.",
        "6. Display: The front screen reflects onto the glass plate for you to read while",
        "   looking directly at the camera. Hands-free and undetectable."
    ]
    
    curr_y = y_offset - 30
    for line in instructions:
        c.drawString(50, curr_y, line)
        curr_y -= 20

    # Bonus Tip
    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(0, 0.4, 0.8)
    c.drawString(50, curr_y - 20, "PRO TIP: Use a small piece of double-sided tape for the tiny mirror.")
    c.drawString(50, curr_y - 35, "Ensure the 45-degree glass is steady to avoid 'flutter' in the reflection.")

    c.save()

if __name__ == "__main__":
    output = r"C:\Users\DELL\.gemini\antigravity\brain\e774fea3-7c19-42c6-8f60-752f0e0838e5\Teleprompter_2_Blueprint.pdf"
    image = r"C:\Users\DELL\.gemini\antigravity\brain\e774fea3-7c19-42c6-8f60-752f0e0838e5\teleprompter_2_blueprint_1773477913514.png"
    create_blueprint_pdf(output, image)
    print(f"PDF created at: {output}")
