import json
from pathlib import Path
from datetime import datetime, timedelta
import random
import hashlib

DATA_DIR = Path("data")

# Configuration
NUM_USERS = 20
NUM_TEAMS = 5
NUM_DAYS = 7


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def ensure_data_directory():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def generate_users():
    users = []
    
    # Admin user
    users.append({
        "id": 1,
        "username": "admin",
        "password": "admin123",
        "name": "System Administrator",
        "email": "admin@company.com",
        "role": "Admin",
        "team_id": None
    })
    
    # Logistics user
    users.append({
        "id": 2,
        "username": "logistics",
        "password": "logistics123",
        "name": "Logistics Manager",
        "email": "logistics@company.com",
        "role": "Logistics",
        "team_id": None
    })
    
    # Team leads
    for i in range(NUM_TEAMS):
        users.append({
            "id": 3 + i,
            "username": f"teamlead{i+1}",
            "password": f"teamlead{i+1}_123",
            "name": f"Team Lead {i+1}",
            "email": f"teamlead{i+1}@company.com",
            "role": "TeamLead",
            "team_id": i + 1
        })
    
    # Employees
    employee_id = 3 + NUM_TEAMS
    for i in range((NUM_USERS - 3 - NUM_TEAMS) + 1):
        team_id = (i % NUM_TEAMS) + 1
        users.append({
            "id": employee_id + i,
            "username": f"employee{i+1}",
            "password": f"employee{i+1}_123",
            "name": f"Employee {i+1}",
            "email": f"employee{i+1}@company.com",
            "role": "Employee",
            "team_id": team_id
        })
    
    return users


def generate_participation(users):
    participation = []
    meal_types = ["Lunch", "Snacks", "Iftar", "EventDinner", "OptionalDinner"]
    today = datetime.now()
    
    for day_offset in range(NUM_DAYS):
        date = (today - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        
        for user in users:
            if user["role"] in ["Admin", "Logistics"]:
                continue
            
            meals = {}
            for meal_type in meal_types:
                meals[meal_type] = random.random() < 0.7
            
            participation.append({
                "user_id": user["id"],
                "date": date,
                "meals": meals
            })
    
    return participation


def write_json_file(filename, data):
    file_path = DATA_DIR / filename
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✓ Generated {filename} with {len(data)} records")


def setup_database():
    print("Setting up Meal Headcount Planner database...")
    print("-" * 50)
    
    ensure_data_directory()
    
    users = generate_users()
    write_json_file("users.json", users)
    
    participation = generate_participation(users)
    write_json_file("participation.json", participation)
    
    print("-" * 50)
    print("✓ Database setup complete!")
    print()
    print("Sample credentials (each user has a unique password):")
    print("  Admin:      admin / admin123")
    print("  Logistics:  logistics / logistics123")
    print("  Team Lead:  teamlead1 / teamlead1_123")
    print("  Employee:   employee1 / employee1_123")
    print()
    print("Next step: Run 'python main.py' to start the API server")


if __name__ == "__main__":
    setup_database()