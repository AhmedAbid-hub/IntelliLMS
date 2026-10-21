"""Verify local handbook links/anchors and the resource page inventory; no database access."""
from collections import Counter
from pathlib import Path
import re
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def headings(text):
    ids = set(re.findall(r'<a\s+(?:name|id)=["\']([^"\']+)', text))
    counts = Counter()
    for heading in re.findall(r"^#{1,6}\s+(.+)$", text, re.M):
        heading = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", heading)
        slug = re.sub(r"[^\w\s-]", "", heading.strip().lower()).replace(" ", "-")
        number = counts[slug]
        counts[slug] += 1
        ids.add(slug + (f"-{number}" if number else ""))
    return ids


def verify():
    failures = []
    count = 0
    sources = sorted((ROOT / "docs").rglob("*.md")) + [
        ROOT / "README.md", ROOT / "IMPLEMENTATION_PROGRESS.md",
    ]
    cache = {}
    for source in sources:
        text = source.read_text(encoding="utf-8")
        # Fenced examples are not promises of existing links.
        text = re.sub(r"```.*?```", "", text, flags=re.S)
        for destination in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", text):
            destination = destination.strip().strip("<>")
            if re.match(r"^(?:https?://|mailto:|app:|codex:|data:)", destination):
                continue
            path, _, anchor = unquote(destination).partition("#")
            target = (source.parent / path).resolve() if path else source
            count += 1
            if not target.exists():
                failures.append(f"{source.relative_to(ROOT)}: missing {destination}")
            elif anchor and target.suffix.lower() == ".md":
                if target not in cache:
                    cache[target] = headings(target.read_text(encoding="utf-8"))
                if anchor not in cache[target]:
                    failures.append(f"{source.relative_to(ROOT)}: missing anchor {destination}")
    registry = (ROOT / "frontend/src/app/resourceRoutes.tsx").read_text(encoding="utf-8")
    entries = re.findall(r'"?([\w-]+)"?: lazy\(\(\) =>\s*import\("([^"]+)"\)', registry)
    config = (ROOT / "frontend/src/features/resources/config.ts").read_text(encoding="utf-8")
    configured = re.findall(r'^  "?([\w-]+)"?: \{', config[config.index("export const resources"):], re.M)
    if set(configured) != {key for key, _ in entries} or len(entries) != len(configured):
        failures.append("Resource registry does not exactly match configured resource keys.")
    for key, module in entries:
        target = (ROOT / "frontend/src/app" / module).resolve().with_suffix(".tsx")
        if not target.exists() or f'resource="{key}"' not in target.read_text(encoding="utf-8"):
            failures.append(f"Resource entry mismatch: {key}")
    router = (ROOT / "frontend/src/app/router.tsx").read_text(encoding="utf-8")
    paths = re.findall(r'path="([^"]+)"', router)
    count_routes = len(paths) + len(re.findall(r"<Route\s+index\b", router))
    if count_routes != 25:
        failures.append(f"Router inventory changed: expected 25 patterns, found {count_routes}. Update verified docs.")
    if failures:
        print("\n".join(failures))
        return 1
    print(f"Verified {count} local links/anchors, {len(entries)} named resource entries and {count_routes} router patterns.")
    return 0


if __name__ == "__main__":
    sys.exit(verify())
