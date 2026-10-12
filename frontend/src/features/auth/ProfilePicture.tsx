import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { useAuth } from "./Auth";
import { api } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/shared";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function ProfilePicture() {
  const { user, refresh } = useAuth();

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState("");

  const hasPicture = Boolean(user?.avatar_url);

  const displayName =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.username ||
    "User";

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function clearSelection() {
    setFile(undefined);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = event.target.files?.[0];

    setError(undefined);
    setStatus("");

    if (!selected) {
      clearSelection();
      return;
    }

    if (!ALLOWED_TYPES.includes(selected.type)) {
      clearSelection();

      setError(
        new Error(
          "Please select a JPEG, PNG, or WebP image.",
        ),
      );

      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      clearSelection();

      setError(
        new Error(
          "The image must be smaller than 4 MB.",
        ),
      );

      return;
    }

    setFile(selected);
  }

  async function save(remove = false) {
    if (busy) return;

    if (!remove && !file) return;

    setBusy(true);
    setError(undefined);
    setStatus("");

    try {
      if (remove) {
        await api("auth/avatar/", {
          method: "DELETE",
        });
      } else {
        const body = new FormData();

        body.append("image", file!);

        await api("auth/avatar/", {
          method: "PUT",
          body,
        });
      }

      await refresh();

      clearSelection();

      setStatus(
        remove
          ? "Your profile picture has been removed."
          : "Your profile picture has been updated.",
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="panel padded"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 700,
          }}
        >
          Profile picture
        </h2>

        <p
          className="muted"
          style={{
            marginTop: 7,
            marginBottom: 0,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Personalize your account with a profile photo.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 112,
            height: 112,
            flexShrink: 0,
            borderRadius: "50%",
            border: "4px solid #edf5ef",
            background: "#e3f0e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Selected profile picture preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "50%",
              }}
            />
          ) : (
            <Avatar
              large
              src={user?.avatar_url}
              name={displayName}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            minWidth: 0,
            flex: 1,
          }}
        >
          <strong
            style={{
              fontSize: 16,
              overflowWrap: "anywhere",
            }}
          >
            {displayName}
          </strong>

          <span
            className="muted"
            style={{
              fontSize: 13,
            }}
          >
            {preview
              ? "New photo selected"
              : hasPicture
                ? "Profile photo active"
                : "No profile photo uploaded"}
          </span>

          {preview && (
            <span
              style={{
                color: "#176447",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <CheckCircle2 size={14} />
              Ready to upload
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          border: "1px solid #e0eae2",
          borderRadius: 12,
          background: "#f8fbf8",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <Camera
            size={18}
            style={{
              flexShrink: 0,
              marginTop: 2,
              color: "#26704e",
            }}
            aria-hidden="true"
          />

          <div>
            <strong
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 5,
              }}
            >
              Photo requirements
            </strong>

            <p
              className="muted"
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              JPEG, PNG, or WebP format. Maximum 4 MB and
              4 million pixels. Images are cropped to a
              square, and metadata is removed.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Choose a photo
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={busy}
          aria-label="Select profile picture"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={16} />
            Choose picture
          </Button>

          <span
            className="muted"
            style={{
              fontSize: 12,
              overflowWrap: "anywhere",
              flex: 1,
              minWidth: 120,
            }}
          >
            {file
              ? file.name
              : "No new picture selected"}
          </span>
        </div>

        {file && (
          <button
            type="button"
            disabled={busy}
            onClick={clearSelection}
            style={{
              alignSelf: "flex-start",
              padding: 0,
              border: 0,
              background: "transparent",
              color: "#64766c",
              fontSize: 12,
              textDecoration: "underline",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Cancel selection
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Button
          type="button"
          disabled={busy || !file}
          onClick={() => void save()}
        >
          {busy && file ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Upload size={16} />
          )}

          {busy && file
            ? "Uploading..."
            : "Upload picture"}
        </Button>

        {hasPicture && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void save(true)}
          >
            <Trash2 size={15} />
            Remove picture
          </Button>
        )}
      </div>

      {busy && (
        <p
          role="status"
          aria-live="polite"
          style={{
            margin: 0,
            fontSize: 13,
          }}
        >
          Updating your profile picture…
        </p>
      )}

      {status && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "11px 13px",
            borderRadius: 9,
            background: "#edf8f0",
            color: "#176447",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={17} />
          {status}
        </div>
      )}

      {!!error && <ErrorState error={error} />}

      <p
        className="muted"
        style={{
          marginTop: "auto",
          marginBottom: 0,
          paddingTop: 14,
          borderTop: "1px solid #edf1ed",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        Your picture is visible to you and authorized
        institute roster viewers.
      </p>
    </section>
  );
}