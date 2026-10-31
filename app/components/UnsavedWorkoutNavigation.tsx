"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

type NavigationGuard = {
  setBlocked: (blocked: boolean) => void;
  confirmNavigation: () => boolean;
};

const NavigationContext = createContext<NavigationGuard | null>(null);

export function UnsavedWorkoutNavigationProvider({ children }: {
  children: ReactNode;
}) {
  const blockedRef = useRef(false);
  const guard = useMemo<NavigationGuard>(() => ({
    setBlocked(blocked) {
      blockedRef.current = blocked;
    },
    confirmNavigation() {
      return !blockedRef.current || window.confirm(
        "You have unsaved set edits. Leave this workout and discard those edits?",
      );
    },
  }), []);

  return (
    <NavigationContext.Provider value={guard}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useUnsavedWorkoutNavigation() {
  const guard = useContext(NavigationContext);
  if (!guard) {
    throw new Error("Workout navigation must be inside UnsavedWorkoutNavigationProvider.");
  }
  return guard;
}

type GuardedLinkProps = Omit<ComponentProps<typeof Link>, "onNavigate">;

export function GuardedWorkoutLink(props: GuardedLinkProps) {
  const { confirmNavigation } = useUnsavedWorkoutNavigation();
  return (
    <Link {...props} onNavigate={(event) => {
      if (!confirmNavigation()) event.preventDefault();
    }} />
  );
}
