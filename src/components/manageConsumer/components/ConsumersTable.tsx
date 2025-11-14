import { ConsumerUser, ConsumersTableProps } from "@/api/types";
import React, { useMemo } from "react";

interface UpdatedConsumersTableProps extends ConsumersTableProps {
  activeTab?: string; // Add activeTab prop to determine if we're in admin mode
}

const ConsumersTable: React.FC<UpdatedConsumersTableProps> = ({
  consumers,
  onViewProfile,
  activeTab = "consumer", // Default to consumer tab
}) => {
  // Check if we're in admin tab
  const isAdminTab = activeTab === "admin";

  // Sort consumers by created_at date (newest first)
  const sortedConsumers = useMemo(() => {
    if (!consumers || consumers.length === 0) return consumers;
    
    return [...consumers].sort((a, b) => {
      // Convert created_at strings to Date objects for comparison
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      
      // Sort in descending order (newest first)
      return dateB.getTime() - dateA.getTime();
    });
  }, [consumers]);

  // Helper function to get avatar from name or email
  const getAvatar = (consumer: ConsumerUser) => {
    return (
      consumer.avatar ||
      consumer.name?.charAt(0)?.toUpperCase() ||
      consumer.email?.charAt(0)?.toUpperCase() ||
      "U"
    );
  };

  // Helper function to get avatar color
  const getAvatarColor = (consumer: ConsumerUser) => {
    const colors = [
      "bg-purple-400",
      "bg-blue-400",
      "bg-green-400",
      "bg-yellow-400",
      "bg-red-400",
      "bg-indigo-400",
    ];
    const index = consumer.id ? consumer.id.length % colors.length : 0;
    return colors[index];
  };

  // Helper function to format sites display
  const formatSites = (sites: any[]) => {
    if (!sites || sites.length === 0) return "N/A";
    return `${sites.length}`;
  };

  // Helper function to format location tags display
  const formatLocationTags = (locationTags: any[]) => {
    if (!locationTags || locationTags.length === 0) return "N/A";
    return `${locationTags.length}`;
  };

  // Calculate colspan for empty state based on active tab
  const colSpan = isAdminTab ? 4 : 6;

  if (!sortedConsumers || sortedConsumers.length === 0) {
    return (
      <div className="mx-4 flex-1 overflow-auto">
        <div className="min-w-full">
          <table className="w-full min-w-full">
            <thead className="bg-[#F3F4F6] sticky top-0 z-10">
              <tr>
                <th className="rounded-tl-[10px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase first:rounded-tl-[10px]">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Email ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Job Title
                </th>
                {!isAdminTab && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Sites
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                      Location Tag
                    </th>
                  </>
                )}
                <th className="rounded-tr-[10px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase last:rounded-tr-[10px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td colSpan={colSpan} className="px-6 py-8 text-center text-gray-500">
                  No {isAdminTab ? "admins" : "consumers"} found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 flex-1 overflow-auto">
      <div className="min-w-full">
        <table className="w-full min-w-full">
          <thead className="bg-[#F3F4F6] sticky top-0 z-10">
            <tr>
              <th className="rounded-tl-[10px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase first:rounded-tl-[10px]">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Email ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Job Title
              </th>
              {!isAdminTab && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Sites
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Location Tag
                  </th>
                </>
              )}
              <th className="rounded-tr-[10px] px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase last:rounded-tr-[10px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedConsumers.map((consumer, index) => (
              <tr
                key={consumer.id}
                onClick={() => onViewProfile(consumer)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {consumer.image_url ? (
                      <img
                        className="mr-3 h-10 w-10 rounded-full object-cover"
                        src={consumer.image_url}
                        alt={consumer.name}
                        onError={(e) => {
                          // Fallback to avatar letter if image fails to load
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-10 w-10 ${getAvatarColor(consumer)} mr-3 flex items-center justify-center rounded-full font-medium text-white ${consumer.image_url ? "hidden" : ""}`}
                    >
                      {getAvatar(consumer)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {consumer.name || "N/A"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm lowercase whitespace-nowrap text-gray-800">
                  {consumer.email || "N/A"}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-800">
                  {consumer.job_title || "N/A"}
                </td>
                {!isAdminTab && (
                  <>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-800">
                      {formatSites(consumer.sites)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-800">
                      {formatLocationTags(consumer.location_tags)}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click when clicking View button
                      onViewProfile(consumer);
                    }}
                    className="font-medium transition-colors"
                    style={{
                      color: "#6598FF",
                      textDecoration: "underline",
                      textDecorationColor: "#6598FF",
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsumersTable;