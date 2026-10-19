"""One development server per checkout/port, including Windows reload children."""
from contextlib import contextmanager
import hashlib
import os
from pathlib import Path
import tempfile


@contextmanager
def server_lock(root, port):
    key = hashlib.sha256(f"{os.path.normcase(str(Path(root).resolve()))}:{int(port)}".encode()).hexdigest()
    path = Path(tempfile.gettempdir()) / f"intellilms-dev-{key}.lock"
    with path.open("a+b") as handle:
        if handle.tell() == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt
            lock = lambda: msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            unlock = lambda: msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        else:
            import fcntl
            lock = lambda: fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            unlock = lambda: fcntl.flock(handle, fcntl.LOCK_UN)
        lock()
        try:
            yield
        finally:
            handle.seek(0)
            unlock()
