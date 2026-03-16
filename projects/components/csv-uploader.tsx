"use client";

import { useRef, useState, useCallback } from "react";
import { HealthRecord } from "@/data/health-data";

// Maps common CSV header names (lowercased, stripped) → HealthRecord keys
const HEADER_MAP: Record<string, keyof HealthRecord> = {
  // Time / date
  time: "time",
  date: "time",
  "time of measurement": "time",
  "measurement date": "time",
  datetime: "time",
  timestamp: "time",

  // Weight
  weight: "weight",
  "weight (kg)": "weight",
  "weight(kg)": "weight",
  "body weight": "weight",
  "weight_kg": "weight",
  kg: "weight",

  // Body fat (%)
  "body fat": "bodyFat",
  "body fat (%)": "bodyFat",
  "bodyfat": "bodyFat",
  "body fat percentage": "bodyFat",
  "body_fat": "bodyFat",
  "fat%": "bodyFat",
  "body fat rate(%)": "bodyFat",
  "body fat(%)": "bodyFat",
  "body fat %": "bodyFat",

  // Muscle mass (kg)
  "muscle mass": "muscleMass",
  "muscle mass (kg)": "muscleMass",
  "musclemass": "muscleMass",
  "muscle_mass": "muscleMass",
  "muscle(kg)": "muscleMass",

  // Skeletal muscle mass (kg)
  "skeletal muscle mass": "skeletalMuscleMass",
  "skeletal muscle mass (kg)": "skeletalMuscleMass",
  "skeletal muscle": "skeletalMuscleMass",
  "skeletalmusclemass": "skeletalMuscleMass",
  "skeletal_muscle_mass": "skeletalMuscleMass",

  // BMR
  bmr: "bmr",
  "bmr (kcal)": "bmr",
  "basal metabolic rate": "bmr",
  "basal metabolism": "bmr",
  "bmr(kcal)": "bmr",

  // Visceral fat
  "visceral fat": "visceralFat",
  "visceral fat level": "visceralFat",
  "visceralfat": "visceralFat",
  "visceral_fat": "visceralFat",
  "visceral fat index": "visceralFat",

  // Water (%)
  water: "water",
  "water (%)": "water",
  "body water": "water",
  "body water(%)": "water",
  "water rate(%)": "water",
};

const NUMERIC_KEYS: (keyof HealthRecord)[] = [
  "weight", "bodyFat", "muscleMass", "skeletalMuscleMass",
  "bmr", "visceralFat", "water",
];

// Headers that indicate a name/member/user column (used to filter by person)
const NAME_HEADERS = new Set([
  "name", "user", "member", "family member", "family members", "person", "profile",
  "account", "user name", "username", "nickname", "who",
]);

// We only want data for Thomas Chekaiban
const TARGET_NAME_PATTERNS = ["thomas", "chekaiban", "tom"];

function isTargetUser(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return TARGET_NAME_PATTERNS.some((p) => lower.includes(p));
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");
}

/** Try to parse a date string into ISO date (YYYY-MM-DD) */
function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  // ISO-ish: 2024-01-14 or 2024-01-14T10:30:00
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  // MM/DD/YYYY or DD/MM/YYYY — try Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function parseCSV(text: string): { records: HealthRecord[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { records: [], error: "File has no data rows." };
  }

  // Detect delimiter (comma or semicolon or tab)
  const firstLine = lines[0];
  const delimiter =
    firstLine.split("\t").length > firstLine.split(",").length
      ? "\t"
      : firstLine.split(";").length > firstLine.split(",").length
        ? ";"
        : ",";

  const rawHeaders = lines[0].split(delimiter);
  const columnMap: (keyof HealthRecord | null)[] = rawHeaders.map((h) => {
    const norm = normalizeHeader(h);
    return HEADER_MAP[norm] ?? null;
  });

  // Detect name/member column index for filtering by person
  let nameColIndex = -1;
  for (let i = 0; i < rawHeaders.length; i++) {
    if (NAME_HEADERS.has(normalizeHeader(rawHeaders[i]))) {
      nameColIndex = i;
      break;
    }
  }

  // Must have at least "time" mapped
  if (!columnMap.includes("time")) {
    return { records: [], error: "Could not match any columns. Make sure the CSV has a header row with columns like 'Date', 'Weight', 'Body Fat', etc." };
  }

  const records: HealthRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter);

    // If there's a name column, skip rows that don't match the target user
    if (nameColIndex >= 0) {
      const nameVal = cols[nameColIndex] ?? "";
      if (!isTargetUser(nameVal)) continue;
    }

    const record: Partial<HealthRecord> = {};

    for (let j = 0; j < cols.length; j++) {
      const key = columnMap[j];
      if (!key) continue;
      const val = cols[j].trim();
      if (!val) continue;

      if (key === "time") {
        const date = parseDate(val);
        if (date) record.time = date;
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) record[key] = num as never;
      }
    }

    if (!record.time) continue;

    // Fill missing numeric fields with 0
    for (const k of NUMERIC_KEYS) {
      if (record[k] === undefined) record[k] = 0 as never;
    }

    records.push(record as HealthRecord);
  }

  if (records.length === 0) {
    return { records: [], error: "No valid rows found. Make sure dates are parseable (e.g. 2024-01-14 or 01/14/2024)." };
  }

  // Deduplicate: keep last entry per day
  const byDate = new Map<string, HealthRecord>();
  for (const r of records) {
    byDate.set(r.time, r);
  }
  return { records: Array.from(byDate.values()) };
}

interface CSVUploaderProps {
  onUpload: (records: HealthRecord[]) => void;
}

export function CSVUploader({ onUpload }: CSVUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError("File is empty.");
        return;
      }
      const result = parseCSV(text);
      if (result.error) {
        setError(result.error);
        return;
      }
      onUpload(result.records);
    };
    reader.readAsText(file);
  }, [onUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      {/* Drop zone / button */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#60a5fa" : "var(--bio-border)"}`,
          borderRadius: 12,
          padding: "1.5rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "#60a5fa08" : "var(--bio-bg)",
          transition: "all 0.15s",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <div style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.25rem" }}>
          Drop CSV here or click to browse
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          Supports any body composition CSV with columns like Weight, Body Fat, etc.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.6rem 1rem",
            background: "#ef444415",
            border: "1px solid #ef444430",
            borderRadius: 10,
            fontSize: "0.82rem",
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
