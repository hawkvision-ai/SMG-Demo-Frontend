// import React, { useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { useCreateSite } from "@/hooks/useApi";
// import { toast } from "react-hot-toast";
// import { Card } from "@/components/ui/card";

// export const CreateSiteModal: React.FC = () => {
//   // Site details - added all required fields based on API schema
//   const [siteName, setSiteName] = useState<string>("");
//   const [city, setCity] = useState<string>("");
//   const [country, setCountry] = useState<string>("");
//   const [customerId, setCustomerId] = useState<string>("");

//   // Optional fields
//   const [address, setAddress] = useState<string>("");
//   const [manager, setManager] = useState<string>("");
//   const [staffCount, setStaffCount] = useState<string>("");
//   const [vehicleCount, setVehicleCount] = useState<string>("");
//   const [edgeDeviceId, setEdgeDeviceId] = useState<string>("1"); // Default value for edge_device_id

//   // API integration
//   const { execute: createSite, loading: isCreatingSite } = useCreateSite();

//   // Handle saving the site
//   const handleSaveSite = async () => {
//     // Validate required inputs
//     if (!siteName.trim()) {
//       toast.error("Please enter a site name");
//       return;
//     }

//     if (!city.trim()) {
//       toast.error("Please enter a city");
//       return;
//     }

//     if (!country.trim()) {
//       toast.error("Please enter a country");
//       return;
//     }

//     if (!customerId.trim()) {
//       toast.error("Please enter a customer ID");
//       return;
//     }

//     try {
//       // Create new site with correct schema for the updated API
//       await createSite({
//         name: siteName,
//         city: city,
//         country: country,
//         edge_device_id: edgeDeviceId,
//         site_image_url:"",
//         // Convert numeric fields to numbers
//         staff_count: staffCount ? parseInt(staffCount) : 0,
//         no_of_vehicle: vehicleCount ? parseInt(vehicleCount) : 0,
//         // Optional fields - only include if they have values
//         ...(address.trim() && { address }),
//         ...(manager.trim() && { manager }),
//       });

//       // Show success message
//       toast.success("Site created successfully!");

//       // Reset form
//       setSiteName("");
//       setCity("");
//       setCountry("");
//       setCustomerId("");
//       setAddress("");
//       setManager("");
//       setStaffCount("");
//       setVehicleCount("");
//       setEdgeDeviceId("1");
//     } catch (error) {
//       toast.error("Failed to create site. Please try again.");
//       console.error(error);
//     }
//   };

//   return (
//     <Card className="rounded-lg border-none p-6 shadow-none">
//       <div className="w-full">
//         <h1 className="mb-6 text-2xl font-semibold">Create Your Site</h1>

//         {/* Required Fields Section */}
//         <div className="mb-6">
//           <h2 className="mb-4 text-lg font-medium">Required Information</h2>

//           <div className="mb-4 flex items-center">
//             <div className="mr-4 flex items-center justify-center">
//               <img src="/icons/site.svg" alt="Site" className="h-6 w-6" />
//             </div>
//             <Input
//               className="h-12 flex-1 rounded-md border-gray-300"
//               placeholder="Enter a Site Name"
//               value={siteName}
//               onChange={(e) => setSiteName(e.target.value)}
//               required
//             />
//           </div>

//           <div className="flex flex-col gap-4 md:flex-row md:gap-8">
//             <div className="flex items-center">
//               <div className="mr-4 flex items-center justify-center">
//                 <img src="/icons/location.svg" alt="City" className="h-6 w-6" />
//               </div>
//               <Input
//                 className="h-12 flex-1 rounded-md border-gray-300"
//                 placeholder="City"
//                 value={city}
//                 onChange={(e) => setCity(e.target.value)}
//                 required
//               />
//             </div>

//             <div className="flex items-center">
//               <div className="mr-4 flex items-center justify-center">
//                 <img src="/icons/globe.svg" alt="Country" className="h-6 w-6" />
//               </div>
//               <Input
//                 className="h-12 flex-1 rounded-md border-gray-300"
//                 placeholder="Country"
//                 value={country}
//                 onChange={(e) => setCountry(e.target.value)}
//                 required
//               />
//             </div>
//           </div>
//         </div>

//         {/* Optional Fields Section */}
//         <div className="mb-6">
//           <h2 className="mb-4 text-lg font-medium">Additional Information</h2>

//           <div className="mb-4 flex items-center">
//             <div className="mr-4 flex items-center justify-center">
//               <img src="/icons/location.svg" alt="Address" className="h-6 w-6" />
//             </div>
//             <Input
//               className="h-12 flex-1 rounded-md border-gray-300"
//               placeholder="Address (Optional)"
//               value={address}
//               onChange={(e) => setAddress(e.target.value)}
//             />
//           </div>

//           <div className="mb-4 flex items-center">
//             <div className="mr-4 flex items-center justify-center">
//               <img src="/icons/user.svg" alt="Manager" className="h-6 w-6" />
//             </div>
//             <Input
//               className="h-12 flex-1 rounded-md border-gray-300"
//               placeholder="Manager (Optional)"
//               value={manager}
//               onChange={(e) => setManager(e.target.value)}
//             />
//           </div>

//           <div className="flex flex-col gap-4 md:flex-row md:gap-8">
//             <div className="flex items-center">
//               <div className="mr-4 flex items-center justify-center">
//                 <img src="/icons/staff.svg" alt="Staff" className="h-6 w-6" />
//               </div>
//               <Input
//                 className="h-12 flex-1 rounded-md border-gray-300"
//                 placeholder="No of staffs"
//                 value={staffCount}
//                 onChange={(e) => setStaffCount(e.target.value)}
//                 type="number"
//               />
//             </div>

//             <div className="flex items-center">
//               <div className="mr-4 flex items-center justify-center">
//                 <img src="/icons/vehicle.svg" alt="Vehicles" className="h-6 w-6" />
//               </div>
//               <Input
//                 className="h-12 flex-1 rounded-md border-gray-300"
//                 placeholder="No of Vehicles"
//                 value={vehicleCount}
//                 onChange={(e) => setVehicleCount(e.target.value)}
//                 type="number"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Save Site Button */}
//         <Button
//           onClick={handleSaveSite}
//           disabled={isCreatingSite}
//           className="h-14 w-full rounded-2xl bg-teal-700 font-medium text-white hover:bg-teal-800"
//         >
//           {isCreatingSite ? "Creating..." : "Save Site"}
//         </Button>
//       </div>
//     </Card>
//   );
// };
