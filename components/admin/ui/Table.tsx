"use client";

/** Rounded card wrapper for a data table, with the horizontal-scroll handled inside. */
export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={`py-3 px-4 text-xs font-semibold uppercase tracking-wide text-black/40 ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={`py-3 px-4 text-sm ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

/** Table row with a subtle hover tint — apply to every <tr> in a TableCard's <tbody>. */
export const TR_HOVER = "border-b border-black/5 last:border-b-0 transition-colors duration-100 hover:bg-black/[0.02]";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-black/40 py-16 text-center">{children}</p>;
}
