"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function RecommendPage() {
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedPrompt(prompt);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Decide</p>
        <h1 className="mt-2 text-3xl font-bold">
          What should I play right now?
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Describe your current mood, available time, energy level, and what
          kind of experience you want. Later, AI will extract structured intent
          from this message.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Describe your current context
          </label>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: I'm tired, I only have 45 minutes, and I want something relaxing."
            className="min-h-36 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500"
            required
          />

          <Button>Continue</Button>
        </form>
      </Card>

      {submittedPrompt && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Captured input</p>
              <h2 className="mt-2 text-xl font-semibold">
                User context received
              </h2>
            </div>

            <Badge>AI extraction later</Badge>
          </div>

          <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-300">
            “{submittedPrompt}”
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Mood",
              "Available time",
              "Energy level",
              "Desired experience",
              "Difficulty preference",
              "Reference games",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <p className="text-sm text-slate-400">{item}</p>
                <p className="mt-1 text-sm text-slate-500">
                  To be extracted by AI
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}