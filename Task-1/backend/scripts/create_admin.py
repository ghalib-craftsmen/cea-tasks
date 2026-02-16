import json
import sys
from pathlib import Path
from typing import Dict, List, Any


def get_next_user_id(users: List[Dict[str, Any]]) -> int:
    """Get next available user ID."""
    if not users:
        return 1
    max_id = max(user.get("id", 0) for user in users)
    return max_id + 1


def username_exists(users: List[Dict[str, Any]], username: str) -> bool:
    """Check if a username already exists (case-insensitive)."""
    username_lower = username.lower()
    return any(user.get("username", "").lower() == username_lower for user in users)


def email_exists(users: List[Dict[str, Any]], email: str) -> bool:
    """Check if an email already exists (case-insensitive)."""
    email_lower = email.lower()
    return any(user.get("email", "").lower() == email_lower for user in users)


def create_admin_user(
    username: str,
    password: str,
    name: str,
    email: str,
    team_id: int = None
) -> Dict[str, Any]:
    """Create a new admin user dictionary."""
    return {
        "id": 0,
        "username": username,
        "password": password,
        "name": name,
        "email": email,
        "role": "Admin",
        "team_id": team_id
    }


def get_input_from_user():
    """Get admin user details from interactive terminal input."""
    print("Create Admin User for Testing")
    print("=" * 50)
    print()
    
    while True:
        username = input("Enter username (default: test_admin): ").strip()
        if not username:
            username = "test_admin"
        if len(username) < 1 or len(username) > 50:
            print("Error: Username must be between 1 and 50 characters")
            continue
        break
    
    while True:
        password = input("Enter password (default: admin123): ").strip()
        if not password:
            password = "admin123"
        if len(password) < 1:
            print("Error: Password cannot be empty")
            continue
        break
    
    while True:
        name = input("Enter full name (default: Test Administrator): ").strip()
        if not name:
            name = "Test Administrator"
        if len(name) < 1 or len(name) > 100:
            print("Error: Name must be between 1 and 100 characters")
            continue
        break
    
    while True:
        email = input("Enter email (default: test_admin@company.com): ").strip()
        if not email:
            email = "test_admin@company.com"
        if len(email) < 1 or len(email) > 100:
            print("Error: Email must be between 1 and 100 characters")
            continue
        if "@" not in email or "." not in email:
            print("Error: Please enter a valid email address")
            continue
        break
    
    print()
    print(f"Admin User Details:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print(f"  Name: {name}")
    print(f"  Email: {email}")
    print()
    
    confirm = input("Confirm creation? (y/n): ").strip().lower()
    if confirm != 'y':
        print("Operation cancelled.")
        sys.exit(0)
    
    return username, password, name, email


def get_input_from_args():
    """Get admin user details from command-line arguments."""
    if len(sys.argv) != 5:
        print("Usage: python create_admin.py <username> <password> <name> <email>")
        print("Example: python create_admin.py test_admin admin123 'Test Admin' test_admin@company.com")
        print()
        print("Or run without arguments to use interactive input")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3]
    email = sys.argv[4]
    
    if len(username) < 1 or len(username) > 50:
        print("Error: Username must be between 1 and 50 characters")
        sys.exit(1)
    
    if len(password) < 1:
        print("Error: Password cannot be empty")
        sys.exit(1)
    
    if len(name) < 1 or len(name) > 100:
        print("Error: Name must be between 1 and 100 characters")
        sys.exit(1)
    
    if len(email) < 1 or len(email) > 100:
        print("Error: Email must be between 1 and 100 characters")
        sys.exit(1)
    
    if "@" not in email or "." not in email:
        print("Error: Please enter a valid email address")
        sys.exit(1)
    
    return username, password, name, email


def main():
    """Main function to create an admin user."""
    if len(sys.argv) == 5:
        username, password, name, email = get_input_from_args()
    else:
        username, password, name, email = get_input_from_user()
    
    users_file = Path(__file__).parent.parent / "data" / "users.json"
    
    if not users_file.exists():
        print(f"Error: Users file not found at {users_file}")
        sys.exit(1)
    
    try:
        with open(users_file, 'r', encoding='utf-8') as f:
            users = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse users.json: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: Failed to read users.json: {e}")
        sys.exit(1)
    
    if username_exists(users, username):
        print(f"Error: Username '{username}' already exists in system.")
        print(f"Existing users with similar names:")
        for user in users:
            if username.lower() in user.get("username", "").lower():
                print(f"  - {user.get('username')} (ID: {user.get('id')})")
        sys.exit(1)
    
    if email_exists(users, email):
        print(f"Error: Email '{email}' already exists in system.")
        print(f"Existing users with this email:")
        for user in users:
            if email.lower() == user.get("email", "").lower():
                print(f"  - {user.get('name')} (ID: {user.get('id')})")
        sys.exit(1)
    
    new_user = create_admin_user(username, password, name, email)
    new_user["id"] = get_next_user_id(users)
    
    users.append(new_user)
    
    try:
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
        print(f"✓ Successfully created admin user!")
        print()
        print(f"User Details:")
        print(f"  ID: {new_user['id']}")
        print(f"  Username: {new_user['username']}")
        print(f"  Password: {new_user['password']}")
        print(f"  Name: {new_user['name']}")
        print(f"  Email: {new_user['email']}")
        print(f"  Role: {new_user['role']}")
        print(f"  Team ID: {new_user['team_id']}")
        print()
        print(f"You can now login with:")
        print(f"  Username: {new_user['username']}")
        print(f"  Password: {new_user['password']}")
    except Exception as e:
        print(f"Error: Failed to write to users.json: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
