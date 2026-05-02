import { MediaAperture } from "@/components/media-aperture";

// ---------------------------------------------------------------------------
// Atelier — THE TEAM module
//
// Real staff module. NOT a paragraph. NOT decoration.
//
// Rendering rules:
// - Empty TEAM array         → portrait apertures only, no fake names/roles.
// - Real entry, no image     → portrait aperture + name + role.
// - Image present, no name   → DO NOT render publicly (gated below).
// - Image present + name     → portrait + name + role; image must also have
//                              `approvedForWeb: true` to surface.
//
// Never: fake bios, stock portraits, silhouettes, "photo pending" placards,
// dashed upload boxes, developer gray blocks.
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

/**
 * Real staff roster. Owner-curated. Empty by default — the section still
 * renders empty portrait apertures so the people area is visibly ready.
 */
export const TEAM: TeamMember[] = [];

/** Number of empty portrait slots when no roster data exists yet. */
const EMPTY_PORTRAIT_SLOTS = 4;

export function AtelierTeam() {
  // Public-render gate: a member must have a real name + role. Images only
  // surface when explicitly approved; otherwise the slot stays as an
  // aperture under the name + role.
  const visibleMembers = TEAM.filter(
    (m) => m.name.trim().length > 0 && m.role.trim().length > 0,
  );

  return (
    <div className="grid md:grid-cols-12 gap-10">
      {/* Left column: section intent. The eyebrow lives on the parent
          <Section> wrapper so the editorial rhythm matches the rest of
          the Atelier page. */}
      <div className="md:col-span-5 space-y-5">
        <p className="font-display italic text-2xl md:text-3xl leading-[1.2] text-charcoal/80">
          Professional, precise, and approachable.
        </p>
        <p className="text-base leading-relaxed text-charcoal/70">
          The Atelier is a small team of designers, fabricators, and producers
          working under a single roof in Denver. Each project is led by a
          designer who stays with it from concept through install.
        </p>
        <p className="text-base leading-relaxed text-charcoal/70">
          Personality is welcome. The studio is rigorous about craft and
          relaxed about everything else.
        </p>
      </div>

      {/* Right column: staff grid OR designed empty portrait apertures. */}
      <div className="md:col-span-7">
        {visibleMembers.length > 0 ? (
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
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
                  <p className="mt-4 font-display text-xl leading-tight">
                    {member.name}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-charcoal/55">
                    {member.role}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          // Empty roster — designed portrait apertures, no fake people.
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {Array.from({ length: EMPTY_PORTRAIT_SLOTS }).map((_, i) => (
              <li key={i}>
                <MediaAperture ratio="4/5" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
