import os
import tempfile

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .generation.llm import generate
from .generation.prompts import build_prompt
from .models import GenerateRequest
from .programme.mpp_reader import parse_programme

app = FastAPI(title="UTM Site Docs Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/programme/parse")
async def programme_parse(file: UploadFile = File(...)):
    data = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".mpp", delete=False) as f:
        f.write(data)
        path = f.name
    try:
        return parse_programme(path)
    finally:
        os.unlink(path)


@app.post("/generate")
def generate_body(req: GenerateRequest):
    system, user = build_prompt(req.docType, req.payload)
    return {"docType": req.docType, "body": generate(system, user)}