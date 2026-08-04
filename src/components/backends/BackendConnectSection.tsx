"use client";

import { handleSignIn } from "@/app/actions/auth";
import LRButton from "@/components/ui/LRButton";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { MdCheck, MdContentCopy, MdOpenInNew } from "react-icons/md";

const COLAB_URL =
  "https://colab.research.google.com/github/lightriderinc/cloud_platform_nextjs/blob/main/docs/notebooks/quantum-quickstart.ipynb";

function pythonSnippet(backendId: string): string {
  return `import requests

api_key = input("Enter your Light Rider API key: ")
base_url = "https://platform.lightriderinc.com"

circuit = {
    "num_qubits": 2,
    "instructions": [
        {"name": "h", "qubits": [0]},
        {"name": "cx", "qubits": [0, 1]},
        {"name": "measure", "qubits": [0], "clbits": [0]},
        {"name": "measure", "qubits": [1], "clbits": [1]},
    ],
}

response = requests.post(
    f"{base_url}/api/lr/quantum/submit",
    headers={"Authorization": f"Bearer {api_key}"},
    json={"backend": "${backendId}", "circuit": circuit, "shots": 1000},
)
response.raise_for_status()
job = response.json()
print("Job submitted:", job["job_uuid"])
`;
}

async function fetchHasApiKey(): Promise<boolean> {
  const res = await fetch("/api/settings/tokens");
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.apiKey;
}

export default function BackendConnectSection({
  backend,
  isAuthenticated,
  onSubmitJob,
}: {
  backend: Backend;
  isAuthenticated: boolean;
  onSubmitJob?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const quantumBackendId = getQuantumBackendId(backend.id);

  const { data: hasApiKey, isLoading } = useQuery({
    queryKey: ["settings", "has-api-key"],
    queryFn: fetchHasApiKey,
    enabled: isAuthenticated && backend.type === "QPU" && !!quantumBackendId,
  });

  if (!isAuthenticated) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        <button
          type="button"
          onClick={() => handleSignIn()}
          className="brand-link cursor-pointer"
        >
          Log in
        </button>{" "}
        to access backends.
      </p>
    );
  }

  if (backend.type !== "QPU") {
    return (
      <>
        <p className="mt-3 mb-6 text-sm text-gray-600">
          Simulators run without an API key — see the{" "}
          <a
            href="https://docs.lightriderinc.com/sdk/getting-started.html"
            target="_blank"
            rel="noopener noreferrer"
            className="brand-link"
          >
            SDK docs
          </a>
          .
        </p>
        <div className="flex flex-row gap-3">
          <a
            href={COLAB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 default-radius border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Google Colab quickstart <MdOpenInNew className="text-base" />
          </a>
          {onSubmitJob && (
            <LRButton variant="primary" onClick={onSubmitJob}>
              Submit a sample circuit
            </LRButton>
          )}
        </div>
      </>
    );
  }

  if (!quantumBackendId) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        This backend isn&apos;t available for direct API submission yet.
      </p>
    );
  }

  if (isLoading) {
    return null;
  }

  const snippet = pythonSnippet(quantumBackendId);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        Submit jobs to this backend using your Light Rider API key.
      </p>

      {!hasApiKey ? (
        <div className="default-radius bg-gray-50 p-4">
          <p className="mb-3 text-sm text-gray-700">
            Generate your API key first.
          </p>
          <Link
            href="/settings/keys"
            className="inline-block default-radius px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Get your API key
          </Link>
        </div>
      ) : (
        <>
          <div className="relative mb-6">
            <pre className="default-radius bg-gray-800 p-4 pr-24 overflow-x-auto">
              <code className="whitespace-pre font-mono text-xs leading-relaxed text-gray-100">
                {snippet}
              </code>
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-3 top-3 flex shrink-0 items-center gap-1.5 default-radius border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-200 transition-colors hover:bg-gray-700"
            >
              {copied ? (
                <MdCheck className="text-green-400" />
              ) : (
                <MdContentCopy />
              )}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <div className="flex flex-row gap-3">
            <a
              href={COLAB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 default-radius border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Google Colab quickstart <MdOpenInNew className="text-base" />
            </a>
            {onSubmitJob && (
              <LRButton variant="primary" onClick={onSubmitJob}>
                Submit a sample circuit
              </LRButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}
