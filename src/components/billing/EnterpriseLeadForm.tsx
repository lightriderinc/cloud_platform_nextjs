"use client";

import { useState } from "react";

export default function EnterpriseLeadForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [form, setForm] = useState({
    email: "",
    company: "",
    useCase: "AI Workloads",
    deploymentType: "Dedicated",
    message: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/billing/enterprise-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="default-radius border border-gray-200 bg-gray-100 p-5 text-sm text-gray-700">
        Thanks — a member of our team will follow up shortly.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 default-radius border border-gray-200 bg-gray-100 p-5">
      <h2 className="text-lg font-bold text-gray-800">Custom pricing estimator</h2>
      <p className="text-sm text-gray-600">
        Share a few details and our team will provide a tailored solution.
      </p>

      <label className="text-sm text-gray-600">
        Work email
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-gray-600">
        Company
        <input
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm text-gray-600">
        Use case
        <select
          value={form.useCase}
          onChange={(e) => setForm({ ...form, useCase: e.target.value })}
          className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
        >
          <option>AI Workloads</option>
          <option>Cybersecurity</option>
          <option>Financial Services</option>
          <option>Research & Academia</option>
          <option>Government / Defense</option>
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Deployment type
        <select
          value={form.deploymentType}
          onChange={(e) => setForm({ ...form, deploymentType: e.target.value })}
          className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
        >
          <option>Dedicated</option>
          <option>On-prem</option>
          <option>Air-gapped</option>
          <option>Hybrid</option>
        </select>
      </label>

      <label className="text-sm text-gray-600">
        Anything else we should know?
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
          className="mt-1 w-full default-radius border border-gray-300 px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full default-radius bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Get Custom Pricing"}
      </button>
      {status === "error" && (
        <p className="text-xs text-red-600">
          Something went wrong — please try again.
        </p>
      )}
    </form>
  );
}
