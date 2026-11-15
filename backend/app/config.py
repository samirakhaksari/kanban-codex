import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = Path(os.environ.get("KANBAN_STATIC_DIR", str(BACKEND_DIR / "static")))
DATA_DIR = Path(os.environ.get("KANBAN_DATA_DIR", str(BACKEND_DIR.parent / "data")))
OPENROUTER_MODEL = "openai/gpt-oss-120b"
OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_TIMEOUT_SECONDS = 30.0