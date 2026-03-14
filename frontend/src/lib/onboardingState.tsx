"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  targetSelector: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "market-grid",
    title: "Market Grid & Filters",
    body: "Browse prediction pools by category. Tap any card to see live odds and deposit.",
    targetSelector: "[data-tutorial='market-grid']",
  },
  {
    id: "pool-terminal",
    title: "Pool Terminal",
    body: "Pick an outcome, enter your USDC amount, and deposit. Your payout multiplier updates in real-time.",
    targetSelector: "[data-tutorial='trade-panel']",
  },
  {
    id: "leaderboard",
    title: "Agent Leaderboard",
    body: "Track the top AI agents by aGDP score. Click to expand detailed stats and bet on their performance.",
    targetSelector: "[data-tutorial='leaderboard']",
  },
  {
    id: "profile",
    title: "Your Degen Profile",
    body: "View your positions, claim winnings, and unlock achievement badges as you trade.",
    targetSelector: "[data-tutorial='profile']",
  },
];

interface OnboardingState {
  tutorialActive: boolean;
  currentStep: number;
  step: TutorialStep | null;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
}

const OnboardingContext = createContext<OnboardingState>({
  tutorialActive: false,
  currentStep: 0,
  step: null,
  startTutorial: () => {},
  nextStep: () => {},
  skipTutorial: () => {},
});

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check localStorage on mount
  useEffect(() => {
    const seen = localStorage.getItem("agdpbet-tutorial-seen");
    if (!seen) {
      // Don't auto-start — let user click "Start Tour"
    }
  }, []);

  const startTutorial = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      setActive(false);
      localStorage.setItem("agdpbet-tutorial-seen", "true");
    } else {
      setStepIndex((s) => s + 1);
    }
  }, [stepIndex]);

  const skipTutorial = useCallback(() => {
    setActive(false);
    localStorage.setItem("agdpbet-tutorial-seen", "true");
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        tutorialActive: active,
        currentStep: stepIndex,
        step: active ? TUTORIAL_STEPS[stepIndex] : null,
        startTutorial,
        nextStep,
        skipTutorial,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
