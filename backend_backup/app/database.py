import os
from pathlib import Path

from dotenv import load_dotenv
import psycopg2

BASE_DIR = Path(__file__).resolve().resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not configured")

    return psycopg2.connect(DATABASE_URL)