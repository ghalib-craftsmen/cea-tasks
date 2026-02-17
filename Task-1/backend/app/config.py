import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

API_TITLE = "Meal Headcount Planner API"
API_DESCRIPTION = "API for managing meal headcounts and planning"
API_VERSION = "1.0.0"

CORS_ORIGINS = ["*"]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["*"]
CORS_ALLOW_HEADERS = ["*"]

UVICORN_HOST = "127.0.0.1"
UVICORN_PORT = 8000
