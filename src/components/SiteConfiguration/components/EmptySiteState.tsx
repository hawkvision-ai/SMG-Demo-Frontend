import { useState } from "react";
import siteImage from "@/assets/site.png";
import SectionWrapper from "./SectionWrapper";
import siteIcon from "@/assets/icons/sitesIcon.svg";
import AddSiteModal from "./AddSiteModal";
import { SiteData } from "../types";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface EmptySiteStateProps {
  setSites: React.Dispatch<React.SetStateAction<SiteData[]>>;
  onComplete?: () => void;
}

const EmptySiteState: React.FC<EmptySiteStateProps> = ({ setSites, onComplete }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleSiteAdded = async (newSite: SiteData) => {
    try {
      setIsAdding(true);

      // The AddSiteModal component will handle the API call
      // We just need to update our local state
      setSites((prev) => [...prev, newSite]);

      if (onComplete) {
        onComplete();
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to add site:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <SectionWrapper
      entityName="Sites"
      iconSrc={siteIcon}
      onAdd={() => setIsModalOpen(true)}
      showSearch={false}
      showAddButton={false}
      showSelect={false}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <img src={siteImage} alt="Add Site" className="mb-4 h-28 w-28" />
        <p className="text-md mb-4 text-gray-300">
          Start by adding a Site here to Configure the Alerts for Customized Region/s.
        </p>
        <Button
          className="rounded-[20px] bg-teal-800 px-10 py-2 text-lg text-white transition hover:bg-teal-700 disabled:opacity-70"
          onClick={() => setIsModalOpen(true)}
          disabled={isAdding}
        >
          {isAdding ? "Adding..." : "Add Site"}
        </Button>
      </div>

      <AddSiteModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={() => {
          if (onComplete) onComplete();
          setIsModalOpen(false);
        }}
      />
    </SectionWrapper>
  );
};

export default EmptySiteState;
