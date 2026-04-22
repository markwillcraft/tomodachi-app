"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// React 19 + Next 16 warn when components render `<script>` tags. next-themes
// intentionally emits one to prevent dark-mode FOUC, and the maintainer
// workaround (pacocoursey/next-themes#387) is to hand the script a
// non-executable `type` on the client: it already ran during SSR before
// hydration to set the correct `class` on <html>, so the client re-render
// doesn't need to execute anything.
const CLIENT_SCRIPT_PROPS =
  typeof window === "undefined"
    ? undefined
    : ({ type: "application/json" } as const);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      scriptProps={CLIENT_SCRIPT_PROPS}
    >
      {children}
    </NextThemesProvider>
  );
}
