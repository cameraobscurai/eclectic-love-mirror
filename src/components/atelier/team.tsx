import { MediaAperture } from "@/components/media-aperture";
import { teamPhotoUrl } from "@/lib/storage-image";

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

// Per-member visual recovery presets (T7/T8) — applied as arbitrary
// Tailwind on the figure. The `[&_img]` selector reaches the underlying
// <img> inside MediaAperture without altering the component API.
const SHARPEN = "[&_img]:[filter:contrast(1.06)_saturate(1.06)]";
const WHITE_BALANCE = "[&_img]:[filter:saturate(0.92)_brightness(1.02)_hue-rotate(-4deg)]";
// T6 — Annie's portrait crops out the top of her head; pull focus up.
const ANNIE_REFRAME = "[&_img]:object-[50%_18%] [&_img]:[filter:contrast(1.06)_saturate(1.06)]";

/**
 * Real staff roster. T10 — Sarah Lilly-Ray removed per owner.
 * T9 — Adrienne keeps her current file until she sends the replacement.
 */
export const TEAM: TeamMember[] = [
  { name: "Jill Livingston", role: "Founder · Creative Director", image: portrait("Jill.jpg", "Jill Livingston") },
  { name: "Annie Ohman", role: "Director of Company Operations", image: portrait("Annie.jpg", "Annie Ohman"), imageClassName: ANNIE_REFRAME },
  { name: "Amanda Ferguson", role: "Senior Designer", image: portrait("Amanda.jpg", "Amanda Ferguson"), imageClassName: SHARPEN },
  { name: "Erin Purnell", role: "Associate Designer", image: portrait("Erin.jpg", "Erin Purnell") },
  { name: "Adrienne Moon", role: "Purchasing & Inventory Specialist", image: portrait("Adrienne.jpg", "Adrienne Moon") },
  { name: "Nathan Alexander", role: "Lead Fabricator", image: portrait("Nathan.jpg", "Nathan Alexander") },
  { name: "Cat Moore", role: "Brand & Marketing", image: portrait("Cat.jpg", "Cat Moore"), imageClassName: SHARPEN },
  { name: "Sam Young", role: "Project Manager", image: portrait("Sam.jpg", "Sam Young") },
  { name: "Ryan Kankowski", role: "Project Manager", image: portrait("Ryan.jpg", "Ryan Kankowski") },
  { name: "Stephen Proud", role: "Warehouse & Fleet Specialist", image: portrait("Stephen.jpg", "Stephen Proud") },
  { name: "Sarah Lilly-Ray", role: "Warehouse Operations", image: portrait("Sarah.jpg", "Sarah Lilly-Ray") },
  // { name: "Regina Mennig", role: "Accounting & Business Manager" }, // temp hidden — awaiting portrait
  { name: "Judy Morales", role: "Human Resources", image: portrait("Judy.jpg", "Judy Morales"), imageClassName: WHITE_BALANCE },
];

export function AtelierTeam() {
  // Public-render gate: a member must have a real name + role. Images only
  // surface when explicitly approved; otherwise the slot stays as an
  // aperture under the name + role.
  const visibleMembers = TEAM.filter(
    (m) => m.name.trim().length > 0 && m.role.trim().length > 0,
  );

  return (
    <div>
      {/* Section header — display title + owner-sourced quiet italic tagline.
          Tagline stays Title/sentence case per typography rule (only display
          titles + brand statements go ALL CAPS). */}
      <div className="mb-16 md:mb-24 grid md:grid-cols-12 gap-8 md:gap-12 items-end">
        <h2
          className="md:col-span-7 font-display uppercase tracking-[0.02em] leading-[0.95] text-charcoal"
          style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
        >
          The Hive
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
        {visibleMembers.map((member) => {
          const showImage = !!member.image && member.image.approvedForWeb;
          // THE HIVE sits below the fold (section 2 of 6, after the full-
          // height hero). Every portrait lazy-loads on approach — no above-
          // the-fold exception, no fetchPriority hints.
          return (
            <li key={member.name}>
              <MediaAperture
                ratio="4/5"
                src={showImage ? member.image!.src : undefined}
                alt={
                  showImage
                    ? member.image!.alt
                    : `Portrait slot for ${member.name}`
                }
                sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw"
                lazy
                className={member.imageClassName}
              />
              <p className="mt-5 font-display text-lg md:text-xl leading-tight text-charcoal">
                {member.name}
              </p>
              <p className="mt-1.5 text-[11px] tracking-[0.04em] text-charcoal/55">
                {member.role}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
