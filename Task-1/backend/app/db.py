import json
import os
from pathlib import Path
from typing import Any, List, Optional
import tempfile


class JSONStorage:
    def __init__(self, base_dir: str = "data"):
        self.base_dir = Path(base_dir)
        self._ensure_directory_exists()


    def _ensure_directory_exists(self) -> None:
        self.base_dir.mkdir(parents=True, exist_ok=True)


    def _get_file_path(self, filename: str) -> Path:
        return self.base_dir / filename


    def _initialize_file_if_missing(self, file_path: Path) -> None:
        if not file_path.exists():
            self._write_atomic(file_path, [])


    def _write_atomic(self, file_path: Path, data: Any) -> None:
        # Create a temporary file in the same directory as the target file
        # This ensures the temporary file is on the same filesystem
        temp_fd, temp_path = tempfile.mkstemp(
            dir=self.base_dir,
            prefix=f".{file_path.stem}_",
            suffix=file_path.suffix
        )
        
        try:
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            # Atomically replace the target file with the temporary file
            # os.replace() works on both Unix and Windows and is atomic
            os.replace(temp_path, str(file_path))
        except Exception:
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            raise


    def read(self, filename: str) -> List[Any]:
        file_path = self._get_file_path(filename)
        self._initialize_file_if_missing(file_path)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)


    def write(self, filename: str, data: List[Any]) -> None:
        file_path = self._get_file_path(filename)
        self._write_atomic(file_path, data)


    def read_users(self) -> List[Any]:
        return self.read("users.json")


    def write_users(self, users: List[Any]) -> None:
        self.write("users.json", users)


    def read_participation(self) -> List[Any]:
        return self.read("participation.json")


    def write_participation(self, participation: List[Any]) -> None:
        self.write("participation.json", participation)


    def get_file_path(self, filename: str) -> str:
        return str(self._get_file_path(filename).resolve())