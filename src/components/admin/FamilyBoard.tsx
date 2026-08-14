import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  getFamilyForItem,
  updateFamily,
  updateVariant,
  reorderVariants,
  type FamilyBoard as Board,
  type FamilyMember,
} from "@/lib/families-admin.functions";
import { runAdminMutation } from "@/lib/admin/runAdminMutation";
import { markPublishPending } from "@/lib/publish-pending";

/**
 * Writable family board.
 *
 * Replaces the read-only FamilyPanel. Three things staff can now change
 * without a script:
 *   - the option axis name ("Size", "Finish") shown on the public switcher
 *   - each variant's label + its order inside the family
 *   - which photo represents each variant (pointer → AUTO fallback)
 *
 * The pinned photo must be one of that variant's own images; Postgres
 * enforces it, so a stale pin can never survive a photo swap.
 */

const label: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(26,26,26,0.45)",
  margin: 0,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(26,26,26,0.18)",
  background: "#fff",
  padding: "6px 8px",
  fontSize: 12,
  color: "#1a1a1a",
  width: "100%",
};

const chip = (active: boolean): React.CSSProperties => ({
  fontSize: 8,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  border: "1px solid rgba(26,26,26,0.18)",
  background: active ? "#1a1a1a" : "transparent",
  color: active ? "#fff" : "rgba(26,26,26,0.6)",
  padding: "2px 6px",
  cursor: "pointer",
});

