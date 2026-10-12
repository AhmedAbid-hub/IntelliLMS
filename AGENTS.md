# IntelliLMS engineering guidance

Modular Django 5.2/DRF backend, React/TypeScript SPA, PostgreSQL deployment. Domain models live in accounts, academics, learning, and insights. Session authentication only; never put credentials in browser storage.

Every API must derive an active institute from the authenticated session. Scope before retrieving objects. Validate every related object against tenant and course permissions. Students see only enrolled offerings and their own released grades. Department heads stay within their unit; teachers stay within assigned offerings. Never allow role or tenant changes through ordinary serializers.

Run backend checks and pytest after backend changes; run frontend typecheck, Vitest and build after frontend changes. Include negative permission tests. Keep migrations committed. Use SQLite only for explicitly selected local smoke tests; deployment uses PostgreSQL. Do not claim tests that were not run.

See README.md for commands. Update IMPLEMENTATION_PROGRESS.md and docs/limitations.md after each milestone. Keep synthetic predictions labeled; no model is a validated decision system. No arbitrary pickle uploads. Keep files private and downloads authorized. Do not overwrite unrelated work.
