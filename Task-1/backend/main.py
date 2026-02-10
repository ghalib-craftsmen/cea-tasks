from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import (
    verify_password,
    create_access_token,
    get_current_user,
    Token
)
from app.db import JSONStorage
from app.models import User


app = FastAPI(
    title="Meal Headcount Planner API",
    description="API for managing meal headcounts and planning",
    version="1.0.0"
)

storage = JSONStorage()

class LoginRequest(BaseModel):
    username: str
    password: str

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


@app.post("/api/auth/login", response_model=Token)
async def login(request: LoginRequest):
    """
    Authenticate a user and return a JWT access token.
    
    Args:
        request: LoginRequest containing username and password
        
    Returns:
        Token containing the access token and token type
        
    Raises:
        HTTPException: 401 if username or password is incorrect
    """
    # Get user from database
    users_data = storage.read_users()
    user_dict = None
    for user_data in users_data:
        if user_data.get("username") == request.username:
            user_dict = user_data
            break
    
    if user_dict is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = User(**user_dict)
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout endpoint (placeholder).
    
    Since JWTs are stateless, real logout happens on the client side
    by discarding the token. This endpoint exists for API specification
    compatibility and can be extended with token blacklisting if needed.
    
    Args:
        current_user: The currently authenticated user
        
    Returns:
        Success message
    """
    return {
        "message": "Successfully logged out",
        "username": current_user.username
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
