"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/try", label: "Try on", icon: "✨" },
  { href: "/catalog", label: "Sarees", icon: "🧵" },
  { href: "/results", label: "Compare", icon: "📊" },
];

export default function Nav() {
  const path = usePathname();
  if (path.startsWith("/login")) return null;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur md:static md:border-0 md:bg-transparent">
      <div className="mx-auto flex max-w-5xl justify-around md:justify-end md:gap-2 md:px-4 md:pt-4">
        {tabs.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href) || (t.href === "/results" && path.startsWith("/session"));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center py-2 text-xs md:flex-none md:flex-row md:gap-1 md:rounded-full md:px-4 md:text-sm ${
                active ? "text-maroon font-semibold md:bg-maroon/10" : "text-stone-500"
              }`}
            >
              <span className="text-lg md:text-base">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
