import json
from pathlib import Path
from datetime import datetime, timedelta
import random
import sys
import bcrypt

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.db import JSONStorage

DATA_DIR = Path(__file__).parent.parent / "data"
storage = JSONStorage(str(DATA_DIR))


def get_input_from_user():
    """Get configuration values from user input."""
    print("Meal Headcount Planner Database Setup")
    print("=" * 50)
    print()
    
    while True:
        try:
            num_users = input("Enter number of users (default: 20): ").strip()
            if not num_users:
                num_users = 20
            else:
                num_users = int(num_users)
            if num_users < 3:
                print("Error: Minimum 3 users required (Admin, Logistics, and at least 1 Team Lead)")
                continue
            break
        except ValueError:
            print("Error: Please enter a valid number")
    
    while True:
        try:
            num_teams = input("Enter number of teams (default: 5): ").strip()
            if not num_teams:
                num_teams = 5
            else:
                num_teams = int(num_teams)
            if num_teams < 1:
                print("Error: Minimum 1 team required")
                continue
            if num_teams >= num_users - 2:
                print(f"Error: Number of teams ({num_teams}) cannot exceed users - 2 ({num_users - 2})")
                continue
            break
        except ValueError:
            print("Error: Please enter a valid number")
    
    while True:
        try:
            num_days = input("Enter number of days for participation data (default: 7): ").strip()
            if not num_days:
                num_days = 7
            else:
                num_days = int(num_days)
            if num_days < 1:
                print("Error: Minimum 1 day required")
                continue
            break
        except ValueError:
            print("Error: Please enter a valid number")
    
    print()
    print(f"Configuration:")
    print(f"  NUM_USERS: {num_users}")
    print(f"  NUM_TEAMS: {num_teams}")
    print(f"  NUM_DAYS: {num_days}")
    print()
    
    return num_users, num_teams, num_days


def get_input_from_args():
    """Get configuration values from command-line arguments."""
    if len(sys.argv) != 4:
        print("Usage: python setup_db.py <NUM_USERS> <NUM_TEAMS> <NUM_DAYS>")
        print("Example: python setup_db.py 20 5 7")
        print()
        print("Or run without arguments to use interactive input")
        sys.exit(1)
    
    try:
        num_users = int(sys.argv[1])
        num_teams = int(sys.argv[2])
        num_days = int(sys.argv[3])
    except ValueError:
        print("Error: All arguments must be valid numbers")
        sys.exit(1)
    
    if num_users < 3:
        print("Error: Minimum 3 users required (Admin, Logistics, and at least 1 Team Lead)")
        sys.exit(1)
    
    if num_teams < 1:
        print("Error: Minimum 1 team required")
        sys.exit(1)
    
    if num_teams >= num_users - 2:
        print(f"Error: Number of teams ({num_teams}) cannot exceed users - 2 ({num_users - 2})")
        sys.exit(1)
    
    if num_days < 1:
        print("Error: Minimum 1 day required")
        sys.exit(1)
    
    return num_users, num_teams, num_days


NUM_USERS = 20
NUM_TEAMS = 5
NUM_DAYS = 7


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def generate_users():
    users = []
    
    users.append({
        "id": 1,
        "username": "admin",
        "password": hash_password("admin123"),
        "name": "System Administrator",
        "email": "admin@company.com",
        "role": "Admin",
        "team_id": None,
        "status": "Approved"
    })

    users.append({
        "id": 2,
        "username": "logistics",
        "password": hash_password("logistics123"),
        "name": "Logistics Manager",
        "email": "logistics@company.com",
        "role": "Logistics",
        "team_id": None,
        "status": "Approved"
    })

    for i in range(NUM_TEAMS):
        users.append({
            "id": 3 + i,
            "username": f"teamlead{i+1}",
            "password": hash_password(f"teamlead{i+1}_123"),
            "name": f"Team Lead {i+1}",
            "email": f"teamlead{i+1}@company.com",
            "role": "TeamLead",
            "team_id": i + 1,
            "status": "Approved"
        })

    employee_id = 3 + NUM_TEAMS
    for i in range((NUM_USERS - 3 - NUM_TEAMS) + 1):
        team_id = (i % NUM_TEAMS) + 1
        users.append({
            "id": employee_id + i,
            "username": f"employee{i+1}",
            "password": hash_password(f"employee{i+1}_123"),
            "name": f"Employee {i+1}",
            "email": f"employee{i+1}@company.com",
            "role": "Employee",
            "team_id": team_id,
            "status": "Approved"
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
    storage.write(filename, data)
    print(f"✓ Generated {filename} with {len(data)} records")


def setup_database():
    """Setup the database with user-specified configuration."""
    global NUM_USERS, NUM_TEAMS, NUM_DAYS
    
    if len(sys.argv) == 4:
        NUM_USERS, NUM_TEAMS, NUM_DAYS = get_input_from_args()
    else:
        NUM_USERS, NUM_TEAMS, NUM_DAYS = get_input_from_user()
    
    print("Setting up Meal Headcount Planner database...")
    print("-" * 50)
    
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
    print(f"Total users created: {len(users)}")
    print(f"Total teams: {NUM_TEAMS}")
    print(f"Participation records: {len(participation)}")
    print()
    print("Next step: Run 'cd .. && python main.py' to start the API server")


if __name__ == "__main__":
    setup_database()