"""
Seed teams into DynamoDB from config/teams.json.

Uses Discord UserIDs directly — no API resolution needed.
Replace-mode: re-running syncs membership to match the JSON exactly
(adds new members, removes members no longer listed).

Usage:
    python seed_teams.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from app.services import team_service  # noqa: E402

_TEAMS_FILE = Path(__file__).parent / "config" / "teams.json"


def seed(dry_run: bool = False) -> None:
    with open(_TEAMS_FILE) as f:
        team_defs: list[dict] = json.load(f)

    for team_def in team_defs:
        team_id: str = str(team_def["team_id"])
        name: str = team_def["name"]
        lead_user_id: str = team_def["lead_user_id"]
        member_ids: list[str] = team_def.get("members", [])

        # Lead is always a member
        desired_ids: set[str] = {lead_user_id} | set(member_ids)

        print(f"Team '{team_id}' ({name}) — lead: {lead_user_id}, {len(desired_ids)} member(s)")

        if dry_run:
            for uid in sorted(desired_ids):
                marker = " [lead]" if uid == lead_user_id else ""
                print(f"  [dry-run] {uid}{marker}")
            print()
            continue

        # Create team record (idempotent — skipped if already exists)
        msg = team_service.create_team(team_id, name, lead_user_id, created_by="seeder")
        print(f"  {msg}")

        # Sync members — replace mode: JSON is the source of truth
        existing_ids = set(team_service.get_team_members(team_id))
        to_add = desired_ids - existing_ids
        to_remove = existing_ids - desired_ids

        for uid in sorted(to_add):
            team_service.add_member(team_id, uid, added_by="seeder")
            print(f"  + {uid}")

        for uid in sorted(to_remove):
            team_service.remove_member(team_id, uid)
            print(f"  - {uid} (removed — not in config)")

        if not to_add and not to_remove:
            print("  No changes.")
        print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed teams into DynamoDB from config/teams.json")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to DynamoDB")
    args = parser.parse_args()
    seed(dry_run=args.dry_run)
