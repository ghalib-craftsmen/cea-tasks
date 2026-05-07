from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

import google.auth
import google.auth.transport.requests

logger = logging.getLogger(__name__)

_CHAT_API_BASE = "https://chat.googleapis.com/v1"
_SCOPES = ["https://www.googleapis.com/auth/chat.bot"]

_credentials = None


def _get_credentials() -> google.auth.credentials.Credentials:
    """Obtain and cache Google service account credentials for the Chat API."""
    global _credentials
    if _credentials is None or not _credentials.valid:
        _credentials, _ = google.auth.default(scopes=_SCOPES)
    if not _credentials.valid:
        _credentials.refresh(google.auth.transport.requests.Request())
    return _credentials


def _authorized_request(url: str, payload: dict, method: str = "POST") -> None:
    """Send an authenticated request to the Google Chat REST API."""
    creds = _get_credentials()
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {creds.token}",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            logger.info("GChat API call to %s: status=%s", url, resp.status)
    except urllib.error.HTTPError as e:
        logger.error("GChat API error: %s %s", e.code, e.reason)
        raise
    except urllib.error.URLError as e:
        logger.error("GChat network error: %s", e.reason)
        raise
    except Exception as e:
        logger.error("GChat unexpected error: %s", e)
        raise


def send_message(space: str, content: str, private_user: str = "") -> None:
    """Send a text message to a Google Chat space.

    If *private_user* is a user resource name (e.g. ``users/12345``), the
    message is visible only to that user.
    """
    url = f"{_CHAT_API_BASE}/{space}/messages"
    payload: dict = {"text": content}
    if private_user:
        payload["privateMessageViewer"] = {"name": private_user}
    _authorized_request(url, payload)
