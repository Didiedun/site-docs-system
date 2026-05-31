# MPXJ needs a JVM, so the base image ships Java; Python runs the service.
FROM eclipse-temurin:21-jdk-jammy
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt
COPY app ./app
ENV PORT=8000
CMD ["python3","-m","uvicorn","app.api:app","--host","0.0.0.0","--port","8000"]
