import { loadFont as loadDisplay } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

export const { fontFamily: DISPLAY } = loadDisplay("normal", {
  weights: ["300", "400", "500"],
  subsets: ["latin"],
});
export const { fontFamily: BODY } = loadBody("normal", {
  weights: ["300", "400", "500"],
  subsets: ["latin"],
});
