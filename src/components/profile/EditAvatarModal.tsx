"use client";

// Avatar picker for the account page. Two ways in:
//
//   "Upload"    pick/drop an image -> crop, zoom and rotate it -> save the
//               cropped square. This is the primary path.
//   "Image URL" paste a link to an already-hosted image. Kept from the
//               original version of this modal.
//
// Backend wiring note: `onUploadAvatar` receives a FormData with the cropped
// file under the key "avatar" and is expected to resolve to the image's public
// URL (i.e. upload to Supabase Storage, then PATCH that URL onto the Logto
// user). When the prop is omitted the modal still runs end to end and shows a
// local preview, clearly labelled as unsaved — that's what lets the UI be
// built and reviewed ahead of the storage work.

import { useRef, useState } from "react";
import { MdLink, MdUploadFile } from "react-icons/md";

import ModalShell from "@/components/applications/ModalShell";
import AvatarEditor, {
  type AvatarEditorHandle,
} from "@/components/profile/AvatarEditor";
import AvatarImage from "@/components/ui/AvatarImage";
import FileDropzone from "@/components/ui/FileDropzone";
import LRButton from "@/components/ui/LRButton";
import { AVATAR_FORM_FIELD, AVATAR_OUTPUT_TYPE } from "@/lib/avatar";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Default cap on the *picked* file. This is a UX guard on how much the browser
 * has to decode, not a backend constraint — whatever the user picks, we upload
 * a fixed-size cropped square. Override via the `maxFileBytes` prop.
 *
 * Worth knowing when wiring the backend: Supabase Storage allows 50MB per
 * bucket by default, but Next server actions cap request bodies at 1MB
 * (`serverActions.bodySizeLimit`) — and that applies to the cropped output.
 */
const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

type Tab = "upload" | "url";

type Props = {
  currentAvatar: string | null;
  /** Placeholder image used when there's no avatar yet, or one won't load. */
  fallbackSrc?: string | null;
  /** Last-resort fallback shown when no image is available. */
  initials: string;
  /** Largest accepted upload, in bytes. Defaults to 5MB. */
  maxFileBytes?: number;
  /**
   * Uploads the cropped image and resolves to its public URL. Omit while the
   * storage backend is unbuilt — the modal falls back to a local preview.
   */
  onUploadAvatar?: (formData: FormData) => Promise<string>;
  /** Saves a directly-pasted image URL. Omit to hide the "Image URL" tab. */
  onUpdateAvatarUrl?: (url: string) => Promise<void>;
  /** Fired with the new avatar URL once saved, so the page can update in place. */
  onSaved?: (url: string) => void;
  onClose: () => void;
};

