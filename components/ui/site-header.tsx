import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-2.5 rounded-full font-medium">
        <Image src="/brand/claww-logo.jpg" alt="" width={32} height={32} className="rounded-full" priority />
        <span>CLAWW</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}
