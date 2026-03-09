import { CustomIcon } from "./CustomIcon";
import { Button } from "./button";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";

type TState = "dark" | "light" | "system";

interface ThemeState {
  data: TState;
  setData: (data: TState) => void;
}

const useInitThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      data: "dark",
      setData: (data) => set({ data }),
    }),
    { name: "theme" },
  ),
);

function useThemeStoreSideEffect() {
  const themeStore = useInitThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (themeStore.data === "system") {
      const isDefaultDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme = isDefaultDarkMode ? "dark" : "light";

      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeStore.data);
    }
  }, [themeStore.data]);

  return null;
}

export const useThemeStore = () => {
  const initThemeStore = useInitThemeStore();
  useThemeStoreSideEffect();

  const cycleTheme = () => {
    const theme = initThemeStore.data;
    initThemeStore.setData(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };

  return { ...initThemeStore, cycleTheme };
};

export function ThemeToggle() {
  const themeStore = useThemeStore();
  const theme = themeStore.data;

  return (
    <Button
      variant="outline"
      onClick={themeStore.cycleTheme}
      title={(() => {
        return theme === "light" ? "Light mode" : theme === "dark" ? "Dark mode" : "System theme";
      })()}
    >
      <CustomIcon
        iconName={theme === "light" ? "Sun" : theme === "dark" ? "Moon" : "Monitor"}
        size="sm"
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
