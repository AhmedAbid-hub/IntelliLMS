"""Controlled fault injection for isolated auth browser acceptance. No network endpoint."""
import os
from pathlib import Path
import re
import sys
from datetime import timedelta
from unittest.mock import patch
from e2e_database import database_path

backend=Path(__file__).resolve().parents[1]/"backend"
database = database_path()
if not database.is_file():
    raise RuntimeError("The isolated browser run database does not exist.")
os.environ.update(DEBUG="True",DJANGO_SETTINGS_MODULE="config.e2e_settings",SECRET_KEY="isolated-e2e-only-secret",DB_ENGINE="sqlite",SQLITE_NAME=str(database))
sys.path.insert(0,str(backend))
import django
django.setup()
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from apps.accounts.models import User, AccountInvitation

if Path(settings.DATABASES["default"]["NAME"]).resolve()!=database:
    raise RuntimeError("Refusing non-disposable database")
action,username=sys.argv[1:3]
if not re.fullmatch(r"auth-browser-[a-z0-9-]+",username):
    raise RuntimeError("Only named browser fixtures may be changed")
folder=backend/"test-results"
folder.mkdir(exist_ok=True)
marker=folder/f"mail-fail-{username}"
if action=="fail-mail":
    marker.write_text("fail",encoding="utf-8")
elif action=="restore-mail":
    marker.unlink(missing_ok=True)
elif action=="expire-invitation":
    AccountInvitation.objects.filter(user__username=username).update(expires_at=timezone.now()-timedelta(seconds=1))
elif action=="expired-reset":
    user=User.objects.get(username=username)
    with patch.object(default_token_generator,"_now",return_value=default_token_generator._now()-timedelta(minutes=31)):
        token=default_token_generator.make_token(user)
    # Keep tokens out of command output and logs; only the isolated test consumes this file.
    (folder/f"reset-{username}.txt").write_text(f"/reset/{urlsafe_base64_encode(force_bytes(user.pk))}/{token}",encoding="utf-8")
else:
    raise RuntimeError("Unknown test action")
