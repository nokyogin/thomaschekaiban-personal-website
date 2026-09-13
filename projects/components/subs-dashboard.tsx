"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Subscription,
  BillingCycle,
  monthlyCost,
  yearlyCost,
} from "@/data/subs-data";

const fmt = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COLORS = [
  "#60a5fa", "#34d399", "#f97316", "#a78bfa",
  "#fb7185", "#38bdf8", "#facc15", "#2dd4bf",
];

type SortKey = "name" | "monthly" | "yearly" | "next";

interface FormState {
  name: string;
  price: string;
  cycle: BillingCycle;
  category: string;
  nextPayment: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  cycle: "monthly",
  category: "",
  nextPayment: "",
  notes: "",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  fontSize: "0.875rem",
  fontFamily: "inherit",
  color: "var(--fg)",
  background: "var(--bg)",
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  marginBottom: "0.35rem",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 160px",
        padding: "1rem 1.15rem",
        background: "var(--bio-bg)",
        border: "1px solid var(--bio-border)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          marginBottom: "0.4rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.4rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: accent ?? "var(--fg)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SubForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  categories,
}: {
  initial: FormState;
  submitLabel: string;
  onSubmit: (form: FormState) => void;
  onCancel: () => void;
  categories: string[];
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price.replace(",", "."));
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isFinite(price) || price < 0) {
      setError("Price must be a positive number.");
      return;
    }
    setError(null);
    onSubmit({ ...form, name: form.name.trim(), price: String(price) });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.85rem" }}>
      <div
        style={{
          display: "grid",
          gap: "0.85rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div>
          <label style={labelStyle} htmlFor="sub-name">Name</label>
          <input
            id="sub-name"
            style={inputStyle}
            value={form.name}
            placeholder="Netflix"
            onChange={(e) => set("name", e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="sub-price">Price (€)</label>
          <input
            id="sub-price"
            style={inputStyle}
            value={form.price}
            inputMode="decimal"
            placeholder="13.49"
            onChange={(e) => set("price", e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="sub-cycle">Billing</label>
          <select
            id="sub-cycle"
            style={{ ...inputStyle, cursor: "pointer" }}
            value={form.cycle}
            onChange={(e) => set("cycle", e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label style={labelStyle} htmlFor="sub-category">Category</label>
          <input
            id="sub-category"
            style={inputStyle}
            value={form.category}
            list="sub-categories"
            placeholder="Streaming"
            onChange={(e) => set("category", e.target.value)}
          />
          <datalist id="sub-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label style={labelStyle} htmlFor="sub-next">Next payment</label>
          <input
            id="sub-next"
            type="date"
            style={inputStyle}
            value={form.nextPayment}
            onChange={(e) => set("nextPayment", e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="sub-notes">Notes</label>
          <input
            id="sub-notes"
            style={inputStyle}
            value={form.notes}
            placeholder="Family plan"
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "0.5rem 0.7rem",
            fontSize: "0.8rem",
            color: "var(--error-fg)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          style={{
            padding: "0.55rem 1.1rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            fontFamily: "inherit",
            color: "var(--pill-hover-fg)",
            background: "var(--pill-hover-bg)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "0.55rem 1.1rem",
            fontSize: "0.85rem",
            fontWeight: 400,
            fontFamily: "inherit",
            color: "var(--muted)",
            background: "transparent",
            border: "1px solid var(--pill-border)",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SubsDashboard() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("monthly");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subs", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        setSubs(res.subscriptions ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load subscriptions:", err);
        setError("Could not load subscriptions.");
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(subs.map((s) => s.category).filter(Boolean));
    return Array.from(set).sort();
  }, [subs]);

  const categoryColors = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c, i) => {
      map[c] = COLORS[i % COLORS.length];
    });
    return map;
  }, [categories]);

  const visible = useMemo(() => {
    const list = categoryFilter
      ? subs.filter((s) => s.category === categoryFilter)
      : [...subs];
    return list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "monthly") return monthlyCost(b) - monthlyCost(a);
      if (sortKey === "yearly") return yearlyCost(b) - yearlyCost(a);
      // next payment: dated first, soonest first
      if (!a.nextPayment && !b.nextPayment) return a.name.localeCompare(b.name);
      if (!a.nextPayment) return 1;
      if (!b.nextPayment) return -1;
      return a.nextPayment.localeCompare(b.nextPayment);
    });
  }, [subs, sortKey, categoryFilter]);

  const totals = useMemo(() => {
    const monthly = subs.reduce((a, s) => a + monthlyCost(s), 0);
    return {
      monthly,
      yearly: subs.reduce((a, s) => a + yearlyCost(s), 0),
      count: subs.length,
      average: subs.length ? monthly / subs.length : 0,
    };
  }, [subs]);

  const toPayload = (form: FormState) => ({
    name: form.name,
    price: parseFloat(form.price),
    cycle: form.cycle,
    category: form.category.trim(),
    nextPayment: form.nextPayment || null,
    notes: form.notes.trim(),
  });

  const handleCreate = useCallback((form: FormState) => {
    setError(null);
    fetch("/api/subs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(toPayload(form)),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.subscription) {
          setSubs((prev) => [...prev, res.subscription]);
          setAdding(false);
        } else {
          setError(res.error ?? "Could not add subscription.");
        }
      })
      .catch((err) => {
        console.error("Failed to add subscription:", err);
        setError("Could not add subscription.");
      });
  }, []);

  const handleUpdate = useCallback((id: number, form: FormState) => {
    setError(null);
    fetch("/api/subs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, ...toPayload(form) }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.subscription) {
          setSubs((prev) =>
            prev.map((s) => (s.id === id ? res.subscription : s))
          );
          setEditingId(null);
        } else {
          setError(res.error ?? "Could not update subscription.");
        }
      })
      .catch((err) => {
        console.error("Failed to update subscription:", err);
        setError("Could not update subscription.");
      });
  }, []);

  const handleDelete = useCallback((id: number) => {
    setError(null);
    fetch(`/api/subs?id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setSubs((prev) => prev.filter((s) => s.id !== id));
          setConfirmDeleteId(null);
        } else {
          setError(res.error ?? "Could not delete subscription.");
        }
      })
      .catch((err) => {
        console.error("Failed to delete subscription:", err);
        setError("Could not delete subscription.");
      });
  }, []);

  useEffect(() => {
    const handleAdd = () => {
      setEditingId(null);
      setAdding(true);
    };
    window.addEventListener("sidebar:add-sub", handleAdd);
    return () => window.removeEventListener("sidebar:add-sub", handleAdd);
  }, []);

  const formFor = (s: Subscription): FormState => ({
    name: s.name,
    price: String(s.price),
    cycle: s.cycle,
    category: s.category,
    nextPayment: s.nextPayment ?? "",
    notes: s.notes,
  });

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 960, width: "100%" }}>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: "0.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out forwards",
        }}
      >
        Subs
      </h1>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.95rem",
          marginBottom: "1.75rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.05s forwards",
        }}
      >
        All recurring subscriptions, in euros.
      </p>

      {/* Totals */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.1s forwards",
        }}
      >
        <StatCard label="Per month" value={fmt.format(totals.monthly)} />
        <StatCard label="Per year" value={fmt.format(totals.yearly)} />
        <StatCard label="Subscriptions" value={String(totals.count)} />
        <StatCard label="Avg / month" value={fmt.format(totals.average)} />
      </div>

      {error && (
        <div
          style={{
            padding: "0.6rem 0.85rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            color: "var(--error-fg)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {!adding && (
          <button
            onClick={() => {
              setEditingId(null);
              setAdding(true);
            }}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              fontFamily: "inherit",
              color: "var(--pill-hover-fg)",
              background: "var(--pill-hover-bg)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            + Add subscription
          </button>
        )}

        <div style={{ flex: 1 }} />

        <select
          aria-label="Filter by category"
          value={categoryFilter ?? ""}
          onChange={(e) => setCategoryFilter(e.target.value || null)}
          style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort by"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
        >
          <option value="monthly">Sort: monthly cost</option>
          <option value="yearly">Sort: yearly cost</option>
          <option value="name">Sort: name</option>
          <option value="next">Sort: next payment</option>
        </select>
      </div>

      {adding && (
        <div
          style={{
            padding: "1.15rem 1.25rem",
            marginBottom: "1rem",
            background: "var(--bio-bg)",
            border: "1px solid var(--bio-border)",
            borderRadius: 14,
          }}
        >
          <SubForm
            initial={EMPTY_FORM}
            submitLabel="Add"
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "0.9rem",
          }}
        >
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div
          style={{
            padding: "3rem 2rem",
            background: "var(--bio-bg)",
            border: "1px solid var(--bio-border)",
            borderRadius: 14,
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "0.9rem",
          }}
        >
          {subs.length === 0
            ? "No subscriptions yet. Add your first one."
            : "No subscriptions in this category."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {visible.map((s) =>
            editingId === s.id ? (
              <div
                key={s.id}
                style={{
                  padding: "1.15rem 1.25rem",
                  background: "var(--bio-bg)",
                  border: "1px solid var(--bio-border)",
                  borderRadius: 14,
                }}
              >
                <SubForm
                  initial={formFor(s)}
                  submitLabel="Save"
                  categories={categories}
                  onSubmit={(form) => handleUpdate(s.id, form)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                  padding: "0.9rem 1.15rem",
                  background: "var(--bio-bg)",
                  border: "1px solid var(--bio-border)",
                  borderRadius: 14,
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                      {s.name}
                    </span>
                    {s.category && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "0.12rem 0.5rem",
                          borderRadius: 999,
                          color: categoryColors[s.category],
                          border: `1px solid ${categoryColors[s.category]}55`,
                        }}
                      >
                        {s.category}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      marginTop: "0.2rem",
                    }}
                  >
                    Next: {formatDate(s.nextPayment)}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right", minWidth: 110 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    {fmt.format(s.price)}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 400,
                        color: "var(--muted)",
                      }}
                    >
                      {s.cycle === "yearly" ? " / yr" : " / mo"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                    {s.cycle === "yearly"
                      ? `${fmt.format(monthlyCost(s))} / mo`
                      : `${fmt.format(yearlyCost(s))} / yr`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setConfirmDeleteId(null);
                      setEditingId(s.id);
                    }}
                    style={{
                      padding: "0.35rem 0.7rem",
                      fontSize: "0.78rem",
                      fontFamily: "inherit",
                      color: "var(--muted)",
                      background: "transparent",
                      border: "1px solid var(--pill-border)",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  {confirmDeleteId === s.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(s.id)}
                        style={{
                          padding: "0.35rem 0.7rem",
                          fontSize: "0.78rem",
                          fontFamily: "inherit",
                          color: "#fff",
                          background: "#ef4444",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          padding: "0.35rem 0.7rem",
                          fontSize: "0.78rem",
                          fontFamily: "inherit",
                          color: "var(--muted)",
                          background: "transparent",
                          border: "1px solid var(--pill-border)",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(s.id)}
                      style={{
                        padding: "0.35rem 0.7rem",
                        fontSize: "0.78rem",
                        fontFamily: "inherit",
                        color: "#ef4444",
                        background: "transparent",
                        border: "1px solid var(--pill-border)",
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