export default function EditAvatarModal({
  currentAvatar,
  fallbackSrc,
  initials,
  maxFileBytes = DEFAULT_MAX_FILE_BYTES,
  onUploadAvatar,
  onUpdateAvatarUrl,
  onSaved,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** Set once a save succeeds; drives the confirmation step. */
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  /** True when the save was a local preview because no upload handler exists. */
  const [previewOnly, setPreviewOnly] = useState(false);

  // Upload tab
  const [file, setFile] = useState<File | null>(null);
  const editorRef = useRef<AvatarEditorHandle>(null);

  // URL tab
  const [url, setUrl] = useState(currentAvatar ?? "");

  function switchTab(next: Tab) {
    setTab(next);
    setError("");
  }

  async function handleSaveUpload() {
    setError("");
    setLoading(true);
    try {
      const blob = await editorRef.current?.getCroppedBlob();
      if (!blob) throw new Error("Could not read the cropped image. Try again.");

      if (!onUploadAvatar) {
        // No storage backend yet — show what would have been uploaded.
        setSavedUrl(await blobToDataUrl(blob));
        setPreviewOnly(true);
        return;
      }

      const formData = new FormData();
      formData.append(
        AVATAR_FORM_FIELD,
        new File([blob], "avatar.webp", { type: AVATAR_OUTPUT_TYPE }),
      );
      const nextUrl = await onUploadAvatar(formData);
      setSavedUrl(nextUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update avatar");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setError("");
    setLoading(true);
    try {
      if (!onUpdateAvatarUrl) {
        setSavedUrl(trimmed);
        setPreviewOnly(true);
        return;
      }
      await onUpdateAvatarUrl(trimmed);
      setSavedUrl(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update avatar");
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    if (savedUrl) onSaved?.(savedUrl);
    onClose();
  }

  return (
    <ModalShell title="Update avatar" onClose={onClose} maxWidth="max-w-md">
      {savedUrl ? (
        <div className="pt-6 text-center">
          <div className="mb-4 flex justify-center">
            <AvatarImage
              src={savedUrl}
              fallbackSrc={fallbackSrc}
              initials={initials}
              alt="Updated avatar"
              size={96}
            />
          </div>
          <p className="mb-5 text-sm text-gray-700">
            {previewOnly
              ? "Looks good. This is a local preview — it isn't saved to your account yet."
              : "Your avatar has been updated."}
          </p>
          <LRButton variant="secondary" onClick={finish}>
            Done
          </LRButton>
        </div>
      ) : (
        <div className="pt-5">
          <div
            role="tablist"
            aria-label="Avatar source"
            className="mb-5 flex gap-1 default-radius bg-gray-50 p-1"
          >
            <TabButton
              active={tab === "upload"}
              onClick={() => switchTab("upload")}
              icon={<MdUploadFile />}
              label="Upload"
            />
            <TabButton
              active={tab === "url"}
              onClick={() => switchTab("url")}
              icon={<MdLink />}
              label="Image URL"
            />
          </div>

          {tab === "upload" && (
            <>
              {file ? (
                <>
                  <AvatarEditor
                    ref={editorRef}
                    image={file}
                    outputType={AVATAR_OUTPUT_TYPE}
                    onLoadFailure={() =>
                      setError("That image could not be opened. Try another file.")
                    }
                  />
                  {error && <p className="mt-4 text-xs text-red-500">{error}</p>}
                  <div className="mt-5 flex gap-2">
                    <LRButton
                      variant="secondary-outline"
                      onClick={() => {
                        setFile(null);
                        setError("");
                      }}
                      disabled={loading}
                      className="flex-1"
                    >
                      Choose another
                    </LRButton>
                    <LRButton
                      variant="primary"
                      onClick={handleSaveUpload}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? "Saving…" : "Save avatar"}
                    </LRButton>
                  </div>
                </>
              ) : (
                <>
                  <FileDropzone
                    accept={ACCEPTED_TYPES}
                    maxBytes={maxFileBytes}
                    hint={`PNG, JPG, WEBP or GIF — up to ${Math.round(
                      maxFileBytes / (1024 * 1024),
                    )}MB`}
                    onError={setError}
                    onFile={(picked) => {
                      setError("");
                      setFile(picked);
                    }}
                  />
                  {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
                </>
              )}
            </>
          )}

          {tab === "url" && (
            <>
              <div className="mb-4 flex justify-center">
                <AvatarImage
                  src={url.trim()}
                  fallbackSrc={fallbackSrc}
                  initials={initials}
                  alt="Avatar preview"
                  size={80}
                />
              </div>

              <label
                htmlFor="avatar-url"
                className="mb-1 block text-xs text-gray-500"
              >
                Avatar URL
              </label>
              <input
                id="avatar-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleSaveUrl();
                }}
                autoFocus
                className="mb-1 w-full default-radius px-3 py-2 text-sm"
                placeholder="https://example.com/photo.jpg"
              />
              <p className="mb-4 text-xs text-gray-400">
                Paste a direct link to a publicly accessible image.
              </p>

              {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

              <LRButton
                variant="primary"
                onClick={handleSaveUrl}
                disabled={loading || !url.trim()}
                className="w-full"
              >
                {loading ? "Saving…" : "Save avatar"}
              </LRButton>
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 default-radius px-3 py-2 text-sm font-medium transition-colors duration-200 ${
        active
          ? "bg-white text-gray-800 shadow-sm"
          : "text-gray-400 hover:text-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the cropped image."));
    reader.readAsDataURL(blob);
  });
}
