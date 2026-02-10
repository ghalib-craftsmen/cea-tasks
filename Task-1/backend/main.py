from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth import (
    verify_password,
    hash_password,
    create_access_token,
    get_current_user,
    require_admin,
    Token
)
from app.db import JSONStorage
from app.models import User, RegisterRequest, UserResponse
from app.routers import meals


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

# Include routers
app.include_router(meals.router)


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
    return {
        "message": "Successfully logged out",
        "username": current_user.username
    }


@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, current_user: User = Depends(require_admin)):
    # Get existing users
    users_data = storage.read_users()
    
    # Check if username already exists
    for user_data in users_data:
        if user_data.get("username") == request.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '{request.username}' already exists"
            )
    
    # Generate new user ID
    new_id = len(users_data) + 1 if users_data else 1
    
    # Hash the password
    password_hash = hash_password(request.password)
    
    # Create new user dictionary
    new_user_dict = {
        "id": new_id,
        "username": request.username,
        "password_hash": password_hash,
        "name": request.name,
        "email": request.email,
        "role": request.role,
        "team_id": request.team_id
    }
    
    # Append to users list
    users_data.append(new_user_dict)
    
    # Write to storage
    storage.write_users(users_data)
    
    # Return user response (excluding password hash)
    return UserResponse(
        id=new_user_dict["id"],
        username=new_user_dict["username"],
        name=new_user_dict["name"],
        email=new_user_dict["email"],
        role=new_user_dict["role"],
        team_id=new_user_dict["team_id"]
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
