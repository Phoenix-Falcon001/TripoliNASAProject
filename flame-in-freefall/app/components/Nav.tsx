"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/earth-vs-space", label: "Earth vs Space" },
  { href: "/ask", label: "Ask" },
  { href: "/gaps", label: "What NASA doesn't know" },
  { href: "/data", label: "Data" },
  { href: "/method", label: "Method" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/explore") return pathname.startsWith("/explore") || pathname.startsWith("/card/");
  return pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="border-b border-neutral-200 bg-neutral-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2">
        <Link href="/" className="mr-4 font-bold tracking-tight">
          🔥 Flame in Freefall
        </Link>
        <ul className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded px-3 py-1.5 hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-white ${
                    active ? "bg-neutral-700 font-semibold underline underline-offset-4" : ""
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
