import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaAperture } from "@/components/media-aperture";
import { teamPhotoUrl, renderUrl, renderSrcSet } from "@/lib/storage-image";

// ---------------------------------------------------------------------------
// Atelier — THE HUMANS module
//
// Real staff module. NOT a paragraph. NOT decoration.
//
// Rendering rules:
// - Real entry, no image     → portrait aperture + name + role.
// - Image present, no name   → DO NOT render publicly (gated below).
// - Image present + name     → portrait + name + role; image must also have
//                              `approvedForWeb: true` to surface.
//
// Never: fake bios, stock portraits, silhouettes, "photo pending" placards,
// dashed upload boxes, developer gray blocks. Empty image slots use the
// MediaAperture frame — owner-approved waiting state, not a placeholder.
// ---------------------------------------------------------------------------

export interface TeamMemberImage {
  src: string;
  alt: string;
  credit?: string;
  /** Owner-approved for public web. False/undefined → portrait aperture only. */
  approvedForWeb: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  image?: TeamMemberImage;
  /**
   * Per-member visual tweaks — applied via Tailwind arbitrary selectors
   * on the wrapping <figure>. Used while we wait for replacement source
   * files (T6/T7/T8). Remove the override when fresh photos land.
   */
  imageClassName?: string;
}

// Helper: build an approved portrait entry from a storage filename.
const portrait = (filename: string, name: string): TeamMemberImage => ({
  src: teamPhotoUrl(filename),
  alt: `Portrait of ${name}`,
  approvedForWeb: true,
});

/**
 * Real staff roster. Portraits are native 2:3 — the aperture below matches
 * source ratio so faces are never cropped. No per-member reframes needed.
 */
export const TEAM: TeamMember[] = [
  { name: "Jill Livingston", role: "Founder · Creative Director", image: portrait("Jill.jpg", "Jill Livingston") },
  { name: "Annie Ohman", role: "Director of Company Operations", image: portrait("Annie.jpg", "Annie Ohman") },
  { name: "Amanda Ferguson", role: "Senior Designer", image: portrait("Amanda.jpg", "Amanda Ferguson") },
  { name: "Erin Purnell", role: "Associate Designer", image: portrait("Erin.jpg", "Erin Purnell") },
  { name: "Adrienne Moon", role: "Purchasing & Inventory Specialist", image: portrait("Adrienne.jpg", "Adrienne Moon") },
  { name: "Nathan Alexander", role: "Lead Fabricator", image: portrait("Nathan.jpg", "Nathan Alexander") },
  { name: "Cat Moore", role: "Brand & Marketing", image: portrait("Cat.jpg", "Cat Moore") },
  { name: "Sam Young", role: "Project Manager", image: portrait("Sam.jpg", "Sam Young") },
  { name: "Ryan Kankowski", role: "Project Manager", image: portrait("Ryan.jpg", "Ryan Kankowski") },
  { name: "Stephen Proud", role: "Warehouse & Fleet Specialist", image: portrait("Stephen.jpg", "Stephen Proud") },
  
  // { name: "Regina Mennig", role: "Accounting & Business Manager" }, // temp hidden — awaiting portrait
  { name: "Judy Morales", role: "Human Resources", image: portrait("Judy.jpg", "Judy Morales") },
];

export function AtelierTeam() {
  // Public-render gate: a member must have a real name + role. Images only
  // surface when explicitly approved; otherwise the slot stays as an
  // aperture under the name + role.
  const visibleMembers = TEAM.filter(
    (m) => m.name.trim().length > 0 && m.role.trim().length > 0,
  );
  const firstRowImageCount = useMemo(
    () =>
      visibleMembers
        .slice(0, 4)
        .filter((m) => !!m.image && m.image.approvedForWeb).length,
    [visibleMembers],
  );
  const [firstRowLoaded, setFirstRowLoaded] = useState(0);

  useEffect(() => {
    setFirstRowLoaded(0);
  }, [firstRowImageCount]);

  const reportFirstRowLoad = useCallback(() => {
    setFirstRowLoaded((count) => Math.min(count + 1, firstRowImageCount));
  }, [firstRowImageCount]);

  const firstRowReady = firstRowImageCount === 0 || firstRowLoaded >= firstRowImageCount;

  return (
    <div>
      {/* Section header — display title + owner-sourced quiet italic tagline.
          Tagline stays Title/sentence case per typography rule (only display
          titles + brand statements go ALL CAPS). */}
      <div className="mb-16 md:mb-24 grid md:grid-cols-12 gap-8 md:gap-12 items-end">
        <h2
          className="md:col-span-7 font-display uppercase tracking-[0.04em] leading-[0.95] text-charcoal"
          style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
        >
          THE HIVE
        </h2>
        <p className="md:col-span-5 font-display italic text-lg md:text-xl leading-relaxed text-charcoal/70 max-w-[40ch]">
          Our team moves across disciplines with intention and a shared approach. We are artists, designers, craftsmen. We are the atelier.
        </p>
      </div>

      {/* Portrait grid — single 4-column rhythm. Apertures hold the slot
          until owner-approved portraits land. Names + roles render now. */}
      <ul
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-16"
      >
        {visibleMembers.map((member, index) => {
          const showImage = !!member.image && member.image.approvedForWeb;
          // First row (lg: 4 cols, md: 3, base: 2) is just-below-fold after
          // the hero. Load those eagerly with high priority so they paint
          // immediately. Everything else lazy-loads with a generous
          // prefetch margin so it's already in flight by scroll time.
          const isFirstRow = index < 4;
          return (
            <li key={member.name}>
              <MediaAperture
                ratio="2/3"
                src={showImage ? renderUrl(member.image!.src, { width: 720, quality: 70 }) : undefined}
                srcSet={showImage ? renderSrcSet(member.image!.src, [360, 540, 720, 1080], 70) : undefined}
                alt={
                  showImage
                    ? member.image!.alt
                    : `Portrait slot for ${member.name}`
                }
                sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw"
                lazy={!isFirstRow}
                fetchPriority={isFirstRow ? "high" : undefined}
                prefetchMargin="1400px"
                revealReady={isFirstRow ? firstRowReady : undefined}
                onLoad={isFirstRow ? reportFirstRowLoad : undefined}
                className={member.imageClassName}
              />
              <p className="mt-5 font-display text-lg md:text-xl leading-tight text-charcoal">
                {member.name}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-charcoal/55">
                {member.role}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
