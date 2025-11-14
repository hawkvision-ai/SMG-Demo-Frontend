// components/SiteConfiguration/Counter/Counter.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CounterData } from '@/api/types';
import { useGetCountersBySite, useDeleteCounter, useGetCamerasBySite } from '@/hooks/useApi';
import SectionWrapper from '../components/SectionWrapper';
import EmptyCounterState from './EmptyCounterState';
import ShowCounters from './ShowCounters';
import AddCounterModal from './AddCounterModal';
import barChart from '@/assets/icons/bar-chart-4.svg';
import { useAuth } from '@/context/AuthContext';


interface CounterProps {
  siteId: string;
}

const Counter: React.FC<CounterProps> = ({ siteId }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [counters, setCounters] = useState<CounterData[]>([]);
  const [editCounter, setEditCounter] = useState<CounterData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { user } = useAuth();


  const { data: countersData, loading, execute: fetchCounters } = useGetCountersBySite();
  const { data: camerasData, execute: fetchCameras } = useGetCamerasBySite();


  const { execute: deleteCounter } = useDeleteCounter();


  // Filter counters based on search term
  const filteredCounters = counters.filter(counter =>
    counter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    counter.peopleSubCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    counter.vehicleSubCategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getCameraName = useMemo(() => {
    if (!camerasData) return (id: string) => "-";
    const cameraMap = camerasData.reduce((acc, camera) => {
      acc[camera.id] = camera.name || `Camera ${camera.id.slice(-4)}`;
      return acc;
    }, {} as Record<string, string>);

    return (id: string) => cameraMap[id] || "-";
  }, [camerasData]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };
  // Fetch counters
  useEffect(() => {
    if (siteId) {
      fetchCounters(siteId, user?.timezone);
      fetchCameras(siteId);
    }
  }, [siteId]);

  // Update counters state when API data changes
  useEffect(() => {
    if (countersData) {
      setCounters(countersData);
    }
  }, [countersData]);

  const handleCounterComplete = useCallback((updatedCounter?: CounterData) => {
    fetchCounters(siteId, user?.timezone);

    setModalOpen(false);
    setEditCounter(null);
  }, [siteId, fetchCounters]);

  const openModalForNew = () => {
    setModalOpen(true);
  };

  const openModalForEdit = (counter: CounterData) => {
    setEditCounter(counter);
    setModalOpen(true);
  }

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditCounter(null);
  }

  const handleDeleteCounter = async (counterId: string) => {
    try {
      await deleteCounter(counterId);
      setCounters(prev => prev.filter(counter => counter.id !== counterId));
    } catch (error: any) {
      console.error('Failed to delete counter:', error);
    }
  };

  if (loading) {
    return (
      <SectionWrapper entityName="Counters" iconSrc={barChart} height="75vh">
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">Loading counters...</div>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper
      entityName="Counters"
      iconSrc={barChart}
      onAdd={openModalForNew}
      showAddButton={true}
      showSearch={true}
      onSearch={handleSearch}
      height="75vh"
    >
      {filteredCounters.length === 0 ? (
        <EmptyCounterState onAddCounter={openModalForNew} />
      ) : (
        <ShowCounters
          counters={filteredCounters}
          onEditCounter={openModalForEdit}
          onDeleteCounter={handleDeleteCounter}
          getCameraName={getCameraName}
        />
      )}

      <AddCounterModal
        open={modalOpen}
        onClose={handleCloseModal}
        onComplete={handleCounterComplete}
        editCounter={editCounter}
        siteId={siteId}
      />

    </SectionWrapper>
  );
};

export default Counter;