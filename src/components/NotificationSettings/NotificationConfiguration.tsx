import { AlertTypeValue, CreateNotificationConfigRequest, CustomerAdmin } from "@/api/types";
import NotificationIcon from "@/assets/icons/bell.svg";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateUpdateNotificationConfigs,
  useCreateUpdateNotificationConfigsBatch,
  useGetCustomerAdmins,
  useGetUserNotificationConfig,
} from "@/hooks/useApi";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import Loading from "../Loading";
import { ListBox } from "../SiteConfiguration/components/ListBox";
import SectionWrapper from "../SiteConfiguration/components/SectionWrapper";
import { LocationTableConfiguration } from "./LocationTableConfiguration";
import { TableConfiguration } from "./TableConfiguration";

// Edit screen states
type EditMode = "view" | "edit";
type ConfigMode = "by-user" | "by-location";

interface NotificationConfigurationProps {
  siteId: string;
}

interface NotificationConfigResponse {
  data: Array<{
    user_id: string;
    user_email: string;
    user_name: string;
    user_role: string;
    subscriptions: { [locationTag: string]: AlertTypeValue[] };
  }>;
}

// Define location tag structure based on notification config
interface LocationTagInfo {
  location_tag: string;
}

const NotificationConfiguration = ({ siteId }: NotificationConfigurationProps) => {
  const { user } = useAuth();
  const [configMode, setConfigMode] = useState<ConfigMode>("by-user");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedLocationTag, setSelectedLocationTag] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<EditMode>("view");
  const [availableUsers, setAvailableUsers] = useState<CustomerAdmin[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [locationTags, setLocationTags] = useState<LocationTagInfo[]>([]);
  const [subscriptions, setSubscriptions] = useState<{ [locationTag: string]: AlertTypeValue[] }>(
    {},
  );
  const [lastSavedSubscriptions, setLastSavedSubscriptions] = useState<{
    [locationTag: string]: AlertTypeValue[];
  }>({});
  const [userConfigs, setUserConfigs] = useState<{ [locationTag: string]: AlertTypeValue[] }>({});
  const [allUserConfigs, setAllUserConfigs] = useState<{
    [userId: string]: { [locationTag: string]: AlertTypeValue[] };
  }>({});

  // For location-based mode
  const [userSubscriptions, setUserSubscriptions] = useState<{
    [userId: string]: AlertTypeValue[];
  }>({});
  const [lastSavedUserSubscriptions, setLastSavedUserSubscriptions] = useState<{
    [userId: string]: AlertTypeValue[];
  }>({});
  const [locationConfigs, setLocationConfigs] = useState<{ [userId: string]: AlertTypeValue[] }>(
    {},
  );
  const [allLocationConfigs, setAllLocationConfigs] = useState<{
    [locationTag: string]: { [userId: string]: AlertTypeValue[] };
  }>({});

  // Update role checks - both cust_super_admin and admin are super admins
  const isSuperAdmin = user?.role === "cust_super_admin" || user?.role === "admin";
  const isCustAdmin = user?.role === "cust_admin";

  // Get notification config for all users
  const {
    data: rawNotificationConfig,
    loading: configLoading,
    error: configError,
  } = useGetUserNotificationConfig(siteId);

  const notificationConfig = rawNotificationConfig as unknown as NotificationConfigResponse;

  // Get available users for super admin
  const { execute: fetchCustomerAdmins } = useGetCustomerAdmins(siteId);

  // Update notification config mutation
  const { execute: updateConfig } = useCreateUpdateNotificationConfigs();
  const { execute: updateConfigBatch } = useCreateUpdateNotificationConfigsBatch();

  // Extract location tags from notification config data
  useEffect(() => {
    if (notificationConfig?.data) {
      // Extract all unique location tags from all users' subscriptions
      const locationTagSet = new Set<string>();

      notificationConfig.data.forEach((userConfig) => {
        if (userConfig.subscriptions) {
          Object.keys(userConfig.subscriptions).forEach((locationTag) => {
            locationTagSet.add(locationTag);
          });
        }
      });

      // Convert to LocationTagInfo array
      const extractedLocationTags: LocationTagInfo[] = Array.from(locationTagSet).map((tag) => ({
        location_tag: tag,
      }));

      setLocationTags(extractedLocationTags);
    }
  }, [notificationConfig]);

  // Handle mode switch
  const handleModeSwitch = (mode: ConfigMode) => {
    setConfigMode(mode);
    setIsEditMode("view");
    setSelectedUserId(null);
    setSelectedLocationTag(null);
    setSubscriptions({});
    setUserSubscriptions({});

    // Initialize data for the new mode
    if (mode === "by-user") {
      if (isCustAdmin && user?.id) {
        // For cust_admin, auto-select current user
        setSelectedUserId(user.id);
        const userConfig = allUserConfigs[user.id] || {};
        setSubscriptions(userConfig);
        setUserConfigs(userConfig);
        setLastSavedSubscriptions(userConfig);
      } else if (isSuperAdmin && availableUsers.length > 0) {
        // For super admin, auto-select first user
        const firstUser = availableUsers[0];
        setSelectedUserId(firstUser.user_id);
        const userConfig = allUserConfigs[firstUser.user_id] || {};
        setSubscriptions(userConfig);
        setUserConfigs(userConfig);
        setLastSavedSubscriptions(userConfig);
      }
    } else {
      // Auto-select first location tag if available for location mode
      if (locationTags.length > 0) {
        const firstTag = locationTags[0];
        setSelectedLocationTag(firstTag.location_tag);
        const locationConfig = allLocationConfigs[firstTag.location_tag] || {};
        setUserSubscriptions(locationConfig);
        setLocationConfigs(locationConfig);
        setLastSavedUserSubscriptions(locationConfig);
      }
    }
  };

  // Handle user selection
  const handleUserSelection = (selectedUser: CustomerAdmin) => {
    console.log("User selected:", selectedUser);
    setSelectedUserId(selectedUser.user_id);
    setIsEditMode("view"); // Reset edit mode when switching users

    // Use cached config for the selected user
    const userConfig = allUserConfigs[selectedUser.user_id] || {};
    setSubscriptions(userConfig);
    setUserConfigs(userConfig);
    setLastSavedSubscriptions(userConfig);
  };

  // Handle location tag selection
  const handleLocationTagSelection = (selectedTag: LocationTagInfo) => {
    console.log("Location tag selected:", selectedTag);
    setSelectedLocationTag(selectedTag.location_tag);
    setIsEditMode("view"); // Reset edit mode when switching location tags

    // Use cached config for the selected location tag
    const locationConfig = allLocationConfigs[selectedTag.location_tag] || {};
    setUserSubscriptions(locationConfig);
    setLocationConfigs(locationConfig);
    setLastSavedUserSubscriptions(locationConfig);
  };

  // Handle edit mode toggle using onEdit prop
  const handleUserEdit = (user: CustomerAdmin) => {
    // If this user is not currently selected, select them first
    if (user.user_id !== selectedUserId) {
      handleUserSelection(user);
    }

    // Toggle edit mode
    setIsEditMode((prev) => (prev === "view" ? "edit" : "view"));

    if (isEditMode === "view") {
      // Switching to edit mode - prepare subscriptions with all location tags
      const allLocationTagsConfig = locationTags.reduce(
        (acc, tag) => {
          acc[tag.location_tag] = userConfigs[tag.location_tag] || [];
          return acc;
        },
        {} as { [locationTag: string]: AlertTypeValue[] },
      );

      setSubscriptions(allLocationTagsConfig);
    }
  };

  // Handle location tag edit
  const handleLocationTagEdit = (tag: LocationTagInfo) => {
    // If this location tag is not currently selected, select it first
    if (tag.location_tag !== selectedLocationTag) {
      handleLocationTagSelection(tag);
    }

    // Toggle edit mode
    setIsEditMode((prev) => (prev === "view" ? "edit" : "view"));

    if (isEditMode === "view") {
      // Switching to edit mode - prepare subscriptions with all users
      const allUsersConfig = availableUsers.reduce(
        (acc, user) => {
          acc[user.user_id] = locationConfigs[user.user_id] || [];
          return acc;
        },
        {} as { [userId: string]: AlertTypeValue[] },
      );

      setUserSubscriptions(allUsersConfig);
    }
  };

  // Handle cancel operation
  const handleCancel = () => {
    if (configMode === "by-user") {
      // Reset to last saved state
      setSubscriptions(lastSavedSubscriptions);
    } else {
      // Reset to last saved state for location mode
      setUserSubscriptions(lastSavedUserSubscriptions);
    }
    setIsEditMode("view");
  };

  // Handle save and edit toggle
  const handleSaveOrEdit = () => {
    if (isEditMode === "edit") {
      // Save the changes
      handleSave();
    } else {
      // Switch to edit mode
      setIsEditMode("edit");

      if (configMode === "by-user") {
        // Prepare subscriptions with all location tags
        const allLocationTagsConfig = locationTags.reduce(
          (acc, tag) => {
            acc[tag.location_tag] = userConfigs[tag.location_tag] || [];
            return acc;
          },
          {} as { [locationTag: string]: AlertTypeValue[] },
        );

        setSubscriptions(allLocationTagsConfig);
      } else {
        // Prepare subscriptions with all users
        const allUsersConfig = availableUsers.reduce(
          (acc, user) => {
            acc[user.user_id] = locationConfigs[user.user_id] || [];
            return acc;
          },
          {} as { [userId: string]: AlertTypeValue[] },
        );

        setUserSubscriptions(allUsersConfig);
      }
    }
  };

  // Transform notification config to location-based format
  useEffect(() => {
    if (notificationConfig?.data) {
      // Store all users' configs
      const configs = notificationConfig.data.reduce(
        (acc, config) => {
          acc[config.user_id] = config.subscriptions || {};
          return acc;
        },
        {} as { [userId: string]: { [locationTag: string]: AlertTypeValue[] } },
      );

      setAllUserConfigs(configs);

      // Transform to location-based configs
      const locationConfigs: { [locationTag: string]: { [userId: string]: AlertTypeValue[] } } = {};

      Object.entries(configs).forEach(([userId, userConfig]) => {
        Object.entries(userConfig).forEach(([locationTag, alertTypes]) => {
          if (!locationConfigs[locationTag]) {
            locationConfigs[locationTag] = {};
          }
          locationConfigs[locationTag][userId] = alertTypes;
        });
      });

      setAllLocationConfigs(locationConfigs);
    }
  }, [notificationConfig]);

  // Separate effect for initial selection to prevent conflicts
  useEffect(() => {
    if (notificationConfig?.data && locationTags.length > 0) {
      // Only set initial selection if nothing is selected yet
      if (configMode === "by-user" && !selectedUserId) {
        let initialUser;

        if (isCustAdmin) {
          // For cust_admin, always select the current user
          initialUser = user?.id
            ? {
                user_id: user.id,
                name: user.name || "Current User",
                email: user.email || "",
                role: user.role || "user",
              }
            : null;
        } else if (isSuperAdmin && availableUsers.length > 0) {
          // For super admin, auto-select the first user
          initialUser = availableUsers[0];
        } else {
          initialUser = availableUsers.find((u) => u.user_id === user?.id) || availableUsers[0];
        }

        if (initialUser) {
          setSelectedUserId(initialUser.user_id);
          const userConfig = allUserConfigs[initialUser.user_id] || {};
          setSubscriptions(userConfig);
          setUserConfigs(userConfig);
          setLastSavedSubscriptions(userConfig);
        }
      } else if (configMode === "by-location" && !selectedLocationTag && !isCustAdmin) {
        const initialTag = locationTags[0];
        if (initialTag) {
          setSelectedLocationTag(initialTag.location_tag);
          const locationConfig = allLocationConfigs[initialTag.location_tag] || {};
          setUserSubscriptions(locationConfig);
          setLocationConfigs(locationConfig);
          setLastSavedUserSubscriptions(locationConfig);
        }
      }
    }
  }, [
    notificationConfig,
    locationTags,
    availableUsers,
    configMode,
    selectedUserId,
    selectedLocationTag,
    allUserConfigs,
    allLocationConfigs,
    isSuperAdmin,
    isCustAdmin,
    user?.id,
  ]);

  // Special effect for cust_admin users to ensure configs load properly on mount
  useEffect(() => {
    // This effect ensures that for cust_admin users, we always load their config correctly on mount
    if (isCustAdmin && user?.id && notificationConfig?.data && !isLoadingUsers) {
      const userConfig = allUserConfigs[user.id] || {};
      setSelectedUserId(user.id);
      setSubscriptions(userConfig);
      setUserConfigs(userConfig);
      setLastSavedSubscriptions(userConfig);
    }
  }, [isCustAdmin, user?.id, notificationConfig, allUserConfigs, isLoadingUsers]);

  // Effect to fetch available users for super admin
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isSuperAdmin || !user?.customer_id || !siteId) return;

      setIsLoadingUsers(true);
      try {
        const admins = await fetchCustomerAdmins();
        setAvailableUsers(admins);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isSuperAdmin, user?.customer_id, siteId]);

  // Handle save operation
  const handleSave = async () => {
    if (configMode === "by-user") {
      if (!selectedUserId) return;

      try {
        // Filter out location tags with no alert types
        const validSubscriptions = Object.entries(subscriptions)
          .filter(([_, alertTypes]) => alertTypes.length > 0)
          .reduce(
            (acc, [tag, types]) => {
              acc[tag] = types;
              return acc;
            },
            {} as Record<string, AlertTypeValue[]>,
          );

        const configData: CreateNotificationConfigRequest = {
          user_id: selectedUserId,
          site_id: siteId,
          subscriptions: validSubscriptions,
        };

        await updateConfig(configData);
        setIsEditMode("view");
        setLastSavedSubscriptions(validSubscriptions);
        setUserConfigs(validSubscriptions);

        // Update subscriptions to show only configured ones in view mode
        setSubscriptions(validSubscriptions);

        // Update allUserConfigs cache
        setAllUserConfigs((prev) => ({
          ...prev,
          [selectedUserId]: validSubscriptions,
        }));

        // Also update allLocationConfigs cache to keep both modes in sync
        setAllLocationConfigs((prev) => {
          const newLocationConfigs = { ...prev };

          // Remove this user from all location tags first
          Object.keys(newLocationConfigs).forEach((locationTag) => {
            if (newLocationConfigs[locationTag][selectedUserId]) {
              delete newLocationConfigs[locationTag][selectedUserId];
            }
          });

          // Add this user's new subscriptions to location configs
          Object.entries(validSubscriptions).forEach(([locationTag, alertTypes]) => {
            if (!newLocationConfigs[locationTag]) {
              newLocationConfigs[locationTag] = {};
            }
            newLocationConfigs[locationTag][selectedUserId] = alertTypes;
          });

          return newLocationConfigs;
        });
      } catch (error) {
        console.error("Failed to update configuration:", error);
      }
    } else {
      if (!selectedLocationTag) return;

      try {
        const configUpdates: CreateNotificationConfigRequest[] = [];
        const updatedUserConfigs: {
          [userId: string]: { [locationTag: string]: AlertTypeValue[] };
        } = {};

        // Collect all updates for users with alert types
        Object.entries(userSubscriptions)
          .filter(([_, alertTypes]) => alertTypes.length > 0)
          .forEach(([userId, alertTypes]) => {
            const existingConfig = allUserConfigs[userId] || {};
            const updatedConfig = {
              ...existingConfig,
              [selectedLocationTag]: alertTypes,
            };

            updatedUserConfigs[userId] = updatedConfig;

            configUpdates.push({
              user_id: userId,
              site_id: siteId,
              subscriptions: updatedConfig,
            });
          });

        // Collect all updates for users with no alert types
        Object.entries(userSubscriptions)
          .filter(([_, alertTypes]) => alertTypes.length === 0)
          .forEach(([userId, _]) => {
            const existingConfig = allUserConfigs[userId] || {};
            const updatedConfig = { ...existingConfig };
            delete updatedConfig[selectedLocationTag];

            updatedUserConfigs[userId] = updatedConfig;

            configUpdates.push({
              user_id: userId,
              site_id: siteId,
              subscriptions: updatedConfig,
            });
          });

        // Use the batch hook with a single toast
        await toast.promise(updateConfigBatch(configUpdates), {
          loading: "Updating notification configuration...",
          success: "Notification configuration updated!",
          error: "Failed to update notification configuration.",
        });

        setIsEditMode("view");
        setLastSavedUserSubscriptions(userSubscriptions);
        setLocationConfigs(userSubscriptions);

        setAllUserConfigs((prev) => ({
          ...prev,
          ...updatedUserConfigs,
        }));

        setAllLocationConfigs((prev) => ({
          ...prev,
          [selectedLocationTag]: userSubscriptions,
        }));
      } catch (error) {
        console.error("Failed to update configuration:", error);
      }
    }
  };

  const handleAlertTypeToggle = (entityId: string, type: AlertTypeValue) => {
    if (isEditMode === "view") return;

    if (configMode === "by-user") {
      // entityId is location tag
      setSubscriptions((prev) => {
        const newSubscriptions = { ...prev };
        if (!newSubscriptions[entityId]) {
          newSubscriptions[entityId] = [];
        }

        const currentAlertTypes = newSubscriptions[entityId];
        if (currentAlertTypes.includes(type)) {
          const updatedTypes = currentAlertTypes.filter((t) => t !== type);
          newSubscriptions[entityId] = updatedTypes;
        } else {
          newSubscriptions[entityId] = [...currentAlertTypes, type];
        }

        return newSubscriptions;
      });
    } else {
      // entityId is user id
      setUserSubscriptions((prev) => {
        const newSubscriptions = { ...prev };
        if (!newSubscriptions[entityId]) {
          newSubscriptions[entityId] = [];
        }

        const currentAlertTypes = newSubscriptions[entityId];
        if (currentAlertTypes.includes(type)) {
          const updatedTypes = currentAlertTypes.filter((t) => t !== type);
          newSubscriptions[entityId] = updatedTypes;
        } else {
          newSubscriptions[entityId] = [...currentAlertTypes, type];
        }

        return newSubscriptions;
      });
    }
  };

  // Get location tags to display based on mode
  const getDisplayLocationTags = () => {
    if (configMode === "by-location") return []; // Not used in location mode

    // Only show location tags for the selected user
    if (!selectedUserId) return [];

    const selectedUserConfig = allUserConfigs[selectedUserId];
    if (!selectedUserConfig) return [];

    // Return all location tags that the selected user has (including those with empty arrays)
    return Object.keys(selectedUserConfig);
  };

  // Get users to display for location mode
  const getDisplayUsers = () => {
    if (configMode === "by-user") return []; // Not used in user mode

    // Always show all users, both in edit and view mode
    return availableUsers.map((user) => user.user_id);
  };

  // Show loading state
  if (configLoading) {
    return (
      <SectionWrapper entityName="Notification Settings" iconSrc={NotificationIcon} height="75vh">
        <div className="flex h-full gap-3">
          <div className="w-1/3">
            <ListBox
              title="Users"
              items={
                isSuperAdmin
                  ? availableUsers
                  : [
                      {
                        user_id: user?.id || "",
                        name: user?.name || "Current User",
                        email: user?.email || "",
                        role: user?.role || "user",
                      },
                    ]
              }
              placeholder="User"
              onItemClick={handleUserSelection}
              onEdit={handleUserEdit}
              selectedItem={availableUsers.find((u) => u.user_id === selectedUserId)}
              getItemLabel={(user) => user.name}
              getItemId={(user) => user.user_id}
              getItemColor={() => "#14B8A6"}
              emptyStateMessage={isLoadingUsers ? "Loading users..." : "No users available"}
              className="h-[60vh] rounded-lg border border-gray-200 bg-white shadow-sm"
              disabled={isEditMode === "edit"}
              isLoading={isLoadingUsers || configLoading}
            />
          </div>
          <div className="h-[100%] w-2/3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Loading />
            </div>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  // Show error state
  if (configError) {
    return (
      <SectionWrapper entityName="Notification Settings" iconSrc={NotificationIcon} height="75vh">
        <div className="flex h-full flex-col items-center justify-center text-red-600">
          <p>Error loading notification settings</p>
          <p className="text-sm">{configError.message}</p>
        </div>
      </SectionWrapper>
    );
  }

  // Show empty state when notification config is empty
  if (!notificationConfig?.data?.length && !isSuperAdmin) {
    return (
      <SectionWrapper entityName="Notification Settings" iconSrc={NotificationIcon} height="75vh">
        <div className="flex h-full flex-col items-center justify-center text-gray-600">
          <p>No notification settings configured</p>
          <p className="text-sm">
            Please contact your administrator to set up notification configurations.
          </p>
        </div>
      </SectionWrapper>
    );
  }

  const displayLocationTags = getDisplayLocationTags();
  const displayUsers = getDisplayUsers();

  // Mode switch component
  const ModeSwitch = () => {
    // Hide the entire mode switch for cust_admin users
    if (isCustAdmin) {
      return null;
    }

    return (
      <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Configure by:</span>
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => handleModeSwitch("by-user")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                configMode === "by-user"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              User
            </button>
            <button
              onClick={() => handleModeSwitch("by-location")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                configMode === "by-location"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Location
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to get current user items for ListBox - memoized to prevent re-renders
  const getCurrentUserItems = () => {
    if (!availableUsers.length && !user?.id) return [];

    if (isSuperAdmin) {
      return availableUsers;
    } else {
      return user?.id
        ? [
            {
              user_id: user.id,
              name: user.name || "Current User",
              email: user.email || "",
              role: user.role || "user",
            },
          ]
        : [];
    }
  };

  // Helper function to get current location items for ListBox - memoized to prevent re-renders
  const getCurrentLocationItems = () => {
    return locationTags;
  };

  // Prevent rendering if data is not ready
  if (configLoading || !notificationConfig?.data) {
    return (
      <SectionWrapper entityName="Notification Settings" iconSrc={NotificationIcon} height="75vh">
        <div className="flex h-full gap-3">
          <div className="w-1/3">
            <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <ModeSwitch />
              <div className="flex h-32 items-center justify-center">
                <Loading />
              </div>
            </div>
          </div>
          <div className="h-[100%] w-2/3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Loading />
            </div>
          </div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper entityName="Notification Settings" iconSrc={NotificationIcon} height="75vh">
      <div className="flex h-full gap-3">
        <div className="w-1/4">
          <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <ModeSwitch />
            {configMode === "by-user" ? (
              <ListBox
                key="user-listbox" // Add key to prevent React from reusing components
                title="Users"
                items={getCurrentUserItems()}
                placeholder="User"
                onItemClick={handleUserSelection}
                onEdit={handleUserEdit}
                selectedItem={getCurrentUserItems().find((u) => u.user_id === selectedUserId)}
                getItemLabel={(user) => user.name || user.email || "Unnamed User"}
                getItemId={(user) => user.user_id}
                getItemColor={() => "#14B8A6"}
                emptyStateMessage={isLoadingUsers ? "Loading users..." : "No users available"}
                className="h-[90%] border-0 p-0 shadow-none"
                disabled={isEditMode === "edit"}
                isLoading={isLoadingUsers}
              />
            ) : (
              <ListBox
                key="location-listbox" // Add key to prevent React from reusing components
                title="Location Tags"
                items={getCurrentLocationItems()}
                placeholder="Location Tag"
                onItemClick={handleLocationTagSelection}
                onEdit={handleLocationTagEdit}
                selectedItem={getCurrentLocationItems().find(
                  (tag) => tag.location_tag === selectedLocationTag,
                )}
                getItemLabel={(tag) => tag.location_tag}
                getItemId={(tag) => tag.location_tag}
                getItemColor={() => "#14B8A6"}
                emptyStateMessage="No location tags available"
                className="h-[90%] border-0 p-0 shadow-none"
                disabled={isEditMode === "edit"}
                isLoading={false}
              />
            )}
          </div>
        </div>
        <div className="w-3/4 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
          {configMode === "by-user" ? (
            <TableConfiguration
              displayLocationTags={displayLocationTags}
              locationTags={locationTags}
              subscriptions={subscriptions}
              handleAlertTypeToggle={handleAlertTypeToggle}
              isEditMode={isEditMode}
              onSave={handleSaveOrEdit}
              lastSavedSubscriptions={lastSavedSubscriptions}
              onCancel={handleCancel}
            />
          ) : (
            <LocationTableConfiguration
              displayUsers={displayUsers}
              availableUsers={availableUsers}
              userSubscriptions={userSubscriptions}
              handleAlertTypeToggle={handleAlertTypeToggle}
              isEditMode={isEditMode}
              onSave={handleSaveOrEdit}
              lastSavedUserSubscriptions={lastSavedUserSubscriptions}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </SectionWrapper>
  );
};

export default NotificationConfiguration;
