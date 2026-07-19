"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button, Field, inputClass } from "@/components/ui";
import { useProjectPacket } from "@/src/store";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, verifyEmailCode, resendSignupCode } = useProjectPacket();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCodeStep, setIsCodeStep] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      if (isCodeStep) {
        await verifyEmailCode(email, code);
        router.push("/dashboard");
        return;
      }

      const result = await signUp({ name, email, password, businessName });

      if (!result.needsCodeVerification) {
        router.push("/dashboard");
        return;
      }

      setIsCodeStep(true);
      setNotice("We sent a signup code to your email. Paste it here to finish.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not finish signup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setNotice("");
    setIsResending(true);

    try {
      await resendSignupCode(email);
      setNotice("Sent a fresh signup code. Check spam if it still does not show up.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not resend the code.");
    } finally {
      setIsResending(false);
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
            <p className="text-sm font-medium text-white/50">Workspace setup</p>
            <h1 className="mt-4 max-w-md text-3xl font-semibold leading-tight">
              Start with one client packet, then reuse the checklist.
            </h1>
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10 text-sm text-white/60">
              {["Create a project", "Send one client link", "Track missing files and approvals"].map((item) => (
                <p key={item} className="py-3">{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center py-10">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden">
              <BrandMark />
              <span className="font-semibold">ProjectPacket</span>
            </Link>
            <p className="text-sm font-medium text-ink/50">Create workspace</p>
            <h1 className="mt-3 text-2xl font-semibold">{isCodeStep ? "Enter your code" : "Start free"}</h1>
            <p className="mt-2 text-sm leading-6 text-ink/60">
              {isCodeStep
                ? `Check ${email || "your email"} for the signup code. You will use your password next time you log in.`
                : "Create a real ProjectPacket account. You will use this password to log in later."}
            </p>
            <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
              {isCodeStep ? (
                <Field label="Email code">
                  <input
                    className={inputClass}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </Field>
              ) : (
                <>
                  <Field label="Your name">
                    <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Maya Chen" required />
                  </Field>
                  <Field label="Email">
                    <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
                  </Field>
                  <Field label="Password">
                    <input
                      className={inputClass}
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 6 characters"
                      minLength={6}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  <Field label="Business name">
                    <input className={inputClass} value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Northstar Studio" required />
                  </Field>
                </>
              )}
              {notice ? <p className="rounded-md border border-teal/20 bg-mint px-3 py-2 text-sm font-semibold text-teal">{notice}</p> : null}
              {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Working..." : isCodeStep ? "Verify code" : "Create account"}
              </Button>
              {isCodeStep ? (
                <div className="grid gap-2 text-sm">
                  <button
                    type="button"
                    className="text-left font-semibold text-ink underline decoration-line underline-offset-4 hover:text-teal disabled:cursor-not-allowed disabled:text-ink/40"
                    onClick={handleResendCode}
                    disabled={isResending}
                  >
                    {isResending ? "Sending..." : "Resend code"}
                  </button>
                  <button
                    type="button"
                    className="text-left font-semibold text-ink underline decoration-line underline-offset-4 hover:text-teal"
                    onClick={() => {
                      setIsCodeStep(false);
                      setCode("");
                      setNotice("");
                      setError("");
                    }}
                  >
                    Use a different email
                  </button>
                </div>
              ) : null}
            </form>
            <p className="mt-6 text-sm text-ink/60">
              Already have one?{" "}
              <Link className="font-semibold text-ink underline decoration-line underline-offset-4 hover:text-teal" href="/login">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
