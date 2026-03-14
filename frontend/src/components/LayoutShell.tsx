"use client";

import { useState, useCallback } from "react";
import Navbar from "./Navbar";
import { MobileTabBar } from "./MobileTabBar";
import { ProfileDrawer } from "./ProfileDrawer";
import { LiveActivityFeed } from "./LiveActivityFeed";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const handleOpenProfile = useCallback(() => {
    setProfileOpen(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setProfileOpen(false);
  }, []);

  return (
    <>
      <Navbar onOpenProfile={handleOpenProfile} />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 sm:pb-8">
        {children}
      </main>
      <MobileTabBar onOpenProfile={handleOpenProfile} />
      <ProfileDrawer
        open={profileOpen}
        onClose={handleCloseProfile}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((s) => !s)}
      />
      <LiveActivityFeed />
    </>
  );
}
