import os
import tempfile

from fastapi import FastAPI, File, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware

from .generation.llm import generate
from .generation.prompts import build_prompt
from .models import GenerateRequest
from .auth import require_utm_user

app = FastAPI(title="UTM Site Docs Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/programme/parse", dependencies=[Depends(require_utm_user)])
async def programme_parse(file: UploadFile = File(...)):
    from .programme.mpp_reader import parse_programme

    data = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".mpp", delete=False) as f:
        f.write(data)
        path = f.name
    try:
        return parse_programme(path)
    finally:
        os.unlink(path)


@app.post("/generate", dependencies=[Depends(require_utm_user)])
def generate_body(req: GenerateRequest):
    system, user = build_prompt(req.docType, req.payload)
    return {"docType": req.docType, "body": generate(system, user)}
