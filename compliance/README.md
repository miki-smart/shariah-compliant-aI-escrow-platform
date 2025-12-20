
# 🕌 Shariah Compliance Checker (Dockerized)

This project is a **Dockerized FastAPI application** that checks whether a product or financial offering is **Halal, Haram, or Needs Scholar Review**, using:

- Image upload (e.g. alcohol bottles)
- OCR (Amharic + English)
- Computer vision (no deep learning)
- LLM reasoning (Groq – LLaMA 3.1)
- Shariah rules tailored for Ethiopia

---

## 🧠 Decision Philosophy

The LLM acts as a **screening agent** (decision support, not a fatwa authority):

| Output | Meaning |
|------|--------|
| `HALAL` | Clearly Shariah compliant |
| `HARAM` | Clearly Shariah prohibited |
| `NEEDS_SCHOLAR_REVIEW` | Ambiguous, mixed, or insufficient data |

---

## 📁 Project Structure

```text
shariah_checker/
├── app.py
├── requirements.txt
├── Dockerfile
└── .env


---

## Features

- Upload images or text

- Detects alcohol products even without labels

- Works on Windows / Linux / Docker

- No Torch, no GPU required

- Uses agentic LLM reasoning

- Returns structured JSON decisions

## Tech Stack

- FastAPI

- Docker

- OpenCV

- Tesseract OCR (Amharic + English)

- Groq LLM (LLaMA 3.1)

- Python 3.11


##Build Docker Image

- Run this from the project folder:

- docker build -t shariah-checker .


## Run the Container

docker run -p 8000:8000 --env-file .env shariah-checker

## Open the Application

Open your browser:

http://localhost:8000/docs


## API Endpoints
1️⃣ Check Text

POST /check-text

## Example input:

ወለድ 12% ብድር


## Example output:

{
  "decision": "HARAM",
  "reason": "Interest-based loan (riba)",
  "detected_issues": ["interest"],
  "confidence": 0.9
}

## Check Image

POST /check-image

Upload an image (e.g. alcohol bottles)


## Example output:

{
  "decision": "HARAM",
  "reason": "Alcohol bottles detected visually",
  "detected_issues": ["alcohol"],
  "confidence": 0.95
}




