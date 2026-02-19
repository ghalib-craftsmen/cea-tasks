from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.auth import (
    hash_password,
    verify_password,
    hash_password,
    create_access_token,
    get_current_user,
    require_admin,
    Token
)
from app.db import JSONStorage
from app.models import User, RegisterRequest, UserResponse


app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

storage = JSONStorage()

class LoginRequest(BaseModel):
    username: str
    password: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

app.include_router(meals.router)
app.include_router(admin.router)
app.include_router(headcount.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Meal Headcount Planner API",
        "version": API_VERSION,
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
    
    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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
    uvicorn.run(app, host=UVICORN_HOST, port=UVICORN_PORT)