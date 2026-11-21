"use client";

export type Saree = {
  id: string;
  name: string;
  code: string | null;
  price: number | null;
  photo_url: string | null;
  spec: unknown;
  spec_status: "pending" | "done" | "failed";
  spec_error: string | null;
};

export function SpecBadge({ status }: { status: Saree["spec_status"] }) {
  const map = {
    done: ["bg-green-100 text-green-800", "Described"],
    pending: ["bg-amber-100 text-amber-800", "Describing…"],
    failed: ["bg-red-100 text-red-800", "Description failed"],
  } as const;
  const [cls, text] = map[status] ?? map.pending;
  return <span className={`chip ${cls}`}>{text}</span>;
}

