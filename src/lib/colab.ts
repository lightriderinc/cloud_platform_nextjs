/**
 * Where the "Open in Colab" links point.
 *
 * Colab loads a notebook straight from GitHub, so the URL has to name a
 * branch. That branch used to be hardcoded to `main` in three separate
 * components, which meant a preview deployment linked at notebooks that only
 * existed on `main` — anyone testing a branch got a 404 on a notebook sitting
 * right there in the branch they were testing. It also meant a manual edit in
 * three files every time the target branch changed.
 *
 * Vercel sets VERCEL_GIT_COMMIT_REF per deployment: production builds carry
 * "main", preview builds carry their own branch. Deriving from it means the
 * link always matches the code it shipped with, with nothing to update at
 * merge time.
 *
 * THE NEXT_PUBLIC_ PREFIX IS load-bearing, not cosmetic. Every consumer is a
 * "use client" component, and Next.js only inlines NEXT_PUBLIC_* variables
 * into the browser bundle — "Non-NEXT_PUBLIC_ environment variables are only
 * available in the Node.js environment". A plain `VERCEL_GIT_COMMIT_REF` here
 * would read as `undefined` in the browser and fall through to "main" on
 * every deployment: correct in production by accident, silently wrong in
 * preview, and indistinguishable from working.
 *
 * Requires "Automatically expose System Environment Variables" to be enabled
 * on the Vercel project (it is on by default). Without it the variable is
 * absent and every deployment falls back to "main" — the old behaviour, so
 * the failure is a return to the status quo rather than a broken link.
 *
 * The fallback also covers local development, where no Vercel variable is set.
 */
const rawBranch =
  // Mapped in next.config.ts from VERCEL_GIT_COMMIT_REF. Preferred, because it
  // works whether or not the Vercel project exposes system env vars.
  process.env.NEXT_PUBLIC_COLAB_BRANCH ||
  // Vercel's own published variant, if the project exposes it.
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ||
  "";

// `||` rather than `??` throughout: an unset build variable inlines as an
// EMPTY STRING, not undefined, and "" would otherwise sail past a ?? check and
// produce `blob//docs/notebooks`.
export const COLAB_NOTEBOOK_BRANCH = rawBranch.trim() || "main";

/**
 * Deliberately not URL-encoded. A branch containing a slash
 * (`feature/thing`) has to stay a slash for GitHub to resolve the path;
 * percent-encoding it produces a 404.
 */
export const COLAB_NOTEBOOKS_BASE_URL = `https://colab.research.google.com/github/lightriderinc/cloud_platform_nextjs/blob/${COLAB_NOTEBOOK_BRANCH}/docs/notebooks`;

/** Full Colab URL for one notebook file, e.g. "quantum-quickstart.ipynb". */
export function colabNotebookUrl(notebook: string): string {
  return `${COLAB_NOTEBOOKS_BASE_URL}/${notebook}`;
}
