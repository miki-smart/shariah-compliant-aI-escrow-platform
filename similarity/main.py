from fastapi import FastAPI, UploadFile, File
from PIL import Image
import numpy as np
import io

from utils import compute_similarity

app = FastAPI(title="Lightweight Image Similarity API")

@app.post("/verify-image")
async def verify_image(
    image_1: UploadFile = File(...),
    image_2: UploadFile = File(...)
):
    img1 = Image.open(io.BytesIO(await image_1.read())).convert("RGB")
    img2 = Image.open(io.BytesIO(await image_2.read())).convert("RGB")

    img1_np = np.array(img1)
    img2_np = np.array(img2)

    similarity = compute_similarity(img1_np, img2_np)

    if similarity >= 0.75:
        result = "MATCH"
    elif similarity >= 0.35:
        result = "REVIEW"
    else:
        result = "MISMATCH"

    return {
        "similarity_score": similarity,
        "result": result
    }
