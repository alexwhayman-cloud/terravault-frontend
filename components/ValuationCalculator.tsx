"use client";

import { useState, type FormEvent } from "react";

/**
 * TerraVault homepage valuation calculator.
 *
 * Calls the public valuation endpoint of terravault-backend
 * (POST {NEXT_PUBLIC_TERRAVAULT_API_URL}/api/v1/assets/value). The request and
 * response types below mirror `ValuationRequest` / `ValuationResponse` in the
 * backend's schemas.py. The backend has no brand field, so brand is sent as
 * part of `model`, which its model-name fallback matches against.
 */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_TERRAVAULT_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const VALUATION_ENDPOINT = `${API_BASE_URL}/api/v1/assets/value`;

export type AssetCondition = "unworn" | "excellent" | "good" | "fair";

/** What the client types into the form. */
export interface ValuationForm {
  brand: string;
  model: string;
  reference_number: string;
  condition: AssetCondition;
}

/** Body of POST /api/v1/assets/value. */
export interface ValuationRequest {
  reference_number: string;
  condition: AssetCondition;
  model: string;
}

/** 200 response of POST /api/v1/assets/value. */
export interface ValuationResult {
  brand: string;
  model: string;
  reference_number: string;
  condition: string;
  baseline_floor_usd: number;
  condition_multiplier: number;
  /** Condition-adjusted estimated secondary market floor. */
  valuation_usd: number;
  token_price_usd: number;
  /** Fractional TV-LAND tokens the valuation converts to. */
  token_equivalent: number;
  matched_by: "reference" | "model";
  priced_at: string;
}

const LAND_TOKEN_SYMBOL = "TV-LAND";

interface ValuationCalculatorProps {
  /** Called when the client locks the quote. Identity/KYC starts here, never before. */
  onLockValuation?: (form: ValuationForm, result: ValuationResult) => void;
}

