// ROIDetailsPanel.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, ArrowUp, ArrowDown } from 'lucide-react';


interface ROI {
  id: string;
  name: string;
  coordinates: any[];
  func_tag_ids?: string[];
}

interface ROIDetailsPanelProps {
  selectedROI: ROI | null;
  useCaseViewMode: 'use-cases' | 'boundaries';
  onSetUseCaseViewMode: (mode: 'use-cases' | 'boundaries') => void;
  onSetupBoundaries: () => void;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyStateMessage?: string;
}

const ROIDetailsPanel: React.FC<ROIDetailsPanelProps> = ({
  selectedROI,
  useCaseViewMode,
  onSetUseCaseViewMode,
  onSetupBoundaries,
  children,
  isEmpty = false,
  emptyStateMessage
}) => {
  const ModeSwitch = () => (
    <div className="mb-0.5 flex items-center justify-center">
      <div className="w-full flex items-center gap-2">
        <div className="flex w-full rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => onSetUseCaseViewMode('use-cases')}
            className={`w-1/2 rounded-md px-3 py-1 text-sm font-medium transition-colors ${useCaseViewMode === 'use-cases'
              ? 'bg-teal-600 text-white'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Use Cases
          </button>
          <button
            onClick={() => onSetUseCaseViewMode('boundaries')}
            className={`w-1/2 rounded-md px-3 py-1 text-sm font-medium transition-colors ${useCaseViewMode === 'boundaries'
              ? 'bg-teal-600 text-white'
              : 'text-gray-600 hover:text-gray-800'
              }`}
          >
            Boundaries
          </button>
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col border border-gray-200 rounded-lg bg-gray-50 items-center justify-center h-[30%] text-center space-y-4">
      {selectedROI ? (
        <>
          <p className="text-gray-500 text-sm">
            {emptyStateMessage || `No ${useCaseViewMode === 'use-cases' ? 'use cases' : 'boundary conditions'} configured!`}
          </p>
          {useCaseViewMode === 'boundaries' && (
            <Button
              onClick={onSetupBoundaries}
              className="flex items-center gap-2  text-black-700 hover:bg-red-200 px-6 py-4 rounded-lg"
              style={{ backgroundColor: '#D6FAF1' }}
            >
              <span className="text-sm">+</span>
              Set-up Boundaries Conditions
            </Button>
          )}
        </>
      ) : (
        <p className="text-gray-500">
          Select an ROI to view {useCaseViewMode === 'use-cases' ? 'use cases' : 'boundaries'}
        </p>
      )}
    </div>
  );

  return (
    <div className="w-full lg:w-3/12">
      <div className="h-[60vh] lg:h-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <ModeSwitch />
        {isEmpty ? <EmptyState /> : children}
      </div>
    </div>
  );
};

// BoundariesViewOnlyPanel.tsx
interface BoundariesViewOnlyPanelProps {
  selectedROI: ROI | null;
  boundariesData: Array<{
    boundary: string;
    inward: Array<{ label: string; type: 'notify' | 'increment' | 'decrement' }>;
    outward: Array<{ label: string; type: 'notify' | 'increment' | 'decrement' }>;
  }>;
  onEditBoundaries?: () => void;
}

const BoundariesViewOnlyPanel: React.FC<BoundariesViewOnlyPanelProps> = ({
  selectedROI,
  boundariesData,
  onEditBoundaries
}) => {
  const getActionColor = (type: 'notify' | 'increment' | 'decrement') => {
    switch (type) {
      case 'notify':
        return 'bg-blue-50 border-blue-200 text-black';
      case 'increment':
        return 'bg-green-50 border-green-200 text-black';
      case 'decrement':
        return 'bg-red-50 border-red-200 text-black';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };


  const getActionIcon = (type: 'notify' | 'increment' | 'decrement') => {
    switch (type) {
      case 'notify':
        return <Bell className="w-3 h-3" />;
      case 'increment':
        return <ArrowUp className="w-3 h-3" />;
      case 'decrement':
        return <ArrowDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (!selectedROI) {
    return null;
  }

  // Check if any boundaries have configurations
  const hasBoundaryConfigs = boundariesData.some(boundary =>
    boundary.inward.length > 0 || boundary.outward.length > 0
  );

  return (
    <div className="h-[90%] flex flex-col">
      <div className="flex-1 overflow-x-auto overflow-y-auto mt-2">
        <div className="min-w-[350px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[100px_1fr_1fr] gap-0 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-300">
            <div className="font-bold text-sm p-4 border-r border-gray-200 text-gray-700">
              Boundary
            </div>
            <div className="font-bold text-sm text-center p-4 border-r border-gray-200 text-gray-700">
              Inward
            </div>
            <div className="font-bold text-sm text-center p-4 text-gray-700">
              Outward
            </div>
          </div>

          {/* Boundaries Data */}
          {boundariesData.map(({ boundary, inward, outward }) => (
            <div key={boundary} className="grid grid-cols-[100px_1fr_1fr] gap-0 border-b border-gray-300 last:border-b-0">
              <div className="font-semibold text-md p-4 border-r border-gray-300 bg-white flex items-center justify-center text-gray-800">
                {boundary}
              </div>

              {/* Inward Column */}
              <div className="p-2 border-r border-gray-200 bg-white min-h-[80px] flex items-center">
                {inward.length > 0 ? (
                  <div className="w-full space-y-1">
                    {inward.map((item, idx) => (
                      <div
                        key={idx}
                        className={`text-xs border rounded px-2 py-1 flex items-start gap-1 ${getActionColor(item.type)}`}
                      >
                        <span className="flex-shrink-0 mt-0.5">{getActionIcon(item.type)}</span>
                        <span className="flex-1 break-words leading-tight text-xs">{item.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center h-full text-gray-400 text-xs">
                    No condition
                  </div>
                )}
              </div>

              {/* Outward Column */}
              <div className="p-2 bg-white min-h-[80px] flex items-center">
                {outward.length > 0 ? (
                  <div className="w-full space-y-1">
                    {outward.map((item, idx) => (
                      <div
                        key={idx}
                        className={`text-xs border rounded px-2 py-1 flex items-start gap-1 ${getActionColor(item.type)}`}
                      >
                        <span className="flex-shrink-0 mt-0.5">{getActionIcon(item.type)}</span>
                        <span className="flex-1 break-words leading-tight text-xs">{item.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center h-full text-gray-400 text-xs">
                    No condition
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Boundaries Button - positioned at bottom center */}
      {hasBoundaryConfigs && onEditBoundaries && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={onEditBoundaries}
            variant="outline"
            className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg text-sm font-medium shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Boundaries Conditions
          </Button>
        </div>
      )}
    </div>
  );
};

export { ROIDetailsPanel, BoundariesViewOnlyPanel };