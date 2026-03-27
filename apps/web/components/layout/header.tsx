"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "library" },
  { href: "/settings", label: "settings" },
  { href: "/settings/categories", label: "categories" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800/50 bg-zinc-950">
      <div className="flex h-12 items-center justify-between px-4">
        <Link href="/" className="text-base font-bold tracking-tight text-zinc-100">
          readXlater
        </Link>
      </div>

      <nav className="flex items-center gap-1 px-4 pb-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
