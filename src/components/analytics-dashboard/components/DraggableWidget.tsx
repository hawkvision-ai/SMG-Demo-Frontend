import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { type DashboardWidget } from './DragDropProvider';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  children: React.ReactNode;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get background color based on widget type
  const getWidgetBorderColor = (type: string) => {
    switch (type) {
      case 'comparison':
        return 'border-purple-200 bg-purple-50/30';
      case 'filters':
        return 'border-green-200 bg-green-50/30';
      case 'chart':
        return 'border-blue-200 bg-blue-50/30';
      case 'counter':
         return 'border-orange-200 bg-orange-50/30';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  // For filters, show the grip icon centered vertically next to the FilterPanel
  if (widget.type === 'filters') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`rounded-lg shadow-sm border mb-6 ${getWidgetBorderColor(widget.type)}`}
      >
        <div className="p-4 flex items-center">
          <div className="flex-1">
            {/* Clone the children and pass the drag props to the FilterPanel */}
            {React.cloneElement(children as React.ReactElement<any>, {
              dragAttributes: attributes,
              dragListeners: listeners,
            })}
          </div>
          <button
            {...attributes}
            {...listeners}
            className="p-1 ml-4 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors flex items-center"
            title="Drag to reorder"
          >
            <GripVertical size={20} />
          </button>
        </div>
      </div>
    );
  }

  // // For chart and comparison widgets, integrate drag handle with the chart's header
  // if (widget.type === 'chart' || widget.type === 'comparison') {
  //   return (
  //     <div
  //       ref={setNodeRef}
  //       style={style}
  //       className={`rounded-lg shadow-sm border mb-6 ${getWidgetBorderColor(widget.type)}`}
  //     >
  //       <div className="p-4">
  //         {/* Clone the children and pass the drag props to the chart component */}
  //         {React.cloneElement(children as React.ReactElement<any>, {
  //           dragAttributes: attributes,
  //           dragListeners: listeners,
  //         })}
  //       </div>
  //     </div>
  //   );
  // }

  // Default fallback for other widget types
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg shadow-sm border mb-6 ${getWidgetBorderColor(widget.type)}`}
    >
      <div className="relative">
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing transition-colors z-10"
        title="Drag to reorder"
      >
        <GripVertical size={20} />
      </button>
      <div className="p-4">{children}</div>
      </div>
    </div>
  );
};