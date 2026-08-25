"use client";

import { useEffect, useState } from "react";

const BACKENDS = ["rigetti-cepheus", "iqm-garnet", "iqm-emerald", "iqm-sirius"] as const;
const CYCLE_MS = 1800;

export default function WelcomeCodeAnimation() {
  const [backendIndex, setBackendIndex] = useState(0);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSwapping(true);
      const timeout = setTimeout(() => {
        setBackendIndex((i) => (i + 1) % BACKENDS.length);
        setSwapping(false);
      }, 220);
      return () => clearTimeout(timeout);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, []);

  const backend = BACKENDS[backendIndex];

  return (
    <div className="lr-window">
      <div className="lr-titlebar">
        <span className="lr-dot lr-dot-red" />
        <span className="lr-dot lr-dot-amber" />
        <span className="lr-dot lr-dot-green" />
        <span className="lr-filename">my_first_quantum_job.py</span>
      </div>

      <pre className="lr-body">
        <code>
          <span className="lr-line">
            <span className="lr-kw">import</span> requests
          </span>
          {"\n"}
          <span className="lr-line text-gray-300">...</span>
          {"\n"}
          <span className="lr-line">
            api_key = input(
            <span className="lr-str">
              &quot;Your Light Rider API key&quot;
            </span>
            )
          </span>
          {"\n"}
          <span className="lr-line">
            backend ={" "}
            <span
              className={`lr-str lr-backend ${swapping ? "lr-backend-out" : "lr-backend-in"}`}
            >
              &quot;{backend}&quot;
            </span>
          </span>
          {"\n"}
          <span className="lr-line">
            job = requests.post(url, json={"{"}
            <span className="lr-key">&quot;backend&quot;</span>: backend{"}"}
            ).json()
          </span>
        </code>
      </pre>

      <style jsx>{`
        .lr-window {
          width: 100%;
          max-width: 720px;
          border-radius: 10px;
          overflow: hidden;
          background: #0d1117;
          border: 1px solid #21262d;
          font-family:
            var(--font-mono), "SF Mono", "Fira Code", Menlo, Consolas, monospace;
        }
        .lr-titlebar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px;
          background: #161b22;
          border-bottom: 1px solid #21262d;
        }
        .lr-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }
        .lr-dot-red {
          background: #ff5f56;
        }
        .lr-dot-amber {
          background: #ffbd2e;
        }
        .lr-dot-green {
          background: #27c93f;
        }
        .lr-filename {
          margin-left: 8px;
          font-size: 14px;
          color: #8b949e;
        }
        .lr-body {
          margin: 0;
          padding: 24px 28px;
          font-size: 16px;
          line-height: 1.9;
          color: #c9d1d9;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .lr-line {
          display: inline-block;
        }
        .lr-kw {
          color: #ff7b72;
        }
        .lr-str {
          color: #a5d6ff;
        }
        .lr-key {
          color: #79c0ff;
        }
        .lr-backend {
          display: inline-block;
          transition:
            opacity 200ms ease,
            transform 200ms ease;
        }
        .lr-backend-in {
          opacity: 1;
          transform: translateY(0);
        }
        .lr-backend-out {
          opacity: 0;
          transform: translateY(3px);
        }

        @media (prefers-reduced-motion: reduce) {
          .lr-backend {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
