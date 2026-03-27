"use client";

import { useState } from "react";
import { AboutSection } from "./about-section";

export function Footer() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-center gap-1 px-4 py-3 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        aria-expanded={isExpanded}
      >
        <span>Made by Kenny Geiler</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: isExpanded ? "500px" : "0px" }}
      >
        <div className="px-6 pb-6 pt-2">
          <AboutSection />
        </div>
      </div>
    </footer>
  );
}
