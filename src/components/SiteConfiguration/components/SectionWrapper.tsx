import { Button } from "@/components/ui/button";
import { History, Search } from "lucide-react";
import React, { ReactNode, useEffect } from "react";

interface SectionWrapperProps {
  entityName: string;
  iconSrc?: string;
  children: ReactNode;
  showSearch?: boolean;
  showSelect?: boolean;
  showAddButton?: boolean;
  showConfigHistoryButton?: boolean;
  height?: string;
  onAdd?: () => void;
  onSearch?: (term: string) => void;
  onBack?: () => void;
  onConfigHistory?: () => void;
  customActionComponent?: ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  entityName,
  iconSrc,
  children,
  showSearch = false,
  showAddButton = false,
  showConfigHistoryButton = false,
  height = "70vh",
  onAdd,
  onSearch,
  onConfigHistory,
  customActionComponent,
}) => {
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .scrollbar-container::-webkit-scrollbar {
        width: 8px;
      }
      
      .scrollbar-container::-webkit-scrollbar-track {
        background-color: rgba(229, 231, 235, 0.5);
        border-radius: 4px;
      }
      
      .scrollbar-container::-webkit-scrollbar-thumb {
        background-color: rgba(156, 163, 175, 0.5);
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .scrollbar-container::-webkit-scrollbar-thumb:hover {
        background-color: rgba(156, 163, 175, 0.8);
      }
      
      .scrollbar-container {
        scrollbar-width: thin;
        scrollbar-color: rgba(156, 163, 175, 0.5) rgba(229, 231, 235, 0.5);
      }
    `;

    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div
      className="flex w-full flex-col rounded-xl bg-gray-100 p-3 shadow-md sm:p-6"
      style={{ height }}
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          {iconSrc && <img src={iconSrc} alt={entityName} className="mr-2 h-6 w-6 sm:h-8 sm:w-8" />}
          <h1 className="text-xl font-bold text-gray-800 capitalize sm:text-2xl">{entityName}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {showSearch && (
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder={`Search ${entityName}...`}
                className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none sm:w-auto"
                onChange={(e) => onSearch && onSearch(e.target.value)}
              />
              <Search className="absolute top-2.5 left-3 text-gray-400" size={18} />
            </div>
          )}

          {customActionComponent && <div className="hidden sm:block">{customActionComponent}</div>}

          {/* Config History Button - Hidden on mobile, visible on desktop */}
          {showConfigHistoryButton && onConfigHistory && (
            <Button
              onClick={onConfigHistory}
              className="hidden items-center rounded-lg border border-gray-400 bg-gray-100 px-4 py-2 text-gray-800 hover:bg-gray-200 max-sm:!hidden sm:flex"
            >
              <History className="mr-2 h-4 w-4" />
              <span>Config History</span>
            </Button>
          )}

          {showAddButton && onAdd && (
            <Button
              onClick={onAdd}
              className="hidden items-center rounded-lg bg-teal-700 px-4 py-2 text-sm whitespace-nowrap text-white transition hover:bg-teal-800 sm:flex"
            >
              <span className="mr-1">+</span> Add {entityName}
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable content container */}
      <div className="scrollbar-container flex-1 overflow-y-auto pr-1">{children}</div>
    </div>
  );
};

export default SectionWrapper;
