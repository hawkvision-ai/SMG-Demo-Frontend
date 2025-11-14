// components/EventCards.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, Camera, MapPin, Shield } from "lucide-react";
import { formatTime } from "@/utils/formatTime";

interface CombinedEvent {
  id: string;
  uc_type: string;
  site: string;
  camera: string;
  time_created: string;
  status: "received" | "seen" | "invalid" | "acknowledged" | "resolved";
  action: "open" | "close";
  critical: boolean;
  overdue: boolean;
  image: string;
  location_tag?: string;
}

interface TransformedEvent {
  id: string;
  title: string;
  site: string;
  camera: string;
  timestamp: string;
  status: string;
  action: string;
  critical: boolean;
  overdue: boolean;
  image: string;
  location_tag: string;
}

interface EventCardsProps {
  eventsData: CombinedEvent[] | null;
  eventsLoading: boolean;
  user: any;
}

const EventCards: React.FC<EventCardsProps> = ({ eventsData, eventsLoading, user }) => {
  const navigate = useNavigate();

  const handleEventClick = (eventId: string): void => {
    navigate(`/events/${eventId}`);
  };

  const formatUseCaseType = (ucType: string): string => {
    return ucType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };


  const getStatusColor = (status: string): string => {
    switch (status) {
      case "received":
        return "bg-teal-100 text-teal-800";
      case "seen":
        return "bg-green-100 text-green-800";
      case "invalid":
        return "bg-red-100 text-red-800";
      case "acknowledged":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionColor = (action: string): string => {
    return action === "open" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800";
  };

  const transformedEventsData: TransformedEvent[] = eventsData
    ? eventsData.slice(0, 4).map((event: CombinedEvent) => ({
      id: event.id,
      title: formatUseCaseType(event.uc_type),
      site: event.site,
      camera: event.camera,
      timestamp: event.time_created,
      status: event.status,
      action: event.action,
      critical: event.critical,
      overdue: event.overdue,
      image: event.image,
      location_tag: event.location_tag || "Location not specified",
    }))
    : [];

  return (
    <div className="h-full rounded-lg bg-white shadow-md p-4">
      <div className="h-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {eventsLoading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse overflow-hidden rounded-lg bg-white shadow-md"
            >
              <div className="h-32 w-full bg-gray-200"></div>
              <div className="p-4">
                <div className="mb-2 h-4 rounded bg-gray-200"></div>
                <div className="mb-3 space-y-1">
                  <div className="h-3 rounded bg-gray-200"></div>
                  <div className="h-3 rounded bg-gray-200"></div>
                  <div className="h-3 w-3/4 rounded bg-gray-200"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-gray-200"></div>
                  <div className="h-6 w-12 rounded-full bg-gray-200"></div>
                </div>
              </div>
            </div>
          ))
        ) : transformedEventsData.length === 0 ? (
          // No events state
          <div className="col-span-full rounded-lg bg-white p-8 text-center shadow-md">
            <div className="text-gray-500">
              <Camera className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">No recent events</p>
              <p className="text-sm">Critical Events will appear here </p>
            </div>
          </div>
        ) : (
          transformedEventsData.map((event: TransformedEvent) => (
            <div
              key={event.id}
              onClick={() => handleEventClick(event.id)}
              className="relative cursor-pointer overflow-hidden rounded-lg bg-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              {/* Status badges */}
              {event.critical && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-red-400 px-2 py-1 shadow-lg">
                  <AlertTriangle className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium text-white">Critical</span>
                </div>
              )}

              {event.overdue && !event.critical && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-orange-400 px-2 py-1 shadow-lg">
                  <Clock className="h-3 w-3 text-white" />
                  <span className="text-xs font-medium text-white">Overdue</span>
                </div>
              )}

              {/* Image */}
              <div className="relative">
                <img
                  src={event.image}
                  alt={event.title}
                  className="h-44 w-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=300&h=200&fit=crop";
                  }}
                />
                <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <h3 className="text-sm font-semibold text-white drop-shadow-lg">
                    {event.site}
                  </h3>
                </div>
              </div>

              {/* Info section */}
              <div className="space-y-2 p-3">
                {/* Camera and Location */}
                <div className="flex items-center justify-between text-[10px] text-gray-600">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <Camera className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.camera}</span>
                  </div>
                  <div className="ml-3 flex min-w-0 flex-1 items-center gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.location_tag}</span>
                  </div>
                  <div className="ml-3 flex min-w-0 flex-1 items-center gap-1">
                    <Shield className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{event.title}</span>
                  </div>
                </div>

                {/* Status, Action, and Time */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ${getStatusColor(event.status)}`}
                    >
                      {event.status}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ${getActionColor(event.action)}`}
                    >
                      {event.action}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-500">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventCards;