// import React, { useEffect, useMemo, useState } from "react";
// import { toast } from "react-hot-toast";
// import {
//   ROIResponse,
//   UseCaseDefinitionInput,
// } from "@/api/types";
// import { useGetFunctionalTagsBySite, useCreateUseCase, useGetUseCasesByCamera } from "@/hooks/useApi";
// import { ListBox } from "../components/ListBox";
// import ROIDefinitionModal from "../ROI/ROIDefinitionModal";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter
// } from "@/components/ui/dialog"; // Make sure all these components are imported
// import UseCaseDetails from "./UseCaseDetails";
// import { ROI } from "../ROI/types";


// interface UsecasesProps {
//   cameraId: string;
//   ROIs: ROIResponse[];
//   imageUrl?: string;
//   onConfigComplete?: (config: any) => void;
//   onCancel?: () => void;
//   siteId: string;
//   customerId: string;
//   onRoiAdded?: () => void; // <-- Add the callback prop type
// }

// const Usecases: React.FC<UsecasesProps> = ({
//   cameraId,
//   ROIs: initialROIs,
//   imageUrl,
//   onCancel,
//   siteId,
//   onConfigComplete,
//   onRoiAdded
// }) => {
//   const { data: functionalTags = [], execute: fetchTags } = useGetFunctionalTagsBySite(siteId);
//   const { execute: createUseCase } = useCreateUseCase();
//   const { data: apiUseCases, execute: fetchUseCases } = useGetUseCasesByCamera(cameraId);

//   const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
//   const [selectedUseCaseName, setSelectedUseCaseName] = useState<string | null>(null);
//   const [selectedROIs, setSelectedROIs] = useState<ROIResponse[]>([]);
//   const [configUseCase, setConfigUseCase] = useState<{
//     tagId: string;
//     tagName: string;
//     useCaseName: string;
//     definition: UseCaseDefinitionInput;
//   } | null>(null);
//   const [showROIModal, setShowROIModal] = useState(false);
//   const [currentROIs, setCurrentROIs] = useState<ROIResponse[]>(initialROIs); // Local state to hold ROIs including newly added ones before parent refetch completes

//   useEffect(() => {
//     setCurrentROIs(initialROIs);
//   }, [initialROIs]);

//   useEffect(() => {
//     fetchTags();
//     fetchUseCases();
//   }, []);

//   const selectedTag = useMemo(
//     () => functionalTags.find(t => t.id === selectedTagId) || null,
//     [selectedTagId, functionalTags]
//   );

//   const usedUseCaseNamesForTag = useMemo(() => {
//     if (!selectedTag) return [];
//     return apiUseCases?.filter(uc => uc.func_tag === selectedTag.id).map(uc => uc.name) ?? [];
//   }, [apiUseCases, selectedTag]);

//   const useCaseDefs = (selectedTag?.usecases || {}) as Record<string, UseCaseDefinitionInput>;
//   const selectedDefinition = selectedUseCaseName ? useCaseDefs[selectedUseCaseName] : null;

//   const handleROISelect = (roi: ROIResponse) => {
//     setSelectedROIs([roi]); // Single selection only
//   };

//   const handleDrawROI = () => {
//     setShowROIModal(true);
//   };

//   const handleSaveROIModal = (newROIs: ROI[]) => {
//     setShowROIModal(false);

//     // Convert to ROIResponse shape (stub out required fields if needed)
//     const converted: ROIResponse[] = newROIs.map((r) => ({
//       id: r.id,
//       name: r.name,
//       coordinates: r.coordinates,
//       camera_id: cameraId, // from props
//       is_full_view: r.isFullView ?? false,
//       functional_tags: r.functionalTag?.split(",").map((t) => t.trim()) ?? [],
//       created_at: new Date().toISOString(), // You can override this if needed
//       updated_at: new Date().toISOString(), // Same here
//     }));

//     setCurrentROIs((prev) => [...prev, ...converted]);
//     setSelectedROIs([converted[0]]);

//     if (onRoiAdded) onRoiAdded();
//   };

//   const handleCloseROIModalWithoutSave = () => {
//     setShowROIModal(false);
//   }

//   // const handleCloseROIModal = (newROI?: ROIResponse) => {
//   //   setShowROIModal(false);
//   //   if (newROI) {
//   //     setSelectedROIs([newROI]);
//   //   }
//   // };

//   const isUseCaseAlreadyAssignedToROI = useMemo(() => {
//     if (!selectedUseCaseName || !selectedROIs.length) return false;
//     const selectedROI = selectedROIs[0];
//     return apiUseCases?.some(
//       (uc) => uc.name === selectedUseCaseName && uc.rois.includes(selectedROI.id)
//     );
//   }, [apiUseCases, selectedUseCaseName, selectedROIs]);


