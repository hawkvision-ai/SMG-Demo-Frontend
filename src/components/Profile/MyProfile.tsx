import cameraIcon from "@/assets/icons/camera.svg";
import siteIcon from "@/assets/icons/sites.svg";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  useGetCustomer,
  useSyncAllowedUseCases,
  useUpdateSnapshotVideoConfig,
} from "@/hooks/useApi";
import { formatTime } from "@/utils/formatTime";
import { motion } from "framer-motion";
import { Crown, Edit, User, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import SectionWrapper from "../SiteConfiguration/components/SectionWrapper";

interface IncidentConfig {
  useCase: string;
  snapshot: boolean;
  video: boolean;
}

const MyProfile: React.FC = () => {
  const { user } = useAuth();
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch customer data using the hook
  const {
    data: customerData,
    execute: fetchCustomer,
  } = useGetCustomer(user?.customer_id || "");

  // Hook for updating snapshot/video configuration
  const { execute: updateConfig } = useUpdateSnapshotVideoConfig();

  // Hook for syncing allowed use cases
  const { execute: syncAllowedUseCases, loading: syncLoading } = useSyncAllowedUseCases();

  // Fetch customer data and sync allowed use cases on mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.customer_id) {
        try {
          // First sync allowed use cases to get the latest from admin
          await syncAllowedUseCases(user.customer_id);
          // Then fetch customer data which will include the updated use cases
          await fetchCustomer();
        } catch (error) {
          console.error("Error loading profile data:", error);
          // Still try to fetch customer data even if sync fails
          await fetchCustomer();
        }
      }
    };

    loadProfileData();
  }, [user?.customer_id]);

  // Extract allowed use cases from customer data
  const allowedUseCases = customerData?.allowed_ucs || [];
  const boundaryUseCases = customerData?.boundary_usecase || [];

  // Incident configuration state - initialize with allowed use cases
  const [incidentConfig, setIncidentConfig] = useState<IncidentConfig[]>([]);
  // Store original config for cancel functionality
  const [originalConfig, setOriginalConfig] = useState<IncidentConfig[]>([]);

  // Update incident config when customer data is loaded
  useEffect(() => {
    if (allowedUseCases.length > 0 && customerData?.is_snapshot) {
      const config = allowedUseCases.map((useCase) => ({
        useCase,
        snapshot: customerData.is_snapshot?.[useCase]?.snapshot ?? true,
        video: customerData.is_snapshot?.[useCase]?.video ?? false,
      }));
      setIncidentConfig(config);
      setOriginalConfig(JSON.parse(JSON.stringify(config))); // Deep copy
    }
  }, [allowedUseCases.length, customerData?.is_snapshot]);

  const handleCheckboxChange = (index: number, field: "snapshot" | "video") => {
    if (!isEditMode) return;

    // Snapshot is always enabled and cannot be changed
    if (field === "snapshot") return;

    const newConfig = [...incidentConfig];
    newConfig[index][field] = !newConfig[index][field];
    setIncidentConfig(newConfig);
  };

  const handleCancel = () => {
    // Deep copy to reset to original config
    setIncidentConfig(JSON.parse(JSON.stringify(originalConfig)));
    setIsEditMode(false);
  };

  const handleSaveConfiguration = async () => {
    if (!user?.customer_id) {
      toast.error("Customer ID is missing");
      return;
    }

    setIsSaving(true);

    try {
      // Send all configurations (not just the ones with video=true)
      await toast.promise(
        Promise.all(
          incidentConfig.map((config) =>
            updateConfig(user.customer_id!, {
              usecase_name: config.useCase,
              snapshot: config.snapshot,
              video: config.video,
            }),
          ),
        ),
        {
          loading: "Saving configurations...",
          success: "Configurations saved successfully!",
          error: "Failed to save configurations",
        },
      );

      // Deep copy to update original config after successful save
      setOriginalConfig(JSON.parse(JSON.stringify(incidentConfig)));
      setIsEditMode(false);
    } catch (error) {
      console.error("Error saving configurations:", error);
      // Reset to original config on error
      setIncidentConfig(JSON.parse(JSON.stringify(originalConfig)));
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state only during sync operation
  if (syncLoading) {
    return (
      <div className="flex min-h-[87vh] items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <SectionWrapper
      entityName={user?.customer_name || "My Profile"}
      showSearch={false}
      showAddButton={false}
      height="87vh"
    >
      <div className="max-w-8xl mx-auto space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="p-6">
            <div className="mx-2 flex items-center justify-between border-b border-gray-200 px-1 py-1">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Information</h2>
            </div>

            {/* Stats Grid */}
            <div className="mt-4 mb-4 grid grid-cols-2 gap-4 md:grid-cols-7">
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <img src={siteIcon} alt="Sites" className="h-6 w-6" />
                  <div className="text-base text-gray-700">Sites</div>
                </div>
                <div className="font-small text-base text-gray-500">
                  {customerData?.sites?.length || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <img src={cameraIcon} alt="Cameras" className="h-5 w-5" />
                  <div className="text-base text-gray-700">Cameras</div>
                </div>
                <div className="font-small text-base text-gray-500">
                  {customerData?.cameras?.length || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-gray-800" />
                  <div className="text-base text-gray-700">Super Admins</div>
                </div>
                <div className="font-small text-base text-gray-500">
                  {customerData?.super_admins?.length || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Users className="h-5 w-5 text-gray-800" />
                  <div className="text-base text-gray-700">Admins</div>
                </div>
                <div className="font-small text-base text-gray-500">
                  {customerData?.admins?.length || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <User className="h-5 w-5 text-gray-800" />
                  <div className="text-base text-gray-700">Consumers</div>
                </div>
                <div className="font-small text-base text-gray-500">
                  {customerData?.consumers?.length || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <User className="h-5 w-5 text-gray-800" />
                  <div className="text-base text-gray-700">Joined</div>
                </div>
                <div className="font-small text-xs text-gray-500">
                  {customerData?.created_at ? formatTime(customerData.created_at) : "N/A"}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-gray-800" />
                  <div className="text-base text-gray-800">Industry</div>
                </div>
                <div className="font-small text-xs text-gray-500">
                  {customerData?.industry || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Available Use Cases Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <div>
            {/* Header */}
            <div className="mx-6 flex items-center justify-between border-b border-gray-200 px-2 py-3">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Available Use cases</h2>
            </div>

            {/* Display allowed use cases */}
            <div className="flex flex-wrap gap-2 p-3">
              {allowedUseCases.map((useCase, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedUseCase(useCase)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${selectedUseCase === useCase
                      ? "border border-blue-300 bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  {useCase.replace(/_/g, " ")}
                </button>
              ))}

              {/* Display boundary use cases */}
              {boundaryUseCases.map((useCase, index) => (
                <button
                  key={`boundary-${index}`}
                  onClick={() => setSelectedUseCase(useCase)}
                  className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${selectedUseCase === useCase
                      ? "border border-blue-300 bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  {useCase}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Incidents Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl border border-slate-200 bg-white"
        >
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
              <div>
                <h2 className="mb-1 text-lg font-semibold text-gray-900">
                  Incidents Configuration
                </h2>
                <p className="text-xs text-gray-500">
                  Choose the media type you want to use for reviewing incidents.
                </p>
              </div>
              {!isEditMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2 text-xs"
                >
                  <Edit className="h-3 w-3" />
                  Edit Configuration
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="px-3 py-1 text-xs"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveConfiguration}
                    size="sm"
                    className="bg-teal-600 px-3 py-1 text-xs text-white hover:bg-teal-700"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>

            {/* Configuration Table */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="w-1/3 py-2 pr-8 pl-4 text-left text-xs font-semibold text-gray-700">
                      Use Cases
                    </th>
                    <th className="w-32 py-2 pr-8 pl-2 text-center text-xs font-semibold text-gray-700">
                      Snapshot
                    </th>
                    <th className="w-32 py-2 pl-2 text-center text-xs font-semibold text-gray-700">
                      Video
                    </th>
                    <th className="w-auto"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-gray-50">
                  {incidentConfig.map((config, index) => (
                    <tr key={index}>
                      <td className="w-1/3 py-3 pr-8 pl-4 text-xs text-gray-900">
                        {config.useCase.replace(/_/g, " ")}
                      </td>
                      <td className="w-32 py-3 pr-8 pl-2">
                        <div className="flex justify-center">
                          <button
                            disabled={true}
                            className="flex h-4 w-4 cursor-not-allowed items-center justify-center rounded bg-teal-500 opacity-50 blur-[0.5px] transition-colors"
                          >
                            <svg
                              className="h-2.5 w-2.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="w-32 py-3 pl-2">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleCheckboxChange(index, "video")}
                            disabled={!isEditMode}
                            className={`flex h-4 w-4 items-center justify-center rounded transition-colors ${config.video ? "bg-teal-500" : "border-2 border-gray-300"
                              } ${isEditMode ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}`}
                          >
                            {config.video && (
                              <svg
                                className="h-2.5 w-2.5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="w-auto"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
};

export default MyProfile;
