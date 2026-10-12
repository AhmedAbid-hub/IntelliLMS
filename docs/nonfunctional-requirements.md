# Non-functional requirements

| Concern | Implemented | Verification boundary |
|---|---|---|
| Security | Server-enforced scope, session authentication, CSRF, private files | Negative automated tests; not a penetration-test certification |
| Correctness | Transactions, constraints, server deadlines, release rules | SQLite tests and browser workflows; PostgreSQL lock behavior unverified locally |
| Maintainability | Four domain apps, centralized scope, shared typed client, feature pages | Code formatted; further subdivision of workflow view modules is appropriate as features grow |
| Responsiveness | Desktop/mobile CSS, native labels, Radix dialogs, reduced-motion support | 1440px desktop and 390px mobile screenshots; no formal WCAG audit |
| Performance | SQL counts, pagination, feature page code splitting | No load benchmark; per-student analytics currently issue multiple queries |
| Reproducibility | Pinned Python dependencies, npm lockfile, fixed ML seeds, migrations | Local install/build/training verified; container images not built on this host |
| Availability | Optional ML, missing-data/model states, database persistence | No failover or disaster-recovery drill |
| Privacy | Minimal features, no protected characteristics, scoped reports | Retention/deletion procedure is documented, not an automated compliance system |
| Portability | Windows/macOS/Linux setup; Docker production example | This execution used Windows; Playwright launcher is PowerShell-specific |

Production readiness requires PostgreSQL tests, deployment rehearsal, capacity measurement, institution-approved retention/backup procedures and real SMTP/TLS configuration. No service-level availability or predictive accuracy guarantee is made.
