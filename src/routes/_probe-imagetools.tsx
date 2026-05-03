import { createFileRoute } from "@tanstack/react-router";
import { probe } from "../../scripts-tmp/imagetools-probe";

// TEMP route — verifies vite-imagetools emits hero variants in the build.
// Delete after verification.
export const Route = createFileRoute("/_probe-imagetools")({
  component: () => (
    <pre style={{ padding: 24, fontSize: 11 }}>
      {JSON.stringify(probe, null, 2)}
    </pre>
  ),
});
