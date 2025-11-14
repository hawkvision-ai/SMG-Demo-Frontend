import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface DashboardWidget {
  id: string;
  type: "chart" | "filters" | "comparison" | "table" | "summary" | "counter";
  title: string;
  component: React.ComponentType<any>;
  props?: any;
}

interface DragDropContextType {
  widgets: DashboardWidget[];
  setWidgets: React.Dispatch<React.SetStateAction<DashboardWidget[]>>;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within a DragDropProvider");
  }
  return context;
};

interface DragDropProviderProps {
  children: React.ReactNode;
  initialWidgets: DashboardWidget[];
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children, initialWidgets }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(initialWidgets);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);

  // Initialize widget order on first load
  useEffect(() => {
    if (widgetOrder.length === 0) {
      const initialOrder = initialWidgets.map((widget) => widget.id);
      setWidgetOrder(initialOrder);
      setWidgets(initialWidgets);
    }
  }, [initialWidgets, widgetOrder.length]);

  // Smart update function that preserves order while updating props
  const updateWidgetsPreservingOrder = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets((currentWidgets) => {
      // Create a map of new widgets by ID for easy lookup
      const newWidgetMap = new Map(newWidgets.map((widget) => [widget.id, widget]));

      // Get current widget IDs in their current order
      const currentOrder = currentWidgets.map((w) => w.id);

      // Find widgets that are new (not in current order)
      const newWidgetIds = newWidgets.map((w) => w.id).filter((id) => !currentOrder.includes(id));

      // Find widgets that no longer exist
      const removedWidgetIds = currentOrder.filter((id) => !newWidgetMap.has(id));

      // Update the order: remove deleted widgets and add new ones at the end
      let updatedOrder = currentOrder.filter((id) => !removedWidgetIds.includes(id));
      updatedOrder = [...updatedOrder, ...newWidgetIds];

      // Update the stored order
      setWidgetOrder(updatedOrder);

      // Create the final widgets array in the preserved order with updated props
      const updatedWidgets = updatedOrder
        .map((id) => newWidgetMap.get(id))
        .filter(Boolean) as DashboardWidget[];

      return updatedWidgets;
    });
  }, []);

  // Update widgets when initialWidgets changes, but preserve order
  useEffect(() => {
    if (widgetOrder.length > 0) {
      updateWidgetsPreservingOrder(initialWidgets);
    }
  }, [initialWidgets, widgetOrder.length, updateWidgetsPreservingOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update the stored order
        setWidgetOrder(newOrder.map((widget) => widget.id));

        return newOrder;
      });
    }
  }

  return (
    <DragDropContext.Provider value={{ widgets, setWidgets }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </DragDropContext.Provider>
  );
};
