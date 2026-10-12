"""Build/run production services with disposable volumes, TLS and loopback ports.

Requires Docker Compose and OpenSSL (Git for Windows includes OpenSSL).
Never reads or overwrites .env.production. Never sends mail or deploys externally.
"""

import json
import os
from pathlib import Path
import secrets
import shutil
import ssl
import subprocess
import tempfile
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "intellilms-disposable-smoke"
openssl = shutil.which("openssl")
if not openssl:
    candidate = Path("C:/Program Files/Git/usr/bin/openssl.exe")
    openssl = str(candidate) if candidate.exists() else None
if not openssl:
    raise SystemExit("OpenSSL is required to create disposable test TLS certificates.")
existing = subprocess.check_output(
    ["docker", "ps", "-aq", "--filter", f"label=com.docker.compose.project={PROJECT}"],
    text=True,
).strip()
volumes = subprocess.check_output(
    [
        "docker",
        "volume",
        "ls",
        "-q",
        "--filter",
        f"label=com.docker.compose.project={PROJECT}",
    ],
    text=True,
).strip()
if existing or volumes:
    raise SystemExit(
        f"Refusing to replace existing containers/volumes belonging to {PROJECT}."
    )

with tempfile.TemporaryDirectory(prefix="intellilms-smoke-") as directory:
    directory = Path(directory)
    tls = directory / "tls"
    tls.mkdir()
    subprocess.run(
        [
            openssl,
            "req",
            "-x509",
            "-nodes",
            "-newkey",
            "rsa:2048",
            "-days",
            "1",
            "-subj",
            "/CN=localhost",
            "-keyout",
            str(tls / "privkey.pem"),
            "-out",
            str(tls / "fullchain.pem"),
        ],
        check=True,
        capture_output=True,
    )
    config = directory / "runtime.env"
    config.write_text(
        "\n".join(
            [
                "DEBUG=False",
                f"SECRET_KEY={secrets.token_urlsafe(50)}",
                "ALLOWED_HOSTS=localhost,127.0.0.1",
                "CSRF_TRUSTED_ORIGINS=https://localhost:18443",
                "FRONTEND_URL=https://localhost:18443",
                "DB_ENGINE=postgresql",
                "POSTGRES_DB=intellilms_smoke",
                "POSTGRES_USER=intellilms_smoke",
                f"POSTGRES_PASSWORD={secrets.token_urlsafe(30)}",
                "EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    environment = {
        **os.environ,
        "RUNTIME_ENV_FILE": config.as_posix(),
        "TLS_DIRECTORY": tls.as_posix(),
        "HTTP_BIND": "127.0.0.1:18080",
        "HTTPS_BIND": "127.0.0.1:18443",
    }
    # Prevent inherited database variables from overriding this disposable fixture.
    for key in ["POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"]:
        environment.pop(key, None)
    compose = [
        "docker",
        "compose",
        "--project-name",
        PROJECT,
        "--env-file",
        str(config),
        "-f",
        str(ROOT / "docker-compose.production.yml"),
    ]

    def run(*args):
        subprocess.run([*compose, *args], cwd=ROOT, env=environment, check=True)

    def status(path, method="GET"):
        # This locally generated certificate is intentionally self-signed.
        context = ssl._create_unverified_context()
        request = Request("https://localhost:18443" + path, method=method)
        try:
            with urlopen(request, context=context, timeout=15) as response:
                return response.status, response.read()
        except HTTPError as error:
            return error.code, error.read()

    try:
        run("config", "--quiet")
        run("build")
        run("up", "-d", "db", "--wait", "--wait-timeout", "120")
        run("run", "--rm", "backend", "python", "manage.py", "migrate", "--noinput")
        run(
            "run",
            "--rm",
            "backend",
            "python",
            "manage.py",
            "collectstatic",
            "--noinput",
        )
        run("up", "-d", "--wait", "--wait-timeout", "150")
        run("exec", "-T", "web", "nginx", "-t")
        assert status("/ready/")[0] == 200
        code, page = status("/")
        assert code == 200 and b'<div id="root">' in page
        assert status("/api/v1/grades/")[0] == 403
        codes = [status("/api/v1/auth/login/", "POST")[0] for _ in range(20)]
        assert 429 in codes, codes
        print(
            json.dumps(
                {
                    "readiness": 200,
                    "frontend": 200,
                    "anonymous_grades": 403,
                    "edge_throttle": 429,
                    "tls": "disposable self-signed certificate",
                }
            )
        )
    except BaseException:
        subprocess.run([*compose, "logs", "--tail=60"], cwd=ROOT, env=environment)
        raise
    finally:
        run("down", "--volumes", "--remove-orphans")
