import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import Loading from "../components/Loading"; // Adjust path as needed

interface LoadingContextType {
  isLoading: boolean;
  addLoadingOperation: () => void;
  removeLoadingOperation: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  addLoadingOperation: () => {},
  removeLoadingOperation: () => {},
});

export const useLoading = () => useContext(LoadingContext);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingOperations, setLoadingOperations] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Add a loading operation
  const addLoadingOperation = () => {
    setLoadingOperations((prev) => prev + 1);
  };

  // Remove a loading operation
  const removeLoadingOperation = () => {
    setLoadingOperations((prev) => Math.max(0, prev - 1));
  };

  // Update loading state when operations count changes
  useEffect(() => {
    setIsLoading(loadingOperations > 0);
  }, [loadingOperations]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        addLoadingOperation,
        removeLoadingOperation,
      }}
    >
      {isLoading && <Loading />}
      {children}
    </LoadingContext.Provider>
  );
};
