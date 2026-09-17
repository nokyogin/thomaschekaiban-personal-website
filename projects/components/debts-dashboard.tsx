"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Debt,
  Payment,
  paidTotal,
  currentBalance,
  progress,
  isSettled,
  parseAmount,
  formatK,
  formatExact,
  formatMonth,
  round2,
} from "@/data/debts-data";

type SortKey = "balance" | "name" | "progress";
type FilterKey = "all" | "open" | "settled";

const POSITIVE = "#34d399"; // they owe me
const NEGATIVE = "#fb7185"; // I owe them
const SETTLED = "#60a5fa";

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

const primaryButton: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  fontSize: "0.85rem",
  fontWeight: 500,
  fontFamily: "inherit",
  color: "var(--pill-hover-fg)",
  background: "var(--pill-hover-bg)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  fontSize: "0.85rem",
  fontWeight: 400,
  fontFamily: "inherit",
  color: "var(--muted)",
  background: "transparent",
  border: "1px solid var(--pill-border)",
  borderRadius: 8,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  fontSize: "0.78rem",
  fontFamily: "inherit",
  color: "var(--muted)",
  background: "transparent",
  border: "1px solid var(--pill-border)",
  borderRadius: 8,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bio-bg)",
  border: "1px solid var(--bio-border)",
  borderRadius: 14,
};

interface Option {
  value: string;
  label: string;
}

