import { ConsumerUser, CreateConsumerData } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useCreateConsumer, useGetConsumerData } from "@/hooks/useApi";
import React, { useState } from "react";
import Loading from "../Loading";
import ConsumersTable from "./components/ConsumersTable";
import CreateConsumerModal from "./components/CreateConsumerModal";
import ProfilePage from "./components/ProfilePage";
import SearchAndActionBar from "./components/SearchAndActionBar";
import TabsHeader from "./components/TabsHeader";

const ManageConsumer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("consumer");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedConsumer, setSelectedConsumer] = useState<ConsumerUser | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const { user } = useAuth(); // Get the current user to extract customerId
  const customerId = user?.customer_id || user?.id; // Adjust based on your auth context structure

  // Use the correct hook for listing consumers
  const {
    data: consumers,
    loading,
    error,
    execute: refetchConsumers,
  } = useGetConsumerData(customerId || "");

  // Hook for creating consumer
  const { createConsumer } = useCreateConsumer();

  // Filter consumers based on active tab and search term
  const filteredData =
    consumers?.filter((consumer) => {
      // First filter by role based on active tab
      const roleFilter =
        activeTab === "admin"
          ? consumer.role === "admin" || consumer.role === "cust_super_admin"
          : consumer.role === "consumer";

      if (!roleFilter) return false;

      // Then filter by search term
      return (
        consumer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consumer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consumer.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consumer.sites?.some((site) =>
          site.name?.toLowerCase().includes(searchTerm.toLowerCase()),
        ) ||
        consumer.location_tags?.some((tag) =>
          tag.name?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      );
    }) || [];

  const handleCreateConsumer = async (newConsumerData: CreateConsumerData) => {
    try {
      setIsCreating(true);

      // Add email validation before proceeding
      if (!newConsumerData.email.trim()) {
        console.error("Email is required");
        return;
      }

      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(newConsumerData.email)) {
        console.error("Invalid email format");
        return;
      }

      // Prepare the data with customer_id from auth context and correct role
      const consumerDataWithCustomerId: CreateConsumerData = {
        ...newConsumerData,
        customer_id: customerId || "",
        role: activeTab === "admin" ? "admin" : "consumer",
      };

      // Call the create consumer API
      await createConsumer(consumerDataWithCustomerId);

      // Refetch the data after creation
      await refetchConsumers();
      setIsModalOpen(false);

      console.log(`${activeTab === "admin" ? "Admin" : "Consumer"} created successfully`);
    } catch (error) {
      console.error(`Error creating ${activeTab === "admin" ? "admin" : "consumer"}:`, error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewProfile = (consumer: ConsumerUser) => {
    setSelectedConsumer(consumer);
  };

  const handleBackFromProfile = async () => {
    setSelectedConsumer(null);
    // Refresh the consumer list when coming back from profile
    await refetchConsumers();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchTerm(""); // Clear search when switching tabs
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loading />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg text-red-600">
          Error loading {activeTab === "admin" ? "admins" : "consumers"}: {error.message}
          <button
            onClick={refetchConsumers}
            className="ml-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (selectedConsumer) {
    return (
      <ProfilePage
        consumer={selectedConsumer}
        onBack={handleBackFromProfile} // Use new handler instead of direct setter
      />
    );
  }

  return (
    <div
      className="flex w-full max-w-full flex-col overflow-visible rounded-xl bg-white p-2 shadow-md sm:p-4 lg:p-2"
      style={{ height: "87vh", position: "relative", zIndex: 1 }}
    >
      <TabsHeader activeTab={activeTab} onTabChange={handleTabChange} />
      <SearchAndActionBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateClick={() => setIsModalOpen(true)}
        activeTab={activeTab} // Pass active tab to SearchAndActionBar
      />
      <ConsumersTable
        consumers={filteredData}
        onViewProfile={handleViewProfile}
        activeTab={activeTab}
      />

      <CreateConsumerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateConsumer}
        isLoading={isCreating}
        isAdminMode={activeTab === "admin"} // Pass admin mode to modal
      />
    </div>
  );
};

export default ManageConsumer;
