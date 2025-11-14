/* FunctionalTagsConfig.tsx with improved UI/UX and fixes */
import funcTag from "@/assets/icons/tags.svg";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Edit, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Loading from "../../Loading";
import { ListBox } from "../components/ListBox";
import SectionWrapper from "../components/SectionWrapper";
import UseCaseConfig from "../UseCase/UseCasesConfig";

import {
  CreateFunctionalTagInput,
  FunctionalTagResponse,
  UseCaseConfigurationItem,
  UseCaseDefinitionInput,
} from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  useCreateFunctionalTag,
  useEditFunctionalTag,
  useGetFunctionalTagsBySite,
  useSyncAllowedUseCases,
} from "@/hooks/useApi";
import { toast } from "react-hot-toast";

/* ------------------------------------------------------------------ *
 *  Local UI helpers & state shapes
 * ------------------------------------------------------------------ */
interface UseCase {
  id: string;
  name: string;
  isEnabled: boolean;
  tagId: string;
  config?: UseCaseDefinitionInput;
}

interface FunctionalTagsConfigProps {
  siteId: string;
  refreshKey?: string; // optional prop to force re-render
}

/* =================================================================== */
export default function FunctionalTagsConfig({ siteId, refreshKey }: FunctionalTagsConfigProps) {
  const { user } = useAuth();

  const createFunctionalTag = useCreateFunctionalTag();
  const editFunctionalTag = useEditFunctionalTag();
  const { data: tags, loading, error, execute: fetchTags } = useGetFunctionalTagsBySite(siteId);
  const {
    data: allowedUseCasesData,
    loading: useCasesLoading,
    execute: fetchAllowedUseCases,
  } = useSyncAllowedUseCases();

  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [selectedTag, setSelectedTag] = useState<FunctionalTagResponse | null>(null);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingUseCaseId, setEditingUseCaseId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [tempUseCaseId, setTempUseCaseId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Convert API response to USECASES format
  const USECASES = useMemo(() => {
    if (!allowedUseCasesData?.synced_allowed_ucs?.usecase_configurations) {
      return {};
    }

    const useCasesMap: Record<string, UseCaseDefinitionInput> = {};

    allowedUseCasesData.synced_allowed_ucs.usecase_configurations.forEach(
      (uc: UseCaseConfigurationItem) => {
        // Convert API format to internal format

        if (!uc.configuration || !uc.configuration.parameters) {
          console.warn(`Skipping ${uc.name} - invalid configuration`);
          return;
        }

        const parameters = uc.configuration.parameters.map((param) => {
          if (
            param.type === "range" &&
            param.int_params &&
            typeof param.int_params === "object" &&
            "min" in param.int_params
          ) {
            return {
              id: param.id,
              type: "range" as const,
              unit: param.unit,
              int_params: [param.int_params.min, param.int_params.max] as [number, number],
            };
          } else if (param.type === "dropdown" && Array.isArray(param.int_params)) {
            return {
              id: param.id,
              type: "dropdown" as const,
              unit: param.unit,
              int_params: param.int_params as string[],
            };
          }
          return param;
        });

        useCasesMap[uc.name] = {
          objects: uc.configuration.objects,
          parameters: parameters as any,
        };
      },
    );

    return useCasesMap;
  }, [allowedUseCasesData]);

  const useCaseTypes = useMemo(() => Object.keys(USECASES), [USECASES]);

  /* -------------------------------------------------------------- *
   *  Helper function to extract usecases, handling nested structures
   * -------------------------------------------------------------- */
  const extractUsecases = (tag: FunctionalTagResponse): Record<string, UseCaseDefinitionInput> => {
    if (!tag.usecases) return {};

    // Add this check
    if (typeof tag.usecases !== "object") return {};

    if (tag.usecases.usecases && typeof tag.usecases.usecases === "object") {
      return tag.usecases.usecases as unknown as Record<string, UseCaseDefinitionInput>;
    }

    return tag.usecases as unknown as Record<string, UseCaseDefinitionInput>;
  };
  /* -------------------------------------------------------------- *
   *  Effects
   * -------------------------------------------------------------- */
  useEffect(() => {
    fetchTags();
    // Fetch allowed use cases when component mounts
    if (user?.customer_id) {
      fetchAllowedUseCases(user.customer_id);
    }
  }, [siteId, refreshKey, user?.customer_id]);

  // When tags are loaded for the first time, select the first tag
  useEffect(() => {
    if (tags?.length && !selectedTag) {
      setSelectedTag(tags[0]);
    }
  }, [tags, selectedTag]);

  useEffect(() => {
    if (!selectedTag) {
      setUseCases([]);
      return;
    }

    // Extract usecases using the helper function
    const usecasesData = extractUsecases(selectedTag);

    const arr: UseCase[] = Object.entries(usecasesData)
      .filter(([_, cfg]) => cfg != null)
      .map(([name, cfg]) => ({
        id: `${selectedTag.id}-${name}`,
        name,
        isEnabled: true,
        tagId: selectedTag.id,
        config: cfg,
      }));

    setUseCases(arr);
  }, [selectedTag]);

  /* -------------------------------------------------------------- *
   *  CRUD helpers
   * -------------------------------------------------------------- */
  const handleAddTag = async (name: string) => {
    if (!user?.customer_id) return;
    setIsAdding(true);
    try {
      const tagData: CreateFunctionalTagInput = {
        name,
        customer_id: user.customer_id,
        site_id: siteId,
        camera_ids: [],
      };
      const result = await createFunctionalTag.execute(tagData);
      await fetchTags();

      // Find and select the newly created tag
      if (result?.id) {
        const newTag = tags?.find((t) => t.id === result.id) || null;
        if (newTag) {
          setSelectedTag(newTag);
        }
      }
    } catch (err) {
      console.error("Failed to create functional tag", err);
      toast.error("Failed to create tag");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditTag = async (tag: FunctionalTagResponse, newName: string) => {
    try {
      await editFunctionalTag.execute(tag.id, { name: newName });
      await fetchTags();
      setEditingTagId(null);

      // Keep the current tag selected after editing
      if (selectedTag?.id === tag.id) {
        const updatedTag = tags?.find((t) => t.id === tag.id) || null;
        if (updatedTag) {
          setSelectedTag(updatedTag);
        }
      }
    } catch (err) {
      console.error("Failed to edit functional tag", err);
      toast.error("Failed to update tag");
    }
  };

  const handleAddUseCase = (name: string) => {
    if (!selectedTag) return;
    const newUC: UseCase = {
      id: `uc-${Date.now()}`,
      name,
      isEnabled: true,
      tagId: selectedTag.id,
    };
    setIsAdding(true);
    setTempUseCaseId(newUC.id); // Mark as temp
    setUseCases((prev) => [...prev, newUC]);
    setSelectedUseCase(newUC);
    setEditingUseCaseId(newUC.id);
  };

  const handleUseCaseConfigComplete = async (config: UseCaseDefinitionInput) => {
    if (!selectedTag || !selectedUseCase) return;

    setIsSaving(true);

    // --- Transform for backend only ---
    const backendObjects = config.objects.map((obj) => [obj[0], obj[2]]) as [string, boolean][];
    const backendParameters = config.parameters.map((param) => {
      if (param.type === "range" && param.int_params && Array.isArray(param.int_params)) {
        return { ...param, int_params: param.int_params[0] }; // backend expects number
      }
      if (param.type === "dropdown" && param.int_params && Array.isArray(param.int_params)) {
        return { ...param, int_params: param.int_params[0] }; // backend expects string
      }
      return param;
    });

    // Build the backend config structure ONLY for API call
    const backendConfig = {
      objects: backendObjects,
      parameters: backendParameters,
    };

    const useCaseUpdate = {
      [selectedUseCase.name]: backendConfig,
    };

    try {
      // Save current selections to restore after refresh
      const currentTagId = selectedTag.id;
      const currentUseCaseName = selectedUseCase.name;
      const currentUseCaseId = selectedUseCase.id;

      // Send only backend-transformed object
      await editFunctionalTag.execute(selectedTag.id, useCaseUpdate);

      // Update UI state with **original config** (not backend transformed)
      setUseCases((prev) =>
        prev.map((uc) => (uc.id === currentUseCaseId ? { ...uc, config } : uc)),
      );

      // Refresh tags data from server
      await fetchTags();

      // Force refresh to ensure we have the latest data
      const updatedTags = await fetchTags();

      // Find and select the updated tag
      const updatedTag = updatedTags?.find((t) => t.id === currentTagId) || null;
      if (updatedTag) {
        setSelectedTag(updatedTag);

        // Extract usecases from the updated tag
        const updatedUsecasesData = extractUsecases(updatedTag);

        // Create updated useCases array
        const updatedUseCases = Object.entries(updatedUsecasesData).map(([name, cfg]) => ({
          id: `${updatedTag.id}-${name}`,
          name,
          isEnabled: true,
          tagId: updatedTag.id,
          config: cfg,
        }));

        // Update useCases state
        setUseCases(updatedUseCases);

        // Find and select the updated use case
        const updatedUseCase = updatedUseCases.find((uc) => uc.name === currentUseCaseName) || null;
        if (updatedUseCase) {
          setSelectedUseCase(updatedUseCase);
        }
      }

      setEditingUseCaseId(null);
      setIsAdding(false);
      setTempUseCaseId(null);
    } catch (err) {
      console.error("Failed to update functional tag with use case config", err);
      toast.error("Failed to save use case configuration");
    } finally {
      setIsSaving(false);
    }
  };

  /* -------------------------------------------------------------- *
   *  Custom hook to normalize tag data after fetch
   * -------------------------------------------------------------- */
  useEffect(() => {
    // If we have tags data, fix any nested usecases structures
    if (tags && tags.length > 0) {
      const fixedTags = tags.map((tag) => {
        // If this tag has usecases.usecases, flatten it
        if (tag.usecases && tag.usecases.usecases && typeof tag.usecases.usecases === "object") {
          return {
            ...tag,
            usecases: tag.usecases.usecases as unknown as Record<string, UseCaseDefinitionInput>,
          };
        }
        return tag;
      });

      // Only update if something changed
      const needsUpdate = JSON.stringify(fixedTags) !== JSON.stringify(tags);
      if (needsUpdate) {
        console.log("Fixed nested usecases in fetched tags");
      }
    }
  }, [tags]);

  /* -------------------------------------------------------------- *
   *  Memos
   * -------------------------------------------------------------- */
  const filteredUseCases = useMemo(
    () => (selectedTag ? useCases.filter((uc) => uc.tagId === selectedTag.id) : []),
    [useCases, selectedTag],
  );

  const availableUseCaseOptions = useMemo(() => {
    if (!selectedTag) return [];
    const assigned = filteredUseCases.map((uc) => uc.name);
    return useCaseTypes.filter((type) => !assigned.includes(type));
  }, [filteredUseCases, selectedTag, useCaseTypes]);

  /* -------------------------------------------------------------- *
   *  UI helpers
   * -------------------------------------------------------------- */
  const toggleEditMode = (uc: UseCase) => {
    if (editingUseCaseId === uc.id) {
      setEditingUseCaseId(null);
    } else {
      setEditingUseCaseId(uc.id);
      setSelectedUseCase(uc);
    }
  };

  const renderUseCaseItem = (uc: UseCase) => {
    const isEditingThis = editingUseCaseId === uc.id;
    const isSelected = selectedUseCase?.id === uc.id;

    return (
      <div className="flex w-full items-center justify-between">
        <span className="flex-1 truncate">{uc.name}</span>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            toggleEditMode(uc);
          }}
          className="rounded-full p-1 transition-colors hover:bg-gray-200"
          title={isEditingThis ? "View mode" : "Edit mode"}
        >
          {isEditingThis || isSelected ? (
            <Eye size={16} className="text-teal-600" />
          ) : (
            <Edit size={16} className="text-gray-500" />
          )}
        </Button>
      </div>
    );
  };

  /* -------------------------------------------------------------- *
   *  Render
   * -------------------------------------------------------------- */
  if (loading || useCasesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-red-500">
        <AlertCircle size={24} />
        <p>Failed to load functional tags. Please try again later.</p>
        <Button
          onClick={() => fetchTags()}
          className="mt-2 bg-teal-600 text-white hover:bg-teal-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <SectionWrapper entityName="Functional Tags" iconSrc={funcTag} height="77vh">
      <div className="flex h-full gap-3">
        {/* ----------------- Tag list ----------------- */}
        <div className="flex w-2/5 gap-5">
          <ListBox
            title="Functional Tags"
            items={tags || []}
            addMode="inline"
            placeholder="Tag Name"
            onAdd={() => {}}
            onAddWithLabel={handleAddTag}
            onEditInlineId={editingTagId}
            onEditStart={(tag) => setEditingTagId(tag.id)}
            onEditConfirm={handleEditTag}
            onItemClick={setSelectedTag}
            selectedItem={selectedTag}
            getItemLabel={(t) => t.name}
            getItemId={(t) => t.id}
            getItemColor={() => "#14B8A6"}
            emptyStateMessage="No functional tags configured"
            maxHeight="max-h-full"
            className="h-full"
            disabled={isAdding || editingUseCaseId !== null || isSaving}
          />

          {/* ---------------- Use‑case list --------------- */}
          <ListBox
            title="Use Cases"
            items={filteredUseCases}
            addMode="dropdown"
            placeholder="Select Use Case"
            onAdd={() => {}}
            addOptions={availableUseCaseOptions}
            onAddWithLabel={handleAddUseCase}
            onEdit={toggleEditMode}
            // Disable delete functionality as per requirements
            onDelete={undefined}
            onItemClick={(uc) => setSelectedUseCase((prev) => (prev?.id === uc.id ? null : uc))}
            renderItem={renderUseCaseItem}
            selectedItem={selectedUseCase}
            getItemLabel={(uc) => uc.name}
            getItemId={(uc) => uc.id}
            getItemColor={(uc) => (uc.isEnabled ? "#14B8A6" : "#9CA3AF")}
            disabled={isAdding || editingUseCaseId !== null || !selectedTag || isSaving}
            emptyStateMessage={selectedTag ? "No use cases configured" : "Select a tag first"}
            maxHeight="max-h-full"
            className="h-full"
          />
        </div>

        {/* --------------- Config / preview panel --------------- */}
        <div className="max-h-full w-3/5 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          {selectedUseCase ? (
            USECASES[selectedUseCase.name] ? (
              // ADD THIS ADDITIONAL CHECK HERE
              selectedUseCase.config || USECASES[selectedUseCase.name] ? (
                <UseCaseConfig
                  useCase={selectedUseCase.name}
                  selectedROIs={[]}
                  useCaseData={USECASES[selectedUseCase.name]}
                  existingConfig={selectedUseCase.config}
                  onComplete={handleUseCaseConfigComplete}
                  onBack={() => setEditingUseCaseId(null)}
                  siteId={siteId}
                  cameraId={selectedTag?.camera_ids?.[0] || ""}
                  mode={editingUseCaseId === selectedUseCase.id ? "edit" : "view"}
                  onCancel={() => {
                    if (tempUseCaseId && selectedUseCase?.id === tempUseCaseId) {
                      setUseCases((prev) => prev.filter((uc) => uc.id !== tempUseCaseId));
                    }
                    setEditingUseCaseId(null);
                    setSelectedUseCase(null);
                    setTempUseCaseId(null);
                    setIsAdding(false);
                  }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center text-amber-600">
                  <AlertCircle size={48} className="mb-4" />
                  <h3 className="mb-2 text-lg font-medium">Configuration Missing</h3>
                  <p className="text-sm text-gray-600">
                    Configuration data is missing for this use case. Please try refreshing or
                    contact support.
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-red-500">
                <AlertCircle size={48} className="mb-4" />
                <h3 className="mb-2 text-lg font-medium">Unknown Use Case</h3>
                <p className="text-sm text-gray-600">
                  This use case type "{selectedUseCase.name}" is not defined in the system. Please
                  contact your administrator for assistance.
                </p>
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-full bg-gray-50 p-6">
                <Eye className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-700">No Use Case Selected</h3>
              <p className="max-w-md text-sm text-gray-500">
                Select a use case from the list to view or edit its configuration.
                {availableUseCaseOptions.length > 0 && selectedTag && (
                  <span className="mt-2 block">
                    You can also add a new use case using the "+" button.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </SectionWrapper>
  );
}