/** Custom select: a pill trigger with a floating menu, styled like the rest of the UI. */
function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  align = "left",
  fullWidth = false,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel: string;
  align?: "left" | "right";
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative", width: fullWidth ? "100%" : "auto" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.6rem",
          width: fullWidth ? "100%" : "auto",
          padding: "0.55rem 0.7rem",
          fontSize: "0.85rem",
          fontFamily: "inherit",
          color: "var(--fg)",
          background: "var(--bg)",
          border: `1px solid ${open ? "var(--input-focus)" : "var(--input-border)"}`,
          borderRadius: 8,
          cursor: "pointer",
          transition: "border-color 0.15s ease",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>{current?.label ?? ""}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: align === "left" ? 0 : "auto",
            right: align === "right" ? 0 : "auto",
            minWidth: "100%",
            padding: 4,
            background: "var(--bg)",
            border: "1px solid var(--bio-border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px var(--card-shadow-2)",
            zIndex: 20,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  color: selected ? "var(--fg)" : "var(--bio-color)",
                  fontWeight: selected ? 500 : 400,
                  background: selected ? "var(--sidebar-active)" : "transparent",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = "var(--sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = "transparent";
                }}
              >
                {o.label}
                {selected && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ ...cardStyle, flex: "1 1 160px", padding: "1rem 1.15rem" }}>
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
      {sub && (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.25rem" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

interface DebtFormState {
  name: string;
  amount: string;
  notes: string;
}

const EMPTY_DEBT_FORM: DebtFormState = { name: "", amount: "", notes: "" };

function DebtForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: DebtFormState;
  submitLabel: string;
  onSubmit: (name: string, initialAmount: number, notes: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<DebtFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"owed" | "owing">(
    parseAmount(initial.amount) < 0 ? "owing" : "owed"
  );

  const set = (key: keyof DebtFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(form.amount);
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isFinite(amount) || amount === 0) {
      setError("Amount must be a non-zero number. 125k works too.");
      return;
    }
    setError(null);
    const signed = direction === "owing" ? -Math.abs(amount) : Math.abs(amount);
    onSubmit(form.name.trim(), signed, form.notes.trim());
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
          <label style={labelStyle} htmlFor="debt-name">Name</label>
          <input
            id="debt-name"
            style={inputStyle}
            value={form.name}
            placeholder="Khattar"
            onChange={(e) => set("name", e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="debt-amount">Initial amount</label>
          <input
            id="debt-amount"
            style={inputStyle}
            value={form.amount}
            inputMode="decimal"
            placeholder="240k"
            onChange={(e) => set("amount", e.target.value)}
          />
        </div>

        <div>
          <span style={labelStyle}>Direction</span>
          <Dropdown
            ariaLabel="Debt direction"
            fullWidth
            value={direction}
            options={[
              { value: "owed", label: "They owe me" },
              { value: "owing", label: "I owe them" },
            ]}
            onChange={(v) => setDirection(v as "owed" | "owing")}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="debt-notes">Notes</label>
          <input
            id="debt-notes"
            style={inputStyle}
            value={form.notes}
            placeholder="Apartment loan"
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={primaryButton}>{submitLabel}</button>
        <button type="button" onClick={onCancel} style={ghostButton}>Cancel</button>
      </div>
    </form>
  );
}

interface PaymentFormState {
  date: string;
  amount: string;
  note: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function PaymentForm({
  initial,
  submitLabel,
  sign,
  onSubmit,
  onCancel,
}: {
  initial: PaymentFormState;
  submitLabel: string;
  sign: number;
  onSubmit: (date: string, amount: number, note: string) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PaymentFormState>(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof PaymentFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(form.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError("Pick a date.");
      return;
    }
    if (!isFinite(amount) || amount === 0) {
      setError("Amount must be a non-zero number. 5k works too.");
      return;
    }
    setError(null);
    // A positive entry repays the debt; a negative one grows it.
    onSubmit(form.date, round2(amount * sign), form.note.trim());
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.7rem" }}>
      <div
        style={{
          display: "grid",
          gap: "0.7rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        }}
      >
        <div>
          <span style={labelStyle}>Date</span>
          <input
            style={inputStyle}
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div>
          <span style={labelStyle}>Repaid</span>
          <input
            style={inputStyle}
            value={form.amount}
            inputMode="decimal"
            placeholder="5k"
            autoFocus
            onChange={(e) => set("amount", e.target.value)}
          />
        </div>
        <div>
          <span style={labelStyle}>Note</span>
          <input
            style={inputStyle}
            value={form.note}
            placeholder="Bank transfer"
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" style={primaryButton}>{submitLabel}</button>
        <button type="button" onClick={onCancel} style={ghostButton}>Cancel</button>
      </div>
    </form>
  );
}

export function DebtsDashboard() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("balance");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    fetch("/api/debts", { credentials: "same-origin" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        setDebts(res.debts ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load debts:", err);
        setError("Could not load debts.");
        setLoading(false);
      });
  }, []);

  const totals = useMemo(() => {
    let owedToMe = 0;
    let iOwe = 0;
    let repaid = 0;
    let open = 0;
    for (const d of debts) {
      const balance = currentBalance(d);
      if (balance > 0) owedToMe += balance;
      if (balance < 0) iOwe += -balance;
      if (!isSettled(d)) open += 1;
      repaid += Math.abs(paidTotal(d));
    }
    return { owedToMe, iOwe, repaid, open, count: debts.length };
  }, [debts]);

  const visible = useMemo(() => {
    const list = debts.filter((d) => {
      if (filter === "open") return !isSettled(d);
      if (filter === "settled") return isSettled(d);
      return true;
    });
    return list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "progress") return progress(b) - progress(a);
      return Math.abs(currentBalance(b)) - Math.abs(currentBalance(a));
    });
  }, [debts, filter, sortKey]);

  const closeForms = useCallback(() => {
    setAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    setPayingId(null);
    setEditingPaymentId(null);
    setConfirmDeletePaymentId(null);
  }, []);

  const handleCreate = useCallback(
    (name: string, initialAmount: number, notes: string) => {
      setError(null);
      fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, initialAmount, notes }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.debt) {
            setDebts((prev) => [...prev, res.debt]);
            setAdding(false);
          } else {
            setError(res.error ?? "Could not add debt.");
          }
        })
        .catch((err) => {
          console.error("Failed to add debt:", err);
          setError("Could not add debt.");
        });
    },
    []
  );

  const handleUpdate = useCallback(
    (id: number, name: string, initialAmount: number, notes: string) => {
      setError(null);
      fetch("/api/debts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id, name, initialAmount, notes }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.debt) {
            setDebts((prev) => prev.map((d) => (d.id === id ? res.debt : d)));
            setEditingId(null);
          } else {
            setError(res.error ?? "Could not update debt.");
          }
        })
        .catch((err) => {
          console.error("Failed to update debt:", err);
          setError("Could not update debt.");
        });
    },
    []
  );

  const handleDelete = useCallback((id: number) => {
    setError(null);
    fetch(`/api/debts?id=${id}`, { method: "DELETE", credentials: "same-origin" })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setDebts((prev) => prev.filter((d) => d.id !== id));
          setConfirmDeleteId(null);
        } else {
          setError(res.error ?? "Could not delete debt.");
        }
      })
      .catch((err) => {
        console.error("Failed to delete debt:", err);
        setError("Could not delete debt.");
      });
  }, []);

  const handleAddPayment = useCallback(
    (debtId: number, date: string, amount: number, note: string) => {
      setError(null);
      fetch("/api/debts/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ debtId, date, amount, note }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.payment) {
            setDebts((prev) =>
              prev.map((d) =>
                d.id === debtId
                  ? { ...d, payments: sortPayments([...d.payments, res.payment]) }
                  : d
              )
            );
            setPayingId(null);
          } else {
            setError(res.error ?? "Could not add payment.");
          }
        })
        .catch((err) => {
          console.error("Failed to add payment:", err);
          setError("Could not add payment.");
        });
    },
    []
  );

  const handleUpdatePayment = useCallback(
    (debtId: number, id: number, date: string, amount: number, note: string) => {
      setError(null);
      fetch("/api/debts/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id, date, amount, note }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.payment) {
            setDebts((prev) =>
              prev.map((d) =>
                d.id === debtId
                  ? {
                      ...d,
                      payments: sortPayments(
                        d.payments.map((p) => (p.id === id ? res.payment : p))
                      ),
                    }
                  : d
              )
            );
            setEditingPaymentId(null);
          } else {
            setError(res.error ?? "Could not update payment.");
          }
        })
        .catch((err) => {
          console.error("Failed to update payment:", err);
          setError("Could not update payment.");
        });
    },
    []
  );

  const handleDeletePayment = useCallback((debtId: number, id: number) => {
    setError(null);
    fetch(`/api/debts/payments?id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setDebts((prev) =>
            prev.map((d) =>
              d.id === debtId
                ? { ...d, payments: d.payments.filter((p) => p.id !== id) }
                : d
            )
          );
          setConfirmDeletePaymentId(null);
        } else {
          setError(res.error ?? "Could not delete payment.");
        }
      })
      .catch((err) => {
        console.error("Failed to delete payment:", err);
        setError("Could not delete payment.");
      });
  }, []);

  useEffect(() => {
    const handleAdd = () => {
      closeForms();
      setAdding(true);
    };
    window.addEventListener("sidebar:add-debt", handleAdd);
    return () => window.removeEventListener("sidebar:add-debt", handleAdd);
  }, [closeForms]);

  const toggleExpanded = (id: number) =>
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

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
        Debts
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
        Who owes what, and every repayment along the way.
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
        <StatCard
          label="Owed to me"
          value={formatK(totals.owedToMe)}
          accent={POSITIVE}
          sub={formatExact(totals.owedToMe)}
        />
        <StatCard
          label="I owe"
          value={formatK(totals.iOwe)}
          accent={totals.iOwe > 0 ? NEGATIVE : undefined}
          sub={formatExact(totals.iOwe)}
        />
        <StatCard label="Repaid" value={formatK(totals.repaid)} sub={formatExact(totals.repaid)} />
        <StatCard
          label="Open"
          value={`${totals.open} / ${totals.count}`}
          sub={totals.count === 1 ? "1 person" : `${totals.count} people`}
        />
      </div>

      {error && (
        <div style={{ marginBottom: "1rem" }}>
          <ErrorBox message={error} />
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
              closeForms();
              setAdding(true);
            }}
            style={{ ...primaryButton, padding: "0.5rem 1rem" }}
          >
            + Add debt
          </button>
        )}

        <div style={{ flex: 1 }} />

        <Dropdown
          ariaLabel="Filter debts"
          align="right"
          value={filter}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Outstanding" },
            { value: "settled", label: "Settled" },
          ]}
          onChange={(v) => setFilter(v as FilterKey)}
        />

        <Dropdown
          ariaLabel="Sort by"
          align="right"
          value={sortKey}
          options={[
            { value: "balance", label: "Sort: balance" },
            { value: "progress", label: "Sort: repaid" },
            { value: "name", label: "Sort: name" },
          ]}
          onChange={(v) => setSortKey(v as SortKey)}
        />
      </div>

      {adding && (
        <div style={{ ...cardStyle, padding: "1.15rem 1.25rem", marginBottom: "1rem" }}>
          <DebtForm
            initial={EMPTY_DEBT_FORM}
            submitLabel="Add"
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
            ...cardStyle,
            padding: "3rem 2rem",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "0.9rem",
          }}
        >
          {debts.length === 0
            ? "No debts yet. Add your first one."
            : "Nothing matches this filter."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {visible.map((d) => {
            const balance = currentBalance(d);
            const settled = isSettled(d);
            const share = progress(d);
            const accent = settled ? SETTLED : balance < 0 ? NEGATIVE : POSITIVE;
            const isOpen = expanded.includes(d.id);

            if (editingId === d.id) {
              return (
                <div key={d.id} style={{ ...cardStyle, padding: "1.15rem 1.25rem" }}>
                  <DebtForm
                    initial={{
                      name: d.name,
                      amount: String(Math.abs(d.initialAmount)),
                      notes: d.notes,
                    }}
                    submitLabel="Save"
                    onSubmit={(name, amount, notes) =>
                      handleUpdate(d.id, name, amount, notes)
                    }
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              );
            }

            return (
              <div key={d.id} style={{ ...cardStyle, padding: "0.9rem 1.15rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap",
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
                      <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>{d.name}</span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "0.12rem 0.5rem",
                          borderRadius: 999,
                          color: accent,
                          border: `1px solid ${accent}55`,
                        }}
                      >
                        {settled ? "Settled" : d.initialAmount < 0 ? "I owe" : "Owes me"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                        marginTop: "0.2rem",
                      }}
                    >
                      {formatK(Math.abs(d.initialAmount))} initial ·{" "}
                      {formatK(Math.abs(paidTotal(d)))} repaid
                      {d.notes ? ` · ${d.notes}` : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 110 }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, color: accent }}>
                      {formatK(Math.abs(balance))}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                      {Math.round(share * 100)}% repaid
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => toggleExpanded(d.id)}
                      style={smallButton}
                      aria-expanded={isOpen}
                    >
                      {d.payments.length} payment{d.payments.length === 1 ? "" : "s"}
                    </button>
                    <button
                      onClick={() => {
                        closeForms();
                        setEditingId(d.id);
                      }}
                      style={smallButton}
                    >
                      Edit
                    </button>
                    {confirmDeleteId === d.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(d.id)}
                          style={{
                            ...smallButton,
                            color: "#fff",
                            background: "#ef4444",
                            border: "none",
                          }}
                        >
                          Confirm
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} style={smallButton}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          closeForms();
                          setConfirmDeleteId(d.id);
                        }}
                        style={{ ...smallButton, color: "#ef4444" }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div
                  style={{
                    height: 4,
                    marginTop: "0.75rem",
                    borderRadius: 999,
                    background: "var(--sidebar-active)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${share * 100}%`,
                      height: "100%",
                      background: accent,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {isOpen && (
                  <div style={{ marginTop: "0.9rem" }}>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      {d.payments.length === 0 && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          No payments recorded yet.
                        </div>
                      )}
                      {d.payments.map((p) =>
                        editingPaymentId === p.id ? (
                          <div
                            key={p.id}
                            style={{
                              padding: "0.75rem 0.85rem",
                              border: "1px solid var(--bio-border)",
                              borderRadius: 10,
                            }}
                          >
                            <PaymentForm
                              initial={{
                                date: p.date,
                                amount: String(Math.abs(p.amount)),
                                note: p.note,
                              }}
                              submitLabel="Save"
                              sign={d.initialAmount < 0 ? -1 : 1}
                              onSubmit={(date, amount, note) =>
                                handleUpdatePayment(d.id, p.id, date, amount, note)
                              }
                              onCancel={() => setEditingPaymentId(null)}
                            />
                          </div>
                        ) : (
                          <PaymentRow
                            key={p.id}
                            payment={p}
                            accent={accent}
                            confirming={confirmDeletePaymentId === p.id}
                            onEdit={() => {
                              setPayingId(null);
                              setConfirmDeletePaymentId(null);
                              setEditingPaymentId(p.id);
                            }}
                            onAskDelete={() => {
                              setEditingPaymentId(null);
                              setConfirmDeletePaymentId(p.id);
                            }}
                            onCancelDelete={() => setConfirmDeletePaymentId(null)}
                            onDelete={() => handleDeletePayment(d.id, p.id)}
                          />
                        )
                      )}
                    </div>

                    {payingId === d.id ? (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          padding: "0.75rem 0.85rem",
                          border: "1px solid var(--bio-border)",
                          borderRadius: 10,
                        }}
                      >
                        <PaymentForm
                          initial={{ date: todayISO(), amount: "", note: "" }}
                          submitLabel="Add payment"
                          sign={d.initialAmount < 0 ? -1 : 1}
                          onSubmit={(date, amount, note) =>
                            handleAddPayment(d.id, date, amount, note)
                          }
                          onCancel={() => setPayingId(null)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPaymentId(null);
                          setConfirmDeletePaymentId(null);
                          setPayingId(d.id);
                        }}
                        style={{ ...smallButton, marginTop: "0.6rem" }}
                      >
                        + Add payment
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentRow({
  payment,
  accent,
  confirming,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  payment: Payment;
  accent: string;
  confirming: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const repayment = Math.abs(payment.amount);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
        padding: "0.4rem 0.2rem",
        borderTop: "1px solid var(--bio-border)",
      }}
    >
      <span style={{ fontSize: "0.8rem", color: "var(--muted)", minWidth: 80 }}>
        {formatMonth(payment.date)}
      </span>
      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: accent, minWidth: 70 }}>
        +{formatK(repayment)}
      </span>
      <span style={{ flex: 1, fontSize: "0.75rem", color: "var(--muted)" }}>
        {payment.note}
      </span>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        <button onClick={onEdit} style={{ ...smallButton, padding: "0.2rem 0.55rem" }}>
          Edit
        </button>
        {confirming ? (
          <>
            <button
              onClick={onDelete}
              style={{
                ...smallButton,
                padding: "0.2rem 0.55rem",
                color: "#fff",
                background: "#ef4444",
                border: "none",
              }}
            >
              Confirm
            </button>
            <button
              onClick={onCancelDelete}
              style={{ ...smallButton, padding: "0.2rem 0.55rem" }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={onAskDelete}
            style={{ ...smallButton, padding: "0.2rem 0.55rem", color: "#ef4444" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function sortPayments(payments: Payment[]): Payment[] {
  return [...payments].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id
  );
}
