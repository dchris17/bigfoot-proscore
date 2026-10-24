/**
 * Fonts for The Footprint. Shell applies these CSS variables on its wrapper,
 * so nothing needs to change in app/layout.tsx.
 *  - Nexa Rust Sans Black (Bigfoot brand font, already in /public/fonts): wordmark and names
 *  - Barlow Condensed: scores, numbers and section labels
 *  - Public Sans: body text
 */
import { Barlow_Condensed, Public_Sans } from "next/font/google";
import localFont from "next/font/local";

export const fpBarlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--fp-font-barlow",
  display: "swap",
});

export const fpPublicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fp-font-public",
  display: "swap",
});

export const fpNexaRust = localFont({
  src: "../../../public/fonts/NexaRustSans-Black.otf",
  weight: "900",
  variable: "--fp-font-rust",
  display: "swap",
});

export const fpFontVars = `${fpBarlow.variable} ${fpPublicSans.variable} ${fpNexaRust.variable}`;
