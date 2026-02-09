from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Meal Headcount Planner API",
    description="API for managing meal headcounts and planning",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Meal Headcount Planner API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "root": "/",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