//   const handleLaunchAddUseCase = () => {
//     if (!selectedTag || !selectedUseCaseName || !selectedDefinition) return;

//     const selectedROI = selectedROIs[0];
//     const isDuplicate = apiUseCases?.some(
//       (uc) => uc.name === selectedUseCaseName && uc.rois.includes(selectedROI.id)
//     );

//     if (isDuplicate) {

//       toast.error("This use case is already assigned to the selected ROI.");
//       return;
//     }

//     setConfigUseCase({
//       tagId: selectedTag.id,
//       tagName: selectedTag.name,
//       useCaseName: selectedUseCaseName,
//       definition: JSON.parse(JSON.stringify(selectedDefinition)),
//     });
//   };


//   const resetPickers = () => {
//     setSelectedTagId(null);
//     setSelectedUseCaseName(null);
//     setSelectedROIs([]);
//     setConfigUseCase(null);
//   };

//   const addUseCaseNow = async () => {
//     if (!configUseCase) return;

//     const now = new Date().toISOString();

//     await createUseCase({
//       name: configUseCase.useCaseName,
//       type: configUseCase.useCaseName,
//       // objects: configUseCase.definition.objects,
//       // parameters: configUseCase.definition.parameters,
//       objects: [],
//       parameters: [],
//       business_rules: {},
//       count_notify: true,
//       site_id: siteId,
//       camera_id: cameraId,
//       rois: selectedROIs.map(r => r.id),
//       created_at: now,
//       func_tag: configUseCase.tagId,
//       func_tag_name: configUseCase.tagName,
//       edit_history: [{ time: now, description: "Created via UI" }],
//     });

//     const updatedUseCases = await fetchUseCases();
//     if (onConfigComplete) onConfigComplete(updatedUseCases);
//     resetPickers();
//   };

//   return (
//     <div className="w-full mt-6">
//       <div className="grid grid-cols-12 gap-6">
//         {/* Left Panel – ROI Selection (now moved to the left side) */}
//         <div className="col-span-3 space-y-4">
//           <ListBox
//             title="Select ROI"
//             items={currentROIs}
//             selectedItem={selectedROIs[0] || null}
//             onItemClick={handleROISelect}
//             getItemId={r => r.id}
//             getItemLabel={r => r.name || `ROI ${r.id}`}
//             getItemColor={r => r.is_full_view ? "#FF6B6B" : "#14B8A6"}
//             placeholder="ROI"
//             emptyStateMessage="No ROIs available"
//             onAdd={handleDrawROI} // Add this prop to enable the "+" button functionality
//             className="h-full"
//           />
//         </div>

//         {/* Middle Panel – Image Preview */}
//         <div className="col-span-6 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
//           <div className="h-[48vh]">
//             {imageUrl ? (
//               <img
//                 src={imageUrl}
//                 alt="Camera View"
//                 className="w-full h-full object-contain"
//               />
//             ) : (
//               <div className="flex h-[500px] items-center justify-center text-gray-400">
//                 No camera image available
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Right Panel – Tags + UseCases (now on right) */}
//         <div className="col-span-3 space-y-6">
//           <ListBox
//             title="Functional Tags"
//             items={functionalTags}
//             getItemId={t => t.id}
//             getItemLabel={t => t.name}
//             selectedItem={selectedTag}
//             onItemClick={t => {
//               if (!selectedROIs.length) {
//                 toast.error("Please select an ROI first.");
//                 return;
//               }
//               setSelectedTagId(t.id);
//               setSelectedUseCaseName(null);
//             }}
//             placeholder="Tag"
//             className="h-full"
//             disabled={!selectedROIs.length} // ✅ disable if no ROI selected
//             renderChild={(tag) => {
//               const useCaseDefs = (tag.usecases || {}) as Record<string, UseCaseDefinitionInput>;
//               const useCaseNames = Object.keys(useCaseDefs);
//               const alreadyUsed = apiUseCases?.filter(uc => uc.func_tag === tag.id).map(uc => uc.name) ?? [];

//               return (
//                 <select
//                   value={selectedTagId === tag.id ? selectedUseCaseName ?? "" : ""}
//                   onChange={(e) => {
//                     if (!selectedROIs.length) {
//                       toast.error("Please select an ROI first.");
//                       return;
//                     }

//                     const selectedName = e.target.value;
//                     const selectedROI = selectedROIs[0];

//                     const isDuplicate = apiUseCases?.some(
//                       (uc) => uc.name === selectedName && uc.rois.includes(selectedROI.id)
//                     );

//                     if (isDuplicate) {
//                       toast.error("This use case is already assigned to the selected ROI.");
//                       return;
//                     }
//                     setSelectedTagId(tag.id);
//                     setSelectedUseCaseName(selectedName || null);
//                   }}

