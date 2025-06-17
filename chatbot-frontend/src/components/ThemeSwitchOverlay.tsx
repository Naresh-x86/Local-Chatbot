import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeSwitchOverlayProps {
  show: boolean;
  theme: "dark" | "light";
}

const FADE_DURATION = 300;

const ThemeSwitchOverlay: React.FC<ThemeSwitchOverlayProps> = ({ show, theme }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [show]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400
        ${visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        ${theme === "dark" ? "bg-neutral-950" : "bg-white"}
      `}
      style={{ transition: `opacity ${FADE_DURATION}ms` }}
    >
      <div className="flex flex-col items-center">
        {theme === "dark" ? (
          <Moon className="w-14 h-14 text-neutral-100 mb-4 animate-pulse" />
        ) : (
          <Sun className="w-14 h-14 text-yellow-400 mb-4 animate-pulse" />
        )}
        <span className={theme === "dark"
          ? "text-2xl font-semibold text-neutral-100"
          : "text-2xl font-semibold text-gray-900"}>
          Switching to {theme === "dark" ? "Dark" : "Light"} theme
        </span>
      </div>
    </div>
  );
};

export default ThemeSwitchOverlay;
