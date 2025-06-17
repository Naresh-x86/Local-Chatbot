import React, { useState, Suspense } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ChatHeader";
import { Wrench, ChevronRight } from "lucide-react";
import { ToolWindowId, TOOL_WINDOWS } from "@/types/ToolWindow";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Add this static mapping
const TOOL_COMPONENTS = {
  hyperparameter_tuning: React.lazy(() => import('./tools/HyperparameterTuning')),
  documentation_explorer: React.lazy(() => import('./tools/DocumentationExplorer')),
  // Add other tool components here following the same pattern
} as const;

interface ToolBarProps {
  isOpen: boolean;
  onToggle: () => void;
  visible?: boolean; // new prop
}

const sidebarShadowOpacity = 0.08;

const ToolBar: React.FC<ToolBarProps> = ({ isOpen, onToggle, visible = true }) => {
  const { theme } = useTheme();
  const [selectedTool, setSelectedTool] = useState<ToolWindowId>('hyperparameter_tuning');

  if (!visible) return null;

  const selectedToolWindow = TOOL_WINDOWS.find(tool => tool.id === selectedTool);

  const getToolWindowComponent = () => {
    if (!selectedToolWindow) return null;
    
    const Component = TOOL_COMPONENTS[selectedTool] ?? (() => <div>Tool not found</div>);

    return (
      <Suspense fallback={
        <div className={cn(
          "flex items-center justify-center h-full",
          theme === 'dark' ? "text-neutral-400" : "text-gray-500"
        )}>
          Loading...
        </div>
      }>
        <Component />
      </Suspense>
    );
  };

  return (
    <div className="relative h-full">
      {/* Toggle button (wrench or chevron) */}
      <button
        onClick={onToggle}
        className={cn(
          "absolute right-full top-4 z-10 flex items-center justify-center rounded-xl transition-all duration-200",
          theme === "dark"
            ? "bg-neutral-900 hover:bg-neutral-950 border border-neutral-800 shadow-[0_4px_4px_rgba(0,0,0,0.8)]"
            : "bg-white hover:bg-gray-100 border border-gray-200 shadow",
          "w-12 h-12"
        )}
        aria-label={isOpen ? "Close toolbar" : "Open toolbar"}
        style={{
          marginRight: isOpen ? 17 : 15,
        }}
      >
        {isOpen ? (
          <ChevronRight className={theme === "dark" ? "h-6 w-6 text-neutral-200" : "h-6 w-6 text-gray-800"} />
        ) : (
          <Wrench className={theme === "dark" ? "h-6 w-6 text-neutral-400" : "h-6 w-6 text-gray-500"} />
        )}
      </button>
      {/* Toolbar panel */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out h-full",
          theme === "dark"
            ? "bg-gradient-to-br from-neutral-900 to-neutral-950 border-l border-neutral-800"
            : "bg-gradient-to-br from-gray-50 to-gray-100 border-l border-gray-200",
          isOpen ? "w-80" : "w-0"
        )}
        style={{
          boxShadow: `-4px 0 16px 0 rgba(0,0,0,${sidebarShadowOpacity})`,
          zIndex: 2,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isOpen && (
          <>
            <div
              className={cn(
              "p-4 border-b",
              theme === "dark" ? "border-neutral-800" : "border-neutral-200"
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between",
                      theme === 'dark'
                        ? "bg-neutral-800 border-neutral-700 text-neutral-200"
                        : "bg-white border-gray-200"
                    )}
                  >
                    {selectedToolWindow?.name || 'Select Tool'}
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className={theme === 'dark'
                  ? "w-[286px] bg-neutral-800 border-neutral-700"
                  : "w-[286px]"}
                >
                  {TOOL_WINDOWS.map((tool) => (
                    <DropdownMenuItem
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id)}
                      className={cn(
                        theme === 'dark'
                          ? "text-neutral-200 hover:bg-neutral-700"
                          : "text-gray-900 hover:bg-gray-100",
                        selectedTool === tool.id && (
                          theme === 'dark'
                            ? "bg-neutral-700"
                            : "bg-gray-100"
                        )
                      )}
                    >
                      {tool.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 overflow-auto">
              {getToolWindowComponent()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ToolBar;
