"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button, Field, inputClass } from "@/components/ui";
import { useProjectPacket } from "@/src/store";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useProjectPacket();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:py-10">
        <section className="hidden rounded-md bg-ink p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark tone="inverse" />
            <span className="font-semibold">ProjectPacket</span>
          </Link>
          <div>
            <p className="text-sm font-medium text-white/50">Client asset collection</p>
            <h1 className="mt-4 max-w-md text-3xl font-semibold leading-tight">
              Keep every client file, note, link, and approval in one packet.
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              Log in to create packets, review submissions, request changes, and keep project handoffs organized.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <span className="font-semibold">ProjectPacket</span>
            </Link>
            <p className="text-sm font-medium text-ink/50">Sign in</p>
            <h1 className="mt-3 text-2xl font-semibold">Welcome back</h1>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              Log in with your email and password.
            </p>
            <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
              <Field label="Email">
                <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </Field>
              <Field label="Password">
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Login"}
              </Button>
            </form>
            <p className="mt-6 text-sm text-ink/60">
              New here?{" "}
              <Link className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-teal" href="/signup">
                Start free
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
