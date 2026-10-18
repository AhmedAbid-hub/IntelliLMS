
import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import {
  api,
  label as recordLabel,
  type Page,
  type RecordData,
} from "../lib/api";

type RelationSelectProps = {
  source: string;
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  required?: boolean;
  inputRef?: Ref<HTMLSelectElement>;
  onBlur?: () => void;
  selectedLabel?: string;
  emptyLabel?: string;
  compact?: boolean;
  valueKey?: "id" | "user";
};

export function RelationSelect({
  source,
  label,
  value,
  onChange,
  multiple = false,
  required = false,
  inputRef,
  onBlur,
  selectedLabel,
  emptyLabel,
  compact = false,
  valueKey,
}: RelationSelectProps) {
  const id = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pinned, setPinned] = useState<Record<string, string>>({});

  const questionMark = source.indexOf("?");
  const resource =
    questionMark === -1 ? source : source.slice(0, questionMark);
  const filter =
    questionMark === -1 ? "" : source.slice(questionMark + 1);

  const key =
    valueKey || (resource === "memberships" ? "user" : "id");

  const selected = Array.isArray(value)
    ? value.map(String)
    : value
      ? [String(value)]
      : [];

  const selectedKey = JSON.stringify(selected);

  const query = useQuery({
    queryKey: ["relation-options", source, page, search],
    queryFn: () => {
      const params = new URLSearchParams(filter);

      params.set("page", String(page));

      if (search.trim()) {
        params.set("search", search.trim());
      }

      return api<Page<RecordData>>(
        `${resource}/?${params.toString()}`
      );
    },
    enabled: open || selected.length > 0,
    gcTime: 30000,
  });

  const results = query.data?.results || [];

  const options = results.map((row) => ({
    id: String(row[key]),
    name: recordLabel(row),
  }));

  useEffect(() => {
    const ids: string[] = JSON.parse(selectedKey);

    setPinned((previous) => {
      const next = { ...previous };
      let changed = false;

      for (const selectedId of ids) {
        const matchingRow = results.find(
          (row) => String(row[key]) === selectedId
        );

        const name = matchingRow
          ? recordLabel(matchingRow)
          : previous[selectedId] || selectedLabel || selectedId;

        if (next[selectedId] !== name) {
          next[selectedId] = name;
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [selectedKey, query.data, key, selectedLabel]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node) &&
        !popoverRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, [open, onBlur]);

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const dialog = rootRef.current?.closest<HTMLElement>('[role="dialog"]');
      const bounds = dialog?.getBoundingClientRect();
      // Stay inside the modal's focus/pointer boundary and visible scroll area.
      const topEdge = Math.max(0, bounds?.top ?? 0);
      const bottomEdge = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight);
      const leftEdge = Math.max(0, bounds?.left ?? 0);
      const rightEdge = Math.min(window.innerWidth, bounds?.right ?? window.innerWidth);
      const gap = 6;
      const availableBelow = bottomEdge - rect.bottom - gap - 8;
      const availableAbove = rect.top - topEdge - gap - 8;
      const placeAbove = availableBelow < 260 && availableAbove > availableBelow;
      const maxHeight = Math.max(0, Math.min(380, placeAbove ? availableAbove : availableBelow));
      const width = Math.min(rect.width, rightEdge - leftEdge - 16);
      const left = Math.max(leftEdge + 8, Math.min(rect.left, rightEdge - width - 8));
      const top = placeAbove ? rect.top - gap : rect.bottom + gap;
      setPopoverStyle({
        position: dialog ? "absolute" : "fixed",
        left: left - (bounds?.left ?? 0) + (dialog?.scrollLeft ?? 0) - (dialog?.clientLeft ?? 0),
        top: top - (bounds?.top ?? 0) + (dialog?.scrollTop ?? 0) - (dialog?.clientTop ?? 0),
        width,
        transform: placeAbove ? "translateY(-100%)" : undefined,
        maxHeight,
        overflowY: "auto",
        zIndex: 10000,
      });
    };

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [page, search]);

  const selectedNames = selected.map(
    (selectedId) =>
      options.find((item) => item.id === selectedId)?.name ||
      pinned[selectedId] ||
      selectedLabel ||
      selectedId
  );

  const displayValue = multiple
    ? selected.length
      ? `${selected.length} selected`
      : emptyLabel || `Choose ${label.toLowerCase()}`
    : selectedNames[0] ||
      emptyLabel ||
      `Choose ${label.toLowerCase()}`;

  function closeDropdown(restoreFocus = false) {
    setOpen(false);
    onBlur?.();

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function choose(selectedId: string) {
    const chosen = options.find(option => option.id === selectedId);
    if (chosen) setPinned(current => ({...current, [selectedId]: chosen.name}));
    if (multiple) {
      const next = selected.includes(selectedId)
        ? selected.filter((item) => item !== selectedId)
        : [...selected, selectedId];

      onChange(next);
    } else {
      onChange(selectedId);
      setOpen(false);
      setSearch("");
      setPage(1);
      onBlur?.();
      triggerRef.current?.focus();
    }
  }

  function remove(selectedId: string) {
    if (multiple) {
      onChange(selected.filter((item) => item !== selectedId));
    } else {
      onChange("");
    }
  }

  function handleKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeDropdown(true);
      }
      return;
    }

    if (!open) {
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        Math.min(index + 1, Math.max(options.length - 1, 0))
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === "Enter" && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex].id);
    }
  }

  return (
    <div
      className={`relation-select relation-select-modern ${
        compact ? "relation-select-compact" : ""
      }`}
      ref={rootRef}
    >
      {/* Field label: text and required mark stay together */}
      <label
        className="relation-modern-label"
        id={`${id}-label`}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          flexWrap: "nowrap",
          gap: "4px",
          width: "100%",
          minHeight: "20px",
          height: "20px",
          margin: "0 0 8px",
          padding: 0,
          lineHeight: "20px",
          whiteSpace: "nowrap",
        }}
      >
        <span
          className="relation-label-text"
          style={{
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "nowrap",
            gap: "4px",
            width: "auto",
            lineHeight: "20px",
            whiteSpace: "nowrap",
          }}
        >
          {label}

          {required && (
            <span
              className="relation-required-mark"
              aria-hidden="true"
              style={{
                display: "inline",
                width: "auto",
                height: "auto",
                margin: 0,
                padding: 0,
                lineHeight: "inherit",
              }}
            >
              *
            </span>
          )}
        </span>
      </label>

      {/* Native select retained for form refs and form values */}
      <select
        ref={(node) => {
          nativeRef.current = node;

          if (typeof inputRef === "function") {
            inputRef(node);
          } else if (inputRef) {
            (
              inputRef as React.MutableRefObject<
                HTMLSelectElement | null
              >
            ).current = node;
          }
        }}
        className="relation-native-select"
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        multiple={multiple}
        value={multiple ? selected : selected[0] || ""}
        onChange={(event) => {
          if (multiple) {
            onChange(
              Array.from(
                event.target.selectedOptions,
                (option) => option.value
              )
            );
          } else {
            onChange(event.target.value);
          }
        }}
      >
        {!multiple && <option value="">Select</option>}

        {selected.map((selectedId) => (
          <option key={selectedId} value={selectedId}>
            {pinned[selectedId] || selectedId}
          </option>
        ))}
      </select>

      {/* Visible searchable dropdown */}
      <button
        ref={triggerRef}
        type="button"
        className={`relation-modern-trigger ${
          open ? "is-open" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-labelledby={`${id}-label`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyboard}
        style={{
          marginTop: 0,
          width: "100%",
        }}
      >
        <span
          className={
            selected.length
              ? "relation-modern-value"
              : "relation-modern-placeholder"
          }
        >
          {displayValue}
        </span>

        <ChevronDown
          size={18}
          className={open ? "relation-chevron-open" : ""}
          aria-hidden="true"
        />
      </button>

      {/* Selected items for multi-select fields */}
      {multiple && selected.length > 0 && (
        <div className="relation-modern-chips">
          {selected.map((selectedId, index) => (
            <span
              className="relation-modern-chip"
              key={selectedId}
            >
              <span>{selectedNames[index]}</span>

              <button
                type="button"
                aria-label={`Remove ${selectedNames[index]}`}
                onClick={() => remove(selectedId)}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown menu */}
      {open && createPortal(
        <div ref={popoverRef} className="relation-modern-popover" style={popoverStyle}>
          <div className="relation-modern-search">
            <Search size={17} aria-hidden="true" />

            <input
              ref={searchRef}
              type="search"
              value={search}
              placeholder={`Search ${label.toLowerCase()}...`}
              aria-label={`Search ${label}`}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              onKeyDown={handleKeyboard}
            />
          </div>

          <div
            className="relation-modern-options"
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple || undefined}
          >
            {query.isPending ||
            (query.isFetching && !query.data) ? (
              <div className="relation-modern-message">
                <Loader2
                  size={18}
                  className="relation-modern-spinner"
                  aria-hidden="true"
                />
                Loading options...
              </div>
            ) : query.isError ? (
              <div
                className="relation-modern-message"
                role="alert"
              >
                Could not load options. Please try again.
              </div>
            ) : options.length === 0 ? (
              <div className="relation-modern-message">
                No matching records found.
              </div>
            ) : (
              options.map((option, index) => {
                const checked = selected.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={`relation-modern-option ${
                      checked ? "selected" : ""
                    } ${
                      activeIndex === index
                        ? "highlighted"
                        : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(option.id)}
                  >
                    <span>{option.name}</span>

                    {checked && (
                      <Check
                        size={17}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination for large datasets */}
          {(query.data?.next || page > 1) && (
            <div className="relation-modern-pagination">
              <button
                type="button"
                disabled={page <= 1 || query.isFetching}
                onClick={() =>
                  setPage((current) =>
                    Math.max(1, current - 1)
                  )
                }
                aria-label={`Previous ${label} page`}
              >
                <ChevronLeft size={16} />
              </button>

              <span>
                Page {page}
                {query.data?.count !== undefined
                  ? ` · ${query.data.count} results`
                  : ""}
              </span>

              <button
                type="button"
                disabled={!query.data?.next || query.isFetching}
                onClick={() =>
                  setPage((current) => current + 1)
                }
                aria-label={`Next ${label} page`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {!multiple && selected.length > 0 && !required && (
            <button type="button" className="text-link" onClick={() => { onChange(""); closeDropdown(true); }}>
              Clear {label}
            </button>
          )}
          {/* Multi-select confirmation */}
          {multiple && (
            <div className="relation-modern-bottom">
              <span>{selected.length} selected</span>

              <button
                type="button"
                onClick={() => closeDropdown(true)}
              >
                Done
              </button>
            </div>
          )}
        </div>,
        rootRef.current?.closest('[role="dialog"]') ?? document.body
      )}
    </div>
  );
}
