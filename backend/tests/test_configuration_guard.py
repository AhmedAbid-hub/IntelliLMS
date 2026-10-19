from io import StringIO
from pathlib import Path
import smtplib
import subprocess
import sys
from unittest.mock import patch
from types import SimpleNamespace

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command, get_commands
from django.core.management.base import CommandError
from django.core.mail.backends.smtp import EmailBackend
from django.test import override_settings
from django.db import OperationalError

from config.environment import load_environment, database_identity
from config.server_lock import server_lock


@pytest.mark.parametrize("key", ["DB_ENGINE", "POSTGRES_DB", "POSTGRES_HOST", "POSTGRES_PASSWORD", "EMAIL_BACKEND", "EMAIL_HOST_PASSWORD", "DEFAULT_FROM_EMAIL", "FRONTEND_URL"])
def test_conflicting_inherited_settings_fail_without_secret_output(tmp_path, key):
    config = tmp_path / '.env'
    config.write_text(f'{key}=private-root-value\n')
    environment = {key: 'private-inherited-value'}
    with pytest.raises(ImproperlyConfigured) as error:
        load_environment(config, environ=environment, testing=False)
    assert key in str(error.value)
    assert 'private-' not in str(error.value)
    assert environment[key] == 'private-inherited-value'


def test_fresh_and_matching_settings_keep_root_database(tmp_path):
    config = tmp_path / '.env'
    config.write_text('DB_ENGINE=postgresql\nPOSTGRES_DB=current_database\nEMAIL_HOST_PASSWORD=private-secret\n')
    for environment in [{}, {'DB_ENGINE': 'postgresql'}]:
        assert load_environment(config, environ=environment, testing=False) == 'root'
        assert environment['POSTGRES_DB'] == 'current_database'
        assert environment['EMAIL_HOST_PASSWORD'] == 'private-secret'


def test_intentional_deployment_environment_preserves_injected_configuration(tmp_path):
    config = tmp_path / '.env'
    config.write_text('DB_ENGINE=postgresql\nPOSTGRES_HOST=127.0.0.1\n')
    environment = {'INTELLILMS_CONFIG_SOURCE':'environment', 'POSTGRES_HOST':'db'}
    assert load_environment(config, environ=environment, testing=False) == 'environment'
    assert environment['POSTGRES_HOST'] == 'db'


@pytest.mark.parametrize('environment', [
    {'DB_ENGINE':'sqlite'},
    {'DB_ENGINE':'sqlite', 'INTELLILMS_SQLITE_EVALUATION':'1'},
    {'DB_ENGINE':'sqlite', 'INTELLILMS_SQLITE_EVALUATION':'1', 'SQLITE_NAME':'db.sqlite3'},
    {'DB_ENGINE':'mistyped'},
    {'INTELLILMS_CONFIG_SOURCE':'mistyped'},
])
def test_no_silent_sqlite_or_unknown_config_fallback(tmp_path, environment):
    with pytest.raises(ImproperlyConfigured):
        load_environment(tmp_path/'missing.env', environ=environment, testing=False)


def test_tests_and_explicit_evaluation_are_separate(tmp_path):
    config=tmp_path/'.env'; config.write_text('DB_ENGINE=postgresql\n')
    test_env={'DB_ENGINE':'sqlite'}
    assert load_environment(config,environ=test_env,testing=True)=='test'
    evaluation={'DB_ENGINE':'sqlite','SQLITE_NAME':'evaluation.sqlite3','INTELLILMS_SQLITE_EVALUATION':'1'}
    assert load_environment(config,environ=evaluation,testing=False)=='evaluation'


def test_identity_does_not_contain_user_or_password():
    identity=database_identity({'ENGINE':'django.db.backends.postgresql','HOST':'127.0.0.1','PORT':'5432','NAME':'working','USER':'secret-user','PASSWORD':'secret-password'})
    assert identity=='postgresql:127.0.0.1:5432/working'


