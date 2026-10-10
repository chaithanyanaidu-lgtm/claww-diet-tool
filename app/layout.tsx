import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const sans = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: { default: "CLAWW Diet", template: "%s · CLAWW Diet" },
  description: "A day of Indian meals, weighed to your body and goal.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141816" },
  ],
};

// Applies a saved manual theme before first paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem("claww:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