//                   className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
//                 >
//                   <option value="">-- Choose Use Case --</option>
//                   {useCaseNames.map((n) => (
//                     <option key={n} value={n} disabled={alreadyUsed.includes(n)}>
//                       {n} {alreadyUsed.includes(n) ? "(Already Added)" : ""}
//                     </option>
//                   ))}
//                 </select>
//               );
//             }}
//           />

//           {/* {selectedTag && (
//             <div className="space-y-2">
//               <label className="block text-sm font-semibold text-gray-700">
//                 Select Use Case
//               </label>
//               <div className="border rounded-lg overflow-hidden border-gray-300">
//                 {useCaseNames.map(n => {
//                   const alreadyUsed = usedUseCaseNamesForTag.includes(n);
//                   return (
//                     <div
//                       key={n}
//                       onClick={() => !alreadyUsed && setSelectedUseCaseName(n)}
//                       className={`flex cursor-pointer items-center justify-between px-4 py-2 text-sm
//                   ${alreadyUsed ? "text-gray-400 bg-gray-50 cursor-not-allowed" : "hover:bg-teal-50"}
//                   ${selectedUseCaseName === n ? "bg-teal-100" : ""}
//                 `}
//                     >
//                       {n}
//                       {selectedUseCaseName === n && !alreadyUsed && (
//                         <Check className="h-4 w-4 text-teal-600" />
//                       )}
//                       {alreadyUsed && <span className="text-xs italic">(Already Added)</span>}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )} */}
//         </div>
//       </div>

//       {/* Bottom Action Buttons */}
//       <div className="flex justify-between pt-6">
//         <button
//           onClick={onCancel}
//           className="rounded-md border border-gray-300 px-6 py-2 text-gray-700 hover:bg-gray-50"
//         >
//           Back


//         </button>
//         <button
//           onClick={handleLaunchAddUseCase}
//           disabled={
//             !selectedTag ||
//             !selectedUseCaseName ||
//             !selectedROIs.length ||
//             usedUseCaseNamesForTag.includes(selectedUseCaseName)}
//           className={`rounded-md px-6 py-2 font-semibold text-white ${selectedTag &&
//             selectedUseCaseName &&
//             selectedROIs.length &&
//             !usedUseCaseNamesForTag.includes(selectedUseCaseName) &&
//             !isUseCaseAlreadyAssignedToROI
//             ? "bg-teal-600 hover:bg-teal-700"
//             : "cursor-not-allowed bg-gray-300"
//             }`}
//         >
//           Add Use Case
//         </button>
//       </div>

//       {/* ROI Drawing Modal */}
//       {showROIModal && (
//         <ROIDefinitionModal
//           cameraId={cameraId}
//           onClose={handleCloseROIModalWithoutSave}
//           onSave={handleSaveROIModal}
//           imageUrl={imageUrl || ""}
//           cameraName=""
//         />
//       )}

//       {/* Use Case Confirmation Dialog using UseCaseDetails */}
//       <Dialog open={configUseCase !== null} onOpenChange={(open) => !open && setConfigUseCase(null)}>
//         <DialogContent className="max-w-xl bg-white">
//           <DialogHeader>
//             <DialogTitle>Confirm Use Case Configuration</DialogTitle>
//           </DialogHeader>

//           {configUseCase && (
//             <UseCaseDetails
//               useCase={{
//                 id: "temp",
//                 name: configUseCase.useCaseName,
//                 func_tag_name: configUseCase.tagName,
//                 objects: configUseCase.definition.objects,
//                 parameters: configUseCase.definition.parameters.map((p) => {
//                   if (p.type === "range" && Array.isArray(p.int_params)) {
//                     return {
//                       id: p.id,
//                       type: "range",
//                       int_params: p.int_params,
//                       str_params: [""], // required by unified type
//                       unit: p.unit ?? ""
//                     };
//                   } else if (p.type === "dropdown" && Array.isArray(p.int_params)) {
//                     return {
//                       id: p.id,
//                       type: "dropdown",
//                       int_params: [0, 0], // placeholder to satisfy shape
//                       str_params: [p.int_params?.[0] ?? ""],
//                       unit: ""
//                     };
//                   } else {
//                     return {
//                       id: p.id,
//                       type: p.type,
//                       int_params: [0, 0],
//                       str_params: [""],
//                       unit: ""
//                     };
//                   }
//                 })
//               }}
//               roi={selectedROIs.length > 0 ? selectedROIs : undefined}
//             />
//           )}

//           <DialogFooter className="mt-6 flex justify-end gap-3 ">
//             <button
//               className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100"
//               onClick={() => setConfigUseCase(null)}
//             >
//               Cancel
//             </button>
//             <button
//               className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
//               onClick={addUseCaseNow}
//             >
//               Confirm & Save
//             </button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );

// };

// export default Usecases;