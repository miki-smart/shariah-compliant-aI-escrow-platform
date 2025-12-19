FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy all source files (main.py, utils.py, etc.)
COPY . .

EXPOSE 8000

# 🔴 THIS IS THE KEY LINE
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
