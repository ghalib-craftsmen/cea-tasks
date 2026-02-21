import json
import os
from pathlib import Path
from typing import Any, List, Optional
import tempfile
import time
import threading


class JSONStorage:
    """
    Thread-safe JSON file storage with atomic writes and Windows file locking support.
    
    This class provides a robust way to read and write JSON files with the following features:
    - Atomic writes to prevent data corruption
    - Thread-safe operations using locks
    - Retry mechanism for Windows file locking issues
    - Automatic directory creation
    """
    def __init__(self, base_dir: str = "data"):
        self.base_dir = Path(base_dir)
        self._ensure_directory_exists()
        self._lock = threading.Lock()

    def _ensure_directory_exists(self) -> None:
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, filename: str) -> Path:
        return self.base_dir / filename

    def _initialize_file_if_missing(self, file_path: Path) -> None:
        if not file_path.exists():
            self._write_atomic(file_path, [])

    def _write_atomic(self, file_path: Path, data: Any) -> None:
        """
        Write data to a file atomically with retry logic for Windows file locking.
        
        This method implements the write-then-replace pattern to ensure atomicity:
        1. Write data to a temporary file
        2. Close the temporary file
        3. Replace the target file with the temporary file
        
        On Windows, file locking can cause PermissionError when replacing files.
        This method implements exponential backoff retry logic to handle these cases.
        
        Args:
            file_path: The target file path to write to
            data: The data to write (must be JSON serializable)
            
        Raises:
            PermissionError: If file cannot be replaced after max retries
            OSError: If file operations fail
        """
        temp_fd, temp_path = tempfile.mkstemp(
            dir=self.base_dir,
            prefix=f".{file_path.stem}_",
            suffix=file_path.suffix
        )
        
        try:
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            max_retries = 5
            retry_delay = 0.1
            
            for attempt in range(max_retries):
                try:
                    os.replace(temp_path, str(file_path))
                    break
                except PermissionError as e:
                    if attempt == max_retries - 1:
                        try:
                            os.unlink(temp_path)
                        except OSError:
                            pass
                        raise
                    time.sleep(retry_delay * (2 ** attempt))
        except Exception:
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            raise


    def read(self, filename: str) -> List[Any]:
        """
        Read and parse JSON data from a file.
        
        Args:
            filename: The name of the file to read
            
        Returns:
            The parsed JSON data as a list
        """
        file_path = self._get_file_path(filename)
        self._initialize_file_if_missing(file_path)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def write(self, filename: str, data: List[Any]) -> None:
        """
        Write data to a JSON file with thread safety.
        
        This method uses a lock to ensure that concurrent writes don't cause
        data corruption or race conditions.
        
        Args:
            filename: The name of the file to write to
            data: The data to write (must be JSON serializable)
        """
        file_path = self._get_file_path(filename)
        with self._lock:
            self._write_atomic(file_path, data)

    def read_users(self) -> List[Any]:
        return self.read("users.json")

    def write_users(self, users: List[Any]) -> None:
        self.write("users.json", users)

    def read_participation(self) -> List[Any]:
        return self.read("participation.json")

    def write_participation(self, participation: List[Any]) -> None:
        self.write("participation.json", participation)

    def read_teams(self) -> List[Any]:
        return self.read("teams.json")

    def write_teams(self, teams: List[Any]) -> None:
        self.write("teams.json", teams)

    def get_file_path(self, filename: str) -> str:
        return str(self._get_file_path(filename).resolve())