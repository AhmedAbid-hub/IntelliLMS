import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/** Compose rapid edits while router navigation is still committing. */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();
  const pending = useRef<URLSearchParams[]>([]);
  useEffect(() => {
    const committed = pending.current.findIndex(
      (item) => item.toString() === params.toString(),
    );
    // An intermediate navigation must not erase edits queued after it.
    // An unrelated URL (back/forward or a new link) becomes the new source.
    pending.current = committed < 0 ? [] : pending.current.slice(committed + 1);
  }, [params]);
  function update(key: string, value: string) {
    const next = new URLSearchParams(pending.current.at(-1) ?? params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    pending.current.push(next);
    setParams(next, { replace: true });
  }
  return [params, update] as const;
}
