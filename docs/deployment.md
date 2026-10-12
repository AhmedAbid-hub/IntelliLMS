# Deployment instructions

The production example uses PostgreSQL 17, Gunicorn, a compiled React build, Nginx TLS and persistent volumes. No paid service is required. **Docker Desktop is now available. PostgreSQL migrations and a disposable database restore rehearsal passed; see IMPLEMENTATION_PROGRESS.md for the latest full-suite/container smoke evidence.**

1. Copy `deployment/production.env.example` to `.env.production`. Replace every placeholder with a strong secret, real hostname and SMTP configuration. The frontend/backend must share one HTTPS origin.
2. Place valid TLS files at `deployment/tls/fullchain.pem` and `deployment/tls/privkey.pem`. The directory is ignored by Git. Keep the private key access-restricted and arrange renewal.
3. Build and initialize using the same environment file for Compose interpolation and Django:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d db
docker compose --env-file .env.production -f docker-compose.production.yml run --rm backend python manage.py migrate --noinput
docker compose --env-file .env.production -f docker-compose.production.yml run --rm backend python manage.py collectstatic --noinput
docker compose --env-file .env.production -f docker-compose.production.yml run --rm backend python manage.py createsuperuser
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Do not run `seed_demo` in production. Do not set DEBUG=True to work around deployment errors. Nginx alone publishes ports; PostgreSQL and Gunicorn stay on the private Compose network. Set a stable hostname in ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS. The health-check host localhost must remain allowed.

Run migrations once per release before shifting traffic. Review migration reversibility, back up the database and media, and rehearse restoration. Update pinned container image digests for controlled releases after compatibility testing. Current tags are examples, not immutable image pins.

## Backups

From a POSIX shell, with the example database/user names:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T db pg_dump -U intellilms -d intellilms -Fc > intellilms-backup.dump
# Restore into a separately provisioned database, never blindly over live data:
docker compose --env-file .env.production -f docker-compose.production.yml exec -T db pg_restore -U intellilms -d restore_database --no-owner < intellilms-backup.dump
```

On Windows avoid legacy PowerShell binary redirection for custom-format dumps; use a binary-safe process or export into the container and `docker cp` the file. Back up the private media and trusted model volumes separately. Encrypt and restrict backup storage; verify restores on an isolated deployment.

Configure a host scheduler to run `python manage.py notify_deadlines` at an institute-approved cadence. The command is idempotent per assignment deadline and user. Scheduling is not automatically installed. Session expiration cleanup (`clearsessions`) and orphaned upload cleanup also need operational scheduling/review.

Before real use, execute CI/PostgreSQL tests, concurrent submission/attempt tests, SMTP delivery checks, TLS/session checks, backup restore drills, security review and load tests. See limitations.md.


## Readiness and shared authentication throttling

`/health/` checks that the process responds; `/ready/` checks database connectivity and returns a generic 503 if unavailable. Compose uses readiness and starts the web service only when the backend is healthy. Run migrations before starting web traffic; readiness does not assert schema currency.

Nginx uses an IP-based shared-memory authentication limit (10 requests/minute, burst 5, HTTP 429) for login, password reset/confirmation and Django admin login. This operates across Nginx workers. Tune for institutional NAT traffic after load testing; multiple proxy replicas need a distributed limiting design. Do not expose Gunicorn directly. The supplied proxy treats its socket peer as the client; trusted load balancers require an explicit reviewed real-IP configuration. Nginx syntax, TLS/readiness, anonymous API denial and shared edge HTTP 429 behavior passed in the local production container smoke on 11 October 2026.


## Isolated production smoke check

Run `python scripts/verify-containers.py` using the project virtual environment. Requires Docker Compose and OpenSSL; Git for Windows OpenSSL is detected automatically. It builds the production images, migrates a disposable PostgreSQL database, collects static files, starts Gunicorn/Nginx under DEBUG=False and tests TLS, database readiness, the compiled SPA, anonymous API denial and edge 429 responses. It creates temporary test secrets and a one-day self-signed certificate without reading or replacing `.env.production`. Ports bind only to 127.0.0.1:18080 and :18443.

The helper refuses to reuse existing containers/volumes bearing its `intellilms-disposable-smoke` project label, and removes its own services/volumes after success or failure. Built images remain cached. Compose now supports `RUNTIME_ENV_FILE`, `TLS_DIRECTORY`, `HTTP_BIND` and `HTTPS_BIND` overrides for isolated validation; default production behavior remains unchanged. A self-signed local smoke certificate does not verify real-domain certificate issuance or renewal.


Verified locally on 11 October 2026: production images built, migrations and 163 static files collected, all three services healthy, Nginx configuration valid, TLS SPA/readiness 200, protected anonymous grades 403 and login edge throttle 429. A separate PostgreSQL test container passed 66 tests and a pg_dump/pg_restore rehearsal. These are isolated local results; real SMTP, domain TLS renewal and media/off-host disaster recovery remain operational work.


Email failure recovery: `EMAIL_TIMEOUT` defaults to 10 seconds (override through the environment). Account creation commits before invitation delivery. Check `apps.accounts.auth` delivery-failure logs and repair SMTP configuration; affected users can request another link through Forgot password. Delivery is synchronous and there is no durable outbox/retry worker; a large import through a slow provider can take time. Real inbox delivery remains deployment acceptance work. The E2E settings force a local file email backend under ignored `backend/test-results/e2e-mail` and never use operator SMTP credentials.
