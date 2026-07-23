'use client';

import Image from 'next/image';
import { useState } from 'react';

type Props = {
  currentAvatar: string | null;
  initials: string;
  onUpdateAvatar: (url: string) => Promise<void>;
  onClose: () => void;
};

export default function EditAvatarModal({ currentAvatar, initials, onUpdateAvatar, onClose }: Props) {
  const [url, setUrl] = useState(currentAvatar ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      await onUpdateAvatar(url.trim());
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update avatar');
    } finally {
      setLoading(false);
    }
  }

  const preview = url.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm bg-white default-radius border border-gray-200 p-6 shadow-lg animate-scale-in mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="text-lg font-semibold text-gray-800 mb-4">Update Avatar</h2>

        {done ? (
          <div className="text-center pt-2">
            <p className="text-sm text-gray-700 mb-4">Avatar updated. Refresh to see it.</p>
            <button onClick={onClose} className="default-radius px-4 py-2 text-sm font-semibold btn-outline-brand cursor-pointer">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Preview */}
            <div className="flex justify-center mb-4">
              <div className="relative w-20 h-20 default-radius overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
                {preview ? (
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                    onError={() => setError('Could not load image from that URL')}
                  />
                ) : (
                  <span className="text-2xl font-semibold text-gray-500">{initials}</span>
                )}
              </div>
            </div>

            <label className="block text-xs text-gray-500 mb-1">Avatar URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-1"
              placeholder="https://example.com/photo.jpg"
            />
            <p className="text-xs text-gray-400 mb-4">Paste a direct link to a publicly accessible image.</p>

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleSave}
              disabled={loading || !preview}
              className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
              style={{ backgroundColor: loading || !preview ? '#aaa' : 'var(--brand-primary)' }}
            >
              {loading ? 'Saving…' : 'Save Avatar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