def test_server_lock_blocks_other_process_and_releases_on_exit(tmp_path):
    code="from config.server_lock import server_lock; import sys\nwith server_lock(sys.argv[1], '8000'): pass"
    command=[sys.executable,'-c',code,str(tmp_path)]
    with server_lock(tmp_path,'8000'):
        result=subprocess.run(command,capture_output=True,text=True)
        assert result.returncode != 0
        with pytest.raises(OSError):
            with server_lock(tmp_path, '08000'): pass
        with server_lock(tmp_path,'8001'): pass
    assert subprocess.run(command,capture_output=True,text=True).returncode==0
    assert get_commands()['runserver']=='apps.accounts'


@override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend', EMAIL_USE_TLS=True, EMAIL_USE_SSL=False, EMAIL_HOST_USER='private-user', EMAIL_HOST_PASSWORD='private-password', EMAIL_TIMEOUT=10)
def test_smtp_probe_authenticates_but_cannot_send_or_query_database():
    output=StringIO()
    with patch.object(EmailBackend,'open',return_value=True) as opened, patch.object(EmailBackend,'close'), patch.object(EmailBackend,'send_messages') as sent:
        call_command('check_invitation_delivery',probe_smtp=True,stdout=output)
    opened.assert_called_once(); sent.assert_not_called()
    assert 'TLS/authentication succeeded' in output.getvalue()
    assert 'inbox delivery remain unverified' in output.getvalue()
    assert 'private-' not in output.getvalue()


@pytest.mark.parametrize('error,category',[(smtplib.SMTPAuthenticationError(535,b'private-provider-secret'),'authentication_rejected'),(TimeoutError('private-provider-secret'),'connection_timeout'),(ValueError('private-provider-secret'),'mail_configuration_or_backend_error'),(smtplib.SMTPDataError(550,b'private-provider-secret'),'smtp_rejected')])
@override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend', EMAIL_USE_TLS=True, EMAIL_USE_SSL=False, EMAIL_HOST_USER='private-user', EMAIL_HOST_PASSWORD='private-password', EMAIL_TIMEOUT=10)
def test_probe_failure_is_safe_and_never_sends(error, category):
    with patch.object(EmailBackend,'open',side_effect=error), patch.object(EmailBackend,'close'), patch.object(EmailBackend,'send_messages') as sent:
        with pytest.raises(CommandError) as result:
            call_command('check_invitation_delivery',probe_smtp=True,stdout=StringIO())
    assert category in str(result.value)
    assert 'private-' not in str(result.value)
    sent.assert_not_called()


@override_settings(EMAIL_BACKEND='django.core.mail.backends.console.EmailBackend')
def test_probe_refuses_non_smtp_without_sending():
    with pytest.raises(CommandError,match='requires the SMTP backend'):
        call_command('check_invitation_delivery',probe_smtp=True,stdout=StringIO())


@override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend', EMAIL_USE_TLS=False, EMAIL_USE_SSL=False)
def test_probe_refuses_cleartext_authentication():
    with patch.object(EmailBackend,'open') as opened:
        with pytest.raises(CommandError,match='TLS or SSL'):
            call_command('check_invitation_delivery',probe_smtp=True,stdout=StringIO())
    opened.assert_not_called()


def test_unavailable_database_has_no_fallback_or_email_attempt():
    with patch('apps.accounts.models.User.objects.filter', side_effect=OperationalError('private-connection-detail')), patch.object(EmailBackend, 'open') as opened:
        with pytest.raises(CommandError) as result:
            call_command('check_invitation_delivery', email='nobody@example.test', probe_smtp=True, stdout=StringIO())
    assert 'no fallback attempted' in str(result.value)
    assert 'private-' not in str(result.value)
    opened.assert_not_called()


def test_sqlite_cannot_serve_on_normal_application_port():
    from apps.accounts.management.commands.runserver import Command
    command = Command()
    command.port = '8000'
    simulated = SimpleNamespace(DATABASES={'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': 'evaluation.sqlite3'}})
    with patch('apps.accounts.management.commands.runserver.settings', simulated):
        with pytest.raises(CommandError, match='8000 is reserved'):
            command.inner_run()
