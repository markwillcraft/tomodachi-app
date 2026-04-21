import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Japanese Quiz",
  description:
    "Import romaji, auto-fill kana and meaning with Gemini, and quiz yourself.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("min-h-screen antialiased")}>
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "hsl(217 91% 60%)",
              borderRadius: "0.5rem",
            },
          }}
        >
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
