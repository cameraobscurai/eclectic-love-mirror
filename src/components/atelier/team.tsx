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
}

// Helper: build an approved portrait entry from a storage filename.
const portrait = (filename: string, name: string): TeamMemberImage => ({
  src: teamPhotoUrl(filename),
  alt: `Portrait of ${name}`,
  approvedForWeb: true,
});

/**
 * Real staff roster. Owner-curated. Portraits surface only when
 * `image.approvedForWeb === true`; until then each card shows the
 * MediaAperture frame under the real name + role.
 *
 * Portraits are paired by first name from the `team-photos` bucket.
 * Members with multiple files (e.g. Jill.jpg, Jill2.jpg) currently use
 * the primary; secondary files are reserved for hover/alt states.
 * Regina has no portrait on file yet — her card stays as an aperture.
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
  { name: "Sarah Lilly-Ray", role: "Warehouse Operations", image: portrait("Sarah.jpg", "Sarah Lilly-Ray") },
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

  return (
    <div>
      {/* Section header — display title left, short tagline right.
          Mirrors the reference: oversized serif title balanced by a
          quiet two-line aside. */}
      <div className="grid md:grid-cols-12 gap-x-10 gap-y-6 items-end mb-16 md:mb-24">
        <h2
          className="md:col-span-7 font-display tracking-[-0.01em] leading-[0.95] text-charcoal"
          style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
        >
          The Humans
        </h2>
        <p className="md:col-span-5 md:col-start-8 text-base md:text-[17px] leading-relaxed text-charcoal/70 max-w-md">
          Professional but approachable. We love what we do
          <br className="hidden md:inline" /> — and it shows.
        </p>
      </div>

      {/* Portrait grid — single 4-column rhythm. Apertures hold the slot
          until owner-approved portraits land. Names + roles render now. */}
      <ul
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-12 md:gap-y-16"
      >
        {visibleMembers.map((member) => {
          const showImage = !!member.image && member.image.approvedForWeb;
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