const CONDITIONS: { value: AssetCondition; label: string }[] = [
  { value: "unworn", label: "Unworn" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const tokens = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const fieldClass =
  "w-full border border-[#0E1B22]/30 bg-[#F4EFE7] px-4 py-3 text-[15px] text-[#0E1B22] " +
  "placeholder:text-[#0E1B22]/40 outline-none transition-colors " +
  "focus:border-[#0E1B22] focus-visible:ring-1 focus-visible:ring-[#0E1B22]";

const labelClass =
  "mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-[#0E1B22]/70";

export default function ValuationCalculator({ onLockValuation }: ValuationCalculatorProps) {
  const [form, setForm] = useState<ValuationForm>({
    brand: "",
    model: "",
    reference_number: "",
    condition: "excellent",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [quotedFor, setQuotedFor] = useState<ValuationForm | null>(null);

  const update = <K extends keyof ValuationForm>(key: K, value: ValuationForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.brand.trim() !== "" &&
    form.model.trim() !== "" &&
    form.reference_number.trim() !== "" &&
    status !== "loading";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const submitted: ValuationForm = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      reference_number: form.reference_number.trim(),
      condition: form.condition,
    };
    const payload: ValuationRequest = {
      reference_number: submitted.reference_number,
      condition: submitted.condition,
      model: `${submitted.brand} ${submitted.model}`,
    };

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch(VALUATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        // FastAPI sends a string detail for 404s and a list of field errors for 422s.
        const detail =
          body && typeof body.detail === "string"
            ? body.detail
            : res.status === 422
              ? "Please check the asset details and try again."
              : `Valuation service returned ${res.status}.`;
        throw new Error(detail);
      }

      if (
        !body ||
        typeof body.valuation_usd !== "number" ||
        typeof body.token_equivalent !== "number"
      ) {
        throw new Error("Unexpected response from the valuation service.");
      }

      setResult(body as ValuationResult);
      setQuotedFor(submitted);
      setStatus("done");
    } catch (err) {
      setResult(null);
      setQuotedFor(null);
      setError(
        err instanceof TypeError
          ? "We couldn't reach the valuation desk. Please try again shortly."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
      setStatus("error");
    }
  }

  // The quote is only valid for the inputs it was calculated from.
  const isStale =
    quotedFor !== null &&
    (quotedFor.brand !== form.brand.trim() ||
      quotedFor.model !== form.model.trim() ||
      quotedFor.reference_number !== form.reference_number.trim() ||
      quotedFor.condition !== form.condition);

  return (
    <section className="bg-[#F4EFE7] px-4 py-16 text-[#0E1B22] sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* Intake */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#0E1B22]/60">
            Private Valuation
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            What is your timepiece worth in land?
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#0E1B22]/75">
            An indicative secondary-market floor, mapped to TerraVault land tokens. No account
            required.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6" noValidate>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="tv-brand" className={labelClass}>
                  Brand
                </label>
                <input
                  id="tv-brand"
                  className={fieldClass}
                  placeholder="Patek Philippe"
                  autoComplete="off"
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="tv-model" className={labelClass}>
                  Model
                </label>
                <input
                  id="tv-model"
                  className={fieldClass}
                  placeholder="Nautilus"
                  autoComplete="off"
                  value={form.model}
                  onChange={(e) => update("model", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="tv-ref" className={labelClass}>
                  Reference Number
                </label>
                <input
                  id="tv-ref"
                  className={`${fieldClass} font-mono tracking-wide`}
                  placeholder="5711/1A-010"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.reference_number}
                  onChange={(e) => update("reference_number", e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="tv-condition" className={labelClass}>
                  Condition
                </label>
                <div className="relative">
                  <select
                    id="tv-condition"
                    className={`${fieldClass} appearance-none pr-10`}
                    value={form.condition}
                    onChange={(e) => update("condition", e.target.value as AssetCondition)}
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 8"
                    className="pointer-events-none absolute right-4 top-1/2 h-2 w-3 -translate-y-1/2"
                  >
                    <path d="M1 1l5 5 5-5" fill="none" stroke="#0E1B22" strokeWidth="1.4" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full border border-[#0E1B22] bg-[#C9D8D5] px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0E1B22] transition-colors hover:bg-[#b9ccc8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E1B22] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? "Calculating…" : "Calculate Exchange Value"}
            </button>

            <div aria-live="polite">
              {status === "error" && error && (
                <p role="alert" className="border-l-2 border-[#0E1B22] pl-3 text-sm">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Result */}
        <div
          className="border border-[#0E1B22] bg-[#E8D3C8] p-8 sm:p-10"
          aria-live="polite"
          aria-busy={status === "loading"}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#0E1B22]/60">
            Indicative Exchange
          </p>

          {result && quotedFor ? (
            <div className={isStale ? "opacity-50 transition-opacity" : "transition-opacity"}>
              <p className="mt-4 text-sm text-[#0E1B22]/75">
                {result.brand} {result.model} · Ref.{" "}
                <span className="font-mono">{result.reference_number}</span> ·{" "}
                <span className="capitalize">{quotedFor.condition}</span>
              </p>

              <dl className="mt-8 divide-y divide-[#0E1B22]/20 border-y border-[#0E1B22]/20">
                <div className="py-6">
                  <dt className={labelClass}>Estimated Secondary Market Floor (USD)</dt>
                  <dd className="font-serif text-4xl tabular-nums">
                    {usd.format(result.valuation_usd)}
                  </dd>
                </div>
                <div className="py-6">
                  <dt className={labelClass}>Land Token Equivalent</dt>
                  <dd className="font-serif text-4xl tabular-nums">
                    {tokens.format(result.token_equivalent)}{" "}
                    <span className="align-middle text-base font-sans tracking-[0.18em]">
                      {LAND_TOKEN_SYMBOL}
                    </span>
                  </dd>
                </div>
              </dl>

              {isStale ? (
                <p className="mt-6 text-sm">Details changed. Recalculate to refresh this quote.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => onLockValuation?.(quotedFor, result)}
                  className="mt-8 w-full border border-[#0E1B22] bg-[#C9D8D5] px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#0E1B22] transition-colors hover:bg-[#b9ccc8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E1B22]"
                >
                  Lock Valuation &amp; Initiate Land Swap
                </button>
              )}

              <p className="mt-4 text-xs leading-relaxed text-[#0E1B22]/60">
                Indicative only. Final value is confirmed after physical authentication.
              </p>
            </div>
          ) : (
            <div className="mt-8 border-y border-[#0E1B22]/20 py-10">
              <p className="font-serif text-2xl text-[#0E1B22]/40">
                {status === "loading" ? "Consulting the market…" : "Awaiting asset details"}
              </p>
              <p className="mt-3 text-sm text-[#0E1B22]/60">
                Your valuation and land token equivalent will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
