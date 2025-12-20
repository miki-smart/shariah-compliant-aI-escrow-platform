# Image Similarity Checker API (FastAPI + OpenCV)

A lightweight **image similarity verification service** for delivery workflows  
(**seller → courier → consumer**) using **OpenCV ORB**.

- No heavy ML frameworks
- Fast Docker builds
- CPU-only

---

## Features

- Image-to-image similarity check
- FastAPI + OpenCV (ORB)
- Lightweight Docker image
- No PyTorch / TensorFlow
- Swagger UI for easy testing

---

## Project Structure
.
├── Dockerfile
├── requirements.txt
├── main.py
└── utils.py


---

## API Endpoint

### `POST /verify-image`

#### Request
- `image_1` – first image (file)
- `image_2` – second image (file)

#### Response
```json
{
  "similarity_score": 0.31,
  "result": "MATCH"
}


### Docure Build

docker build -t similarity-checker .

### Run
docker run -p 8000:8000 similarity-checker


Open in browser:

http://localhost:8000/docs