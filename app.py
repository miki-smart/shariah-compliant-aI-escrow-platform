# =====================================================
# app.py — ONE FILE, END-TO-END, NO TORCH
# =====================================================

import io
import os
from dotenv import load_dotenv
load_dotenv()

import cv2
import pytesseract
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File
from groq import Groq

# =====================================================
# CONFIG
# =====================================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("❌ GROQ_API_KEY not found in .env")

MODEL_NAME = "llama-3.1-8b-instant"
client = Groq(api_key=GROQ_API_KEY)

# =====================================================
# STRONG SYSTEM PROMPT (VISION-AWARE)
# =====================================================
SYSTEM_PROMPT = """
You are a Shariah compliance decision agent for Ethiopia.

You receive:
1) OCR text (may be empty)
2) Vision hints inferred from image analysis

Decide ONE:
- HALAL
- HARAM
- NEEDS_SCHOLAR_REVIEW

Rules:
- Alcohol, beer, wine, spirits → HARAM
- Pork → HARAM
- Gambling → HARAM
- Interest (riba) → HARAM
- If alcohol is visually detected even without text → HARAM
- If unsure → NEEDS_SCHOLAR_REVIEW

Output STRICT JSON ONLY:

{
  "decision": "HALAL | HARAM | NEEDS_SCHOLAR_REVIEW",
  "reason": "short explanation",
  "detected_issues": [],
  "confidence": 0.0
}
"""

# =====================================================
# FASTAPI APP
# =====================================================
app = FastAPI(title="Shariah Compliance Checker (Vision + LLM)")

# =====================================================
# IMAGE PREPROCESSING
# =====================================================
def preprocess_image(image: Image.Image):
    img = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    return gray

# =====================================================
# OCR
# =====================================================
def ocr_image(image: Image.Image):
    processed = preprocess_image(image)
    texts = []

    for lang in ["amh+eng", "eng"]:
        try:
            txt = pytesseract.image_to_string(processed, lang=lang, config="--psm 6")
            if txt.strip():
                texts.append(txt)
        except:
            pass

    full_text = "\n".join(texts).strip()
    conf = min(0.99, max(0.1, len(full_text) / 800)) if full_text else 0.0
    return full_text, conf

# =====================================================
# CLASSICAL VISION: ALCOHOL BOTTLE DETECTION (NO AI)
# =====================================================
def detect_alcohol_like_image(image: Image.Image) -> bool:
    """
    Heuristic detection:
    - Tall bottle shapes
    - Dark glass colors (brown/green)
    - Multiple bottles together
    """

    img = np.array(image.convert("RGB"))
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

    # Detect dark green / brown glass
    green_mask = cv2.inRange(hsv, (25, 40, 40), (90, 255, 255))
    brown_mask = cv2.inRange(hsv, (10, 50, 20), (25, 255, 200))
    mask = cv2.bitwise_or(green_mask, brown_mask)

    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bottle_like = 0
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        aspect_ratio = h / max(w, 1)

        # Bottle-like tall shapes
        if aspect_ratio > 2.5 and h > 120:
            bottle_like += 1

    return bottle_like >= 2  # multiple bottles → strong signal

# =====================================================
# LLM DECISION
# =====================================================
def llm_decide(text: str):
    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ],
        temperature=0.2,
        max_tokens=300
    )
    return completion.choices[0].message.content

# =====================================================
# ROUTES
# =====================================================
@app.get("/")
def root():
    return {"status": "running"}

@app.post("/check-text")
def check_text(text: str):
    decision = llm_decide(text)
    return {"input_type": "text", "agent_decision": decision}

@app.post("/check-image")
async def check_image(file: UploadFile = File(...)):
    img_bytes = await file.read()
    image = Image.open(io.BytesIO(img_bytes))

    text, ocr_conf = ocr_image(image)

    vision_hints = []
    if detect_alcohol_like_image(image):
        vision_hints.append("Alcohol bottles visually detected")

    combined_input = (
        f"OCR TEXT:\n{text}\n\n"
        f"VISION HINTS:\n{', '.join(vision_hints) if vision_hints else 'None'}"
    )

    decision = llm_decide(combined_input)

    return {
        "file": file.filename,
        "ocr_confidence": ocr_conf,
        "vision_detected": vision_hints,
        "agent_decision": decision
    }
