import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

// Flat white — same as the site (--background / --cream / --paper = #ffffff).
// No warm wash, no grain. The site's whitespace IS the design.
export const PaperBackground: React.FC = () => {
  return <AbsoluteFill style={{ backgroundColor: COLORS.paper }} />;
};
