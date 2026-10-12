# Security and privacy design

Sessions use Django's password hashing and authentication. Production cookies are Secure and session cookies are HTTP-only/SameSite=Lax. Login, password-reset and confirmation explicitly enforce CSRF even for anonymous callers; authenticated DRF session mutations enforce CSRF. The frontend follows [Django's CSRF header/cookie guidance](https://docs.djangoproject.com/en/5.2/howto/csrf/). Credentials are not stored in localStorage.

Active membership and institute checks run on every scoped API request. Object retrieval starts from authorized querysets. Related institute ownership is checked in serializers, and relationships cannot be moved after creation. Student submissions always use request.user; answer/grade/status fields are controlled by workflow actions. UUIDs are identifiers, not authorization secrets.

Private files are outside static assets. Uploads are capped at 10 MB and restricted to PDF/TXT/PNG/JPEG/DOCX with extension, declared MIME and available magic-header checks. Files are downloaded as attachments after authorization. This is not antivirus scanning or full document validation. Nginx limits request bodies and has no public media location.

Sensitive changes are logged with actor, tenant, object and action. Assignment grading includes previous marks and release state; manual grade updates record previous/current marks. Ordinary audit entries do not capture full before/after content. No passwords or session tokens are placed in audit records. Console email is development-only and intentionally prints password-setup links as an email transport.

Login/reset endpoints have a basic process-local throttle. A multi-worker deployment needs an edge/shared rate limiter for robust abuse protection. Production defaults reject missing secrets, disable DEBUG, redirect HTTPS and enable secure cookies/HSTS. The reverse proxy must exclusively control X-Forwarded-Proto; do not expose the backend port publicly.

## Retention and deletion procedure

No arbitrary legal retention period is imposed. Each institute must approve retention periods for coursework, grades, audit and uploads before real use. Deactivate memberships or archive offerings when access ends. Export records when authorized; inspect protected foreign-key references before removing accounts. Delete expired records and their media only through a reviewed institute-scoped maintenance procedure, back up first, and record the action. File cleanup is not yet automated; replacing/deleting a record can leave an orphaned private file. Backups require the same retention/access treatment as live data.

Platform operators can access the shared database; there is no database row-level security, encryption-at-rest implementation, or automatic privacy-request workflow in this repository. Never use this demo as proof of regulatory compliance. The security test suite covers explicit negative cases, not every threat or production configuration.
