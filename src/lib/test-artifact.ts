// Test-artifact predicate — one definition, used everywhere a row could reach
// a public query or an admin queue.
//
// The E2E specs create real inventory rows ("ZZ E2E Test Piece <stamp>").
// They now tear themselves down, but teardown can be skipped by a crash or a
// killed run, so this is the second line of defence: an artifact that survives
// a run is still invisible to the live catalog and to Taxonomy Studio.
//
// Mirrored (deliberately, 3 lines) in scripts/bake-catalog.mjs — that script is
// plain node and outside the app's module graph.

const TEST_TITLE = /^\s*ZZ E2E\b/i;
const TEST_RMS = /^ZZ-E2E/i;

export function isTestArtifact(row: {
  title?: string | null;
  rms_id?: string | null;
  id?: string | null;
}): boolean {
  if (row.title && TEST_TITLE.test(row.title)) return true;
  const rms = row.rms_id ?? row.id ?? null;
  return !!rms && TEST_RMS.test(rms);
}
