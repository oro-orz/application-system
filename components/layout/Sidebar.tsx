"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { faArchive } from "@fortawesome/free-solid-svg-icons";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";

const navItems = [
  { href: "/", icon: faFileLines, label: "TMG精算" },
  { href: "/archive", icon: faArchive, label: "アーカイブ" },
  { href: "/leave", icon: faCalendarDays, label: "休暇申請" },
];

export function Sidebar() {
  return (
    <aside
      className="w-16 flex-shrink-0 bg-base flex flex-col rounded-r-xl"
      aria-label="メインナビゲーション"
    >
      <div className="p-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-center h-12 w-12 rounded-xl text-base-foreground/80 hover:bg-white/10 hover:text-base-foreground transition-colors"
            title={item.label}
            aria-label={item.label}
          >
            <FontAwesomeIcon icon={item.icon} className="text-lg" />
          </Link>
        ))}
      </div>
    </aside>
  );
}