export function FamilyBoard({ itemId }: { itemId: string }) {
  const getBoard = useServerFn(getFamilyForItem);
  const saveFamily = useServerFn(updateFamily);
  const saveVariant = useServerFn(updateVariant);
  const saveOrder = useServerFn(reorderVariants);

  const [board, setBoard] = useState<Board | null>(null);
  const [optionName, setOptionName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setBoard(null);
    // A drawer can paint from a seed row before the real uuid lands. Calling
    // the server fn with an undefined id throws a Zod error and blanks the app.
    if (!itemId || !/^[0-9a-f-]{36}$/i.test(itemId)) return;
    getBoard({ data: { id: itemId } })
      .then((b) => {
        if (!live) return;
        setBoard(b as Board | null);
        setOptionName((b as Board | null)?.family.option_name ?? "");
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  if (!board) return null;
  const { family, members } = board;

  // --- Step A warning sweep -------------------------------------------------
  // Everything that would make the public switcher read wrong, surfaced where
  // it gets fixed instead of in a script nobody runs.
  const warnings: string[] = [];
  const photoless = members.filter((m) => m.images.length === 0);
  if (photoless.length > 0) {
    warnings.push(
      `${photoless.length} piece${photoless.length > 1 ? "s have" : " has"} no photo yet: ${photoless
        .map((m) => m.title)
        .join(", ")}.`,
    );
  }
  const labels = members.map((m) => (m.variant_label ?? "").trim().toLowerCase()).filter(Boolean);
  const dupLabels = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
  if (dupLabels.length > 0) {
    warnings.push(`Two pieces share the same variant name: ${dupLabels.join(", ")}.`);
  }
  const pins = members.map((m) => (m.variant_cover_url ?? "").split("?")[0]).filter(Boolean);
  if (new Set(pins).size !== pins.length) {
    warnings.push("Two variants are pinned to the same photo — customers can't tell them apart.");
  }
  const named = members.filter((m) => (m.variant_label ?? "").trim()).length;
  if (family.option_name && named < members.length) {
    warnings.push(`${members.length - named} piece(s) still need a variant name before this shows choices.`);
  }
  if (!family.option_name) {
    warnings.push("No option name yet, so this tile keeps its plain photo gallery on the site.");
  }

  const patchMember = (next: FamilyMember) =>
    setBoard((b) =>
      b ? { ...b, members: b.members.map((m) => (m.id === next.id ? { ...m, ...next } : m)) } : b,
    );


  async function commitOptionName() {
    if ((family.option_name ?? "") === optionName.trim()) return;
    setBusy(true);
    const r = await runAdminMutation(
      () => saveFamily({ data: { familyId: family.id, optionName: optionName.trim() || null } }),
      { surface: "family-option-name", errorMessage: "Couldn't rename the option." },
    );
    setBusy(false);
    if (r.ok) {
      setBoard((b) => (b ? { ...b, family: { ...b.family, option_name: optionName.trim() || null } } : b));
      markPublishPending();
      toast.success("Option name saved");
    }
  }

  async function setLead(rmsId: string | null) {
    setBusy(true);
    const r = await runAdminMutation(
      () => saveFamily({ data: { familyId: family.id, leadRmsId: rmsId } }),
      { surface: "family-lead", errorMessage: "Couldn't set the landing piece." },
    );
    setBusy(false);
    if (r.ok) {
      setBoard((b) => (b ? { ...b, family: { ...b.family, lead_rms_id: rmsId } } : b));
      markPublishPending();
    }
  }

  async function commitLabel(m: FamilyMember, value: string) {
    if ((m.variant_label ?? "") === value.trim()) return;
    setBusy(true);
    const r = await runAdminMutation(
      () => saveVariant({ data: { itemId: m.id, variantLabel: value.trim() || null } }),
      { surface: "variant-label", errorMessage: "Couldn't save that variant name." },
    );
    setBusy(false);
    if (r.ok) {
      patchMember(r.data as FamilyMember);
      markPublishPending();
    }
  }

  async function pinPhoto(m: FamilyMember, url: string | null) {
    setBusy(true);
    const r = await runAdminMutation(
      () => saveVariant({ data: { itemId: m.id, variantCoverUrl: url } }),
      { surface: "variant-cover", errorMessage: "Couldn't pin that photo to this variant." },
    );
    setBusy(false);
    if (r.ok) {
      patchMember(r.data as FamilyMember);
      markPublishPending();
      toast.success(url ? "Photo pinned to this variant" : "Back to automatic photo");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = members.slice();
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    next[index] = next[target]!;
    next[target] = a;
    setBoard((b) => (b ? { ...b, members: next } : b));
    setBusy(true);
    const r = await runAdminMutation(
      () => saveOrder({ data: { familyId: family.id, itemIds: next.map((x) => x.id) } }),
      { surface: "variant-order", errorMessage: "Couldn't save the variant order." },
    );
    setBusy(false);
    if (r.ok) markPublishPending();
  }

  return (
    <div
      style={{
        border: "1px solid rgba(26,26,26,0.12)",
        background: "rgba(26,26,26,0.02)",
        padding: "14px 16px",
        marginBottom: 26,
        opacity: busy ? 0.7 : 1,
      }}
    >
      <p style={label}>Part of a collection</p>
      <p style={{ fontFamily: "var(--font-display, serif)", fontSize: 17, margin: "6px 0 2px", color: "#1a1a1a" }}>
        {family.title}
      </p>
      <p style={{ fontSize: 12, color: "rgba(26,26,26,0.62)", margin: "0 0 12px" }}>
        These {members.length} pieces show as ONE tile at{" "}
        <a href={`/collection/${family.slug}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
          /collection/{family.slug}
        </a>
        .
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={label} htmlFor="family-option-name">
          Option name — the word above the choices
        </label>
        <input
          id="family-option-name"
          style={{ ...input, marginTop: 5 }}
          value={optionName}
          placeholder="Size, Finish, Colour…"
          onChange={(e) => setOptionName(e.target.value)}
          onBlur={() => void commitOptionName()}
        />
      </div>

      {warnings.length > 0 && (
        <ul
          data-testid="family-warnings"
          style={{
            listStyle: "none",
            padding: "9px 11px",
            margin: "0 0 14px",
            border: "1px solid rgba(140,47,34,0.25)",
            background: "rgba(140,47,34,0.05)",
          }}
        >
          {warnings.map((w) => (
            <li key={w} style={{ fontSize: 11, lineHeight: 1.55, color: "rgba(140,47,34,0.9)" }}>
              {w}
            </li>
          ))}
        </ul>
      )}


      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {members.map((m, i) => {
          const isCurrent = m.id === itemId;
          const isLead = !!m.rms_id && m.rms_id === family.lead_rms_id;
          return (
            <li
              key={m.id}
              style={{
                borderTop: "1px solid rgba(26,26,26,0.08)",
                padding: "10px 0",
                background: isCurrent ? "rgba(26,26,26,0.03)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)", width: 18 }}>{i + 1}</span>
                <span style={{ fontSize: 12, color: "#1a1a1a", flex: 1, minWidth: 0 }}>
                  {m.title}
                  {isCurrent ? " — you are editing this" : ""}
                </span>
                <button type="button" style={chip(isLead)} onClick={() => void setLead(isLead ? null : m.rms_id)}>
                  {isLead ? "Landing piece" : "Make landing"}
                </button>
                <button
                  type="button"
                  aria-label="Move up"
                  style={chip(false)}
                  disabled={i === 0}
                  onClick={() => void move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  style={chip(false)}
                  disabled={i === members.length - 1}
                  onClick={() => void move(i, 1)}
                >
                  ↓
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <input
                  style={{ ...input, maxWidth: 220 }}
                  defaultValue={m.variant_label ?? ""}
                  placeholder="Variant name (5', 8', Brass…)"
                  aria-label={`Variant name for ${m.title}`}
                  onBlur={(e) => void commitLabel(m, e.target.value)}
                />
                <span style={{ ...label, letterSpacing: "0.16em" }}>
                  {m.variant_cover_url ? "Pinned photo" : "Automatic photo"}
                </span>
                {m.variant_cover_url && (
                  <button type="button" style={chip(false)} onClick={() => void pinPhoto(m, null)}>
                    Reset
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {m.images.length === 0 && (
                  <span style={{ fontSize: 11, color: "rgba(26,26,26,0.45)" }}>No photos on this piece yet.</span>
                )}
                {m.images.map((url) => {
                  const pinned = m.variant_cover_url === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => void pinPhoto(m, pinned ? null : url)}
                      title={pinned ? "Pinned — click to reset" : "Use this photo for this variant"}
                      style={{
                        width: 54,
                        height: 54,
                        padding: 0,
                        border: pinned ? "2px solid #1a1a1a" : "1px solid rgba(26,26,26,0.15)",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <p style={{ fontSize: 11, color: "rgba(26,26,26,0.55)", margin: "12px 0 0", lineHeight: 1.5 }}>
        Changes here are saved right away, then go live on the next Publish.
      </p>
    </div>
  );
}
