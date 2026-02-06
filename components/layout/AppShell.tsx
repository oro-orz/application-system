"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

interface AppShellProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function AppShell({ header, left, center, right }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {header}
          <div className="flex-1 flex min-h-0 gap-4 p-4 overflow-hidden">
            <div className="w-80 flex-shrink-0 flex flex-col min-h-0 rounded-2xl bg-card overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">{left}</div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col min-h-0 rounded-2xl bg-card overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">{center}</div>
            </div>
            <div className="w-[400px] flex-shrink-0 flex flex-col min-h-0 rounded-2xl bg-card overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto">{right}</div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
