import { useEffect, useState } from "react";

type Family = {
  slug: string;
  title: string;
  category: string;
  leadId: string;
  coverSource: "group-shot" | "lead-row";
  members: Array<{ id: string; title: string }>;
};

/**
 * Read-only "part of a collection" panel.
 *
 * Tableware variant rows (EDEN 13" Charger, EDEN 10.5" Plate…) are grouped
 * into a single public tile. Staff editing one row could not tell that the
 * grouping existed, or which row controls the landing image. This shows both.
 */
export function FamilyPanel({
  rmsId,
}: {
  rmsId: string | null;
}) {
  const [fam, setFam] = useState<Family | null>(null);

  useEffect(() => {
    let live = true;
    if (!rmsId) {
      setFam(null);
      return;
    }
    void import("@/data/inventory/family-map.json").then((m) => {
      if (!live) return;
      const table = (m.default ?? m) as { families: Record<string, Family> };
      setFam(table.families[rmsId] ?? null);
    });
    return () => {
      live = false;
    };
  }, [rmsId]);

  if (!fam) return null;

  const isLead = fam.leadId === rmsId;
  const leadTitle =
    fam.members.find((x) => x.id === fam.leadId)?.title ?? fam.title;

  return (
    <div
      style={{
        border: "1px solid rgba(26,26,26,0.12)",
        background: "rgba(26,26,26,0.02)",
        padding: "14px 16px",
        marginBottom: 26,
      }}
    >
      <p
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(26,26,26,0.45)",
          margin: 0,
        }}
      >
        Part of a collection
      </p>
      <p
        style={{
          fontFamily: "var(--font-display, serif)",
          fontSize: 17,
          margin: "6px 0 2px",
          color: "#1a1a1a",
        }}
      >
        {fam.title}
      </p>
      <p style={{ fontSize: 12, color: "rgba(26,26,26,0.62)", margin: "0 0 10px" }}>
        These {fam.members.length} pieces show on the public site as ONE tile at{" "}
        <a
          href={`/collection/${fam.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "underline" }}
        >
          /collection/{fam.slug}
        </a>
        . Every photo on every piece below appears in that tile's gallery.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 10px" }}>
        {fam.members.map((m) => (
          <li
            key={m.id}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              padding: "6px 0",
              borderBottom: "1px solid rgba(26,26,26,0.07)",
              fontSize: 12,
              color: m.id === rmsId ? "#1a1a1a" : "rgba(26,26,26,0.7)",
            }}
          >
            <span>
              {m.title}
              {m.id === rmsId ? " — you are editing this" : ""}
              {m.id === fam.leadId && fam.coverSource === "lead-row"
                ? " · landing image comes from here"
                : ""}
            </span>
            {m.id !== rmsId && (
              <a
                href={`/admin/products?q=${encodeURIComponent(m.title)}`}
                style={{
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(26,26,26,0.5)",
                  flexShrink: 0,
                }}
              >
                Find
              </a>
            )}
          </li>
        ))}
      </ul>

      <p style={{ fontSize: 11, color: "rgba(26,26,26,0.55)", margin: 0, lineHeight: 1.5 }}>
        {fam.coverSource === "group-shot" ? (
          <>
            The landing image is the collection's group photo. To change it,
            open <strong>{leadTitle}</strong> and drag the photo you want into
            first place — the group shot only stays first while it is first
            there.
          </>
        ) : (
          <>
            The landing image is the first photo on <strong>{leadTitle}</strong>.
            Open that piece and drag the photo you want into first place.
          </>
        )}
      </p>
    </div>
  );
}
