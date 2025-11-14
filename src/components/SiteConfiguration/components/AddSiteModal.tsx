import { AnonymisationControls, SiteSchema } from "@/api/types";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { useCreateSite, useUpdateSite, useUploadSiteImage } from "@/hooks/useApi";
import { validateSiteName } from "@/utils/inputValidation";
import { City, Country } from "country-state-city";
import { useEffect, useState } from "react";
import Select from "react-select";
import { SiteData } from "../types";

interface AddSiteModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  editSite?: SiteData | null;
}

const AddSiteModal: React.FC<AddSiteModalProps> = ({ open, onClose, onComplete, editSite }) => {
  const { user } = useAuth();
  const { env } = useEnv();
  const { execute: createSite } = useCreateSite();
  const { execute: uploadSiteImage } = useUploadSiteImage();
  const { execute: updateSite } = useUpdateSite();

  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    manager: "",
    vehicles: "",
    staffCount: "",
    imageUrl: "",
    edgeDeviceId: "",
    realEdgeDeviceId: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [siteNameError, setSiteNameError] = useState("");

  // Anonymisation controls state
  const [anonymisationEnabled, setAnonymisationEnabled] = useState(false);
  const [anonymisationControls, setAnonymisationControls] = useState<AnonymisationControls>({
    people: {
      face: false,
      full_body: false,
    },
    numberplate: false,
  });

  const countryOptions = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.isoCode,
  }));

  const cityOptions = selectedCountry
    ? City.getCitiesOfCountry(selectedCountry.value)?.map((city) => ({
        label: city.name,
        value: city.name,
      }))
    : [];

  const inputClass =
    "w-full p-2.5 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800 placeholder:text-gray-400";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    // For number inputs, ensure value is not negative
    if (type === "number") {
      const numValue = value === "" ? "" : Math.max(0, parseInt(value)).toString();
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
      // Validate site name on change
      if (name === "name") {
        const error = validateSiteName(value);
        setSiteNameError(error);
      }
    }
  };

  // Handle anonymisation checkbox changes
  const handleAnonymisationChange = (
    type: "face" | "full_body" | "numberplate",
    checked: boolean,
  ) => {
    if (type === "numberplate") {
      setAnonymisationControls((prev: AnonymisationControls) => ({
        ...prev,
        numberplate: checked,
      }));
    } else {
      setAnonymisationControls((prev: AnonymisationControls) => ({
        ...prev,
        people: {
          ...prev.people,
          [type]: checked,
        },
      }));
    }
  };

  // Add this helper function near the top of the component (after imports)
  const trimSasUrl = (url: string): string => {
    if (!url) return url;
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  };

  // Helper function to check if any anonymisation option is selected
  const hasAnonymisationSelected = (): boolean => {
    return (
      anonymisationControls.people.face ||
      anonymisationControls.people.full_body ||
      anonymisationControls.numberplate
    );
  };

  // Initialize form data when editing a site
  useEffect(() => {
    if (editSite) {
      setFormData({
        name: editSite.name || "",
        address: editSite.address || "",
        manager: editSite.manager || "",
        vehicles: editSite.vehicles?.toString() || "",
        staffCount: editSite.staffCount?.toString() || "",
        imageUrl: trimSasUrl(editSite.imageUrl || ""),
        edgeDeviceId: editSite.edgeDeviceId || "",
        realEdgeDeviceId: editSite.realEdgeDeviceId || "",
      });

      // Initialize anonymisation controls
      if (editSite.anonymisation_controls) {
        const controls = editSite.anonymisation_controls;

        setAnonymisationControls(controls);

        // Enable toggle if ANY control is true
        const isAnyEnabled =
          controls.people?.face || controls.people?.full_body || controls.numberplate;

        setAnonymisationEnabled(!!isAnyEnabled);
      } else {
        // No anonymisation controls exist
        setAnonymisationEnabled(false);
        setAnonymisationControls({
          people: {
            face: false,
            full_body: false,
          },
          numberplate: false,
        });
      }

      // Set country and city if available
      if (editSite.country) {
        const country = countryOptions.find((c) => c.label === editSite.country);
        setSelectedCountry(country || null);

        if (country && editSite.city) {
          setTimeout(() => {
            const cityOption = City.getCitiesOfCountry(country.value)?.find(
              (c) => c.name === editSite.city,
            );
            if (cityOption) {
              setSelectedCity({ label: cityOption.name, value: cityOption.name });
            }
          }, 0);
        }
      }
    } else {
      resetForm();
    }
  }, [editSite, open]);

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      manager: "",
      vehicles: "",
      staffCount: "",
      imageUrl: "",
      edgeDeviceId: "",
      realEdgeDeviceId: "",
    });
    setSelectedCountry(null);
    setSelectedCity(null);
    setImageFile(null);
    setIsSubmitting(false);
    setSiteNameError("");
    setAnonymisationEnabled(false);
    setAnonymisationControls({
      people: {
        face: false,
        full_body: false,
      },
      numberplate: false,
    });
  };

  // Update the handleSubmit function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate site name
    const nameError = validateSiteName(formData.name);
    if (nameError) {
      setSiteNameError(nameError);
      setIsSubmitting(false);
      return;
    } else {
      setSiteNameError("");
    }

    try {
      let siteImageUrl = formData.imageUrl;

      // Upload image if a new one is selected
      if (imageFile) {
        try {
          const imageUploadResult = await uploadSiteImage(imageFile);
          if (imageUploadResult && imageUploadResult.url) {
            siteImageUrl = imageUploadResult.url;
          }
        } catch (imageError) {
          console.error("Failed to upload image:", imageError);
          return;
        }
      }

      // Prepare site data according to the new API structure
      const sitePayload: SiteSchema = {
        name: formData.name,
        customer_id: user?.customer_id || "",
        city: selectedCity?.label || "",
        country: selectedCountry?.label || "",
        edge_device_id: formData.edgeDeviceId || "",
        real_edge_device_id: formData.realEdgeDeviceId || "",
        staff_count: parseInt(formData.staffCount) || 0,
        no_of_vehicle: parseInt(formData.vehicles) || 0,
        address: formData.address || undefined,
        manager: formData.manager || undefined,
        func_tags: [],
        cameras: editSite?.cameras || [],
      };

      // Handle anonymisation controls
      if (anonymisationEnabled && hasAnonymisationSelected()) {
        // Only add if enabled AND at least one option is selected
        sitePayload.anonymisation_controls = anonymisationControls;
      } else if (editSite?.anonymisation_controls) {
        // If editing a site that had controls but now they're disabled, explicitly clear them
        sitePayload.anonymisation_controls = {
          people: {
            face: false,
            full_body: false,
          },
          numberplate: false,
        };
      }

      // Only include site_image_url if a new image was uploaded
      if (imageFile) {
        sitePayload.site_image_url = siteImageUrl;
      }

      // Create or update the site
      if (editSite?.id) {
        // If we're editing, use the update API
        await updateSite(editSite.id, sitePayload);
      } else {
        // Create new site
        await createSite(sitePayload);
      }

      resetForm();
      onComplete();
    } catch (error) {
      console.error("Failed to add site:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modified canSubmit logic to include anonymisation validation and site name validation
  const canSubmit =
    formData.name &&
    !siteNameError &&
    selectedCountry &&
    selectedCity &&
    (!anonymisationEnabled || hasAnonymisationSelected());

  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      padding: "2px",
      borderRadius: "0.5rem",
      borderColor: "#d1d5db",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#9CA3AF",
      },
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#9CA3AF",
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#0F766E" : state.isFocused ? "#E6FFFA" : null,
      color: state.isSelected ? "white" : "#1F2937",
    }),
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) {
          resetForm();
          onClose();
        }
      }}
      title={editSite ? "Edit Site" : "Add New Site"}
    >
      <div className="mt-4 px-1">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Required Fields */}
          <div className="mb-2">
            <label htmlFor="name" className="mb-1 block text-xs font-medium text-gray-500">
              Site Name
            </label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              type="text"
              placeholder="Enter site name"
              maxLength={128}
              className={`${inputClass} ${siteNameError ? "border-red-500" : ""}`}
              required
            />
            {siteNameError && <p className="mt-1 text-xs text-red-600">{siteNameError}</p>}
            <p className="mt-1 pl-1 text-xs text-gray-500">{formData.name.length}/128 characters</p>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Country</label>
              <Select
                options={countryOptions}
                placeholder="Select country"
                value={selectedCountry}
                onChange={(value) => {
                  setSelectedCountry(value);
                  setSelectedCity(null);
                }}
                isSearchable
                styles={selectStyles}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">City</label>
              <Select
                options={cityOptions}
                placeholder="Select city"
                value={selectedCity}
                onChange={(value) => setSelectedCity(value)}
                isDisabled={!selectedCountry}
                isSearchable
                styles={selectStyles}
              />
            </div>
          </div>

          <div className="mb-2">
            <label htmlFor="address" className="mb-1 block text-xs font-medium text-gray-500">
              Address
            </label>
            <input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              type="text"
              placeholder="Enter address"
              className={inputClass}
            />
          </div>

          <div className="mb-2 grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="manager" className="mb-1 block text-xs font-medium text-gray-500">
                Manager
              </label>
              <input
                id="manager"
                name="manager"
                value={formData.manager}
                onChange={handleChange}
                type="text"
                placeholder="Enter manager name"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="staffCount" className="mb-1 block text-xs font-medium text-gray-500">
                Staff Count
              </label>
              <input
                id="staffCount"
                name="staffCount"
                value={formData.staffCount}
                onChange={handleChange}
                type="number"
                min="0"
                placeholder="Enter staff count"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="vehicles" className="mb-1 block text-xs font-medium text-gray-500">
                Vehicles
              </label>
              <input
                id="vehicles"
                name="vehicles"
                value={formData.vehicles}
                onChange={handleChange}
                type="number"
                min="0"
                placeholder="Enter vehicle count"
                className={inputClass}
              />
            </div>
          </div>

          {/* Edge Device ID Field (conditional - only shown when editing) */}
          {editSite && (
            <>
              {env === "real" && formData.realEdgeDeviceId && (
                <div className="mb-2">
                  <label
                    htmlFor="realEdgeDeviceId"
                    className="mb-1 block text-xs font-medium text-gray-500"
                  >
                    Real Edge Device ID
                  </label>
                  <input
                    id="realEdgeDeviceId"
                    name="realEdgeDeviceId"
                    value={formData.realEdgeDeviceId}
                    type="text"
                    className={`${inputClass} cursor-not-allowed bg-gray-100`}
                    disabled
                    readOnly
                  />
                </div>
              )}
              {env === "virtual" && formData.edgeDeviceId && (
                <div className="mb-2">
                  <label
                    htmlFor="edgeDeviceId"
                    className="mb-1 block text-xs font-medium text-gray-500"
                  >
                    Virtual Edge Device ID
                  </label>
                  <input
                    id="edgeDeviceId"
                    name="edgeDeviceId"
                    value={formData.edgeDeviceId}
                    type="text"
                    className={`${inputClass} cursor-not-allowed bg-gray-100`}
                    disabled
                    readOnly
                  />
                </div>
              )}
            </>
          )}

          {/* Site Image Section */}
          <div className="mt-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Site Image</label>
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
              <input
                type="file"
                className="w-full text-sm text-gray-600"
                accept="image/*"
                onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
              />
              {imageFile && <p className="mt-1 text-xs text-teal-600">{imageFile.name}</p>}
              {!imageFile && formData.imageUrl && (
                <p className="mt-1 text-xs text-teal-600">Current image will be used</p>
              )}
            </div>
          </div>

          {/* Anonymisation Section */}
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-2 pl-3">
            <div className="mt-1 mr-1 mb-2 flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-800">Anonymisation</h3>
              <button
                type="button"
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  anonymisationEnabled ? "bg-teal-600" : "bg-gray-200"
                }`}
                onClick={() => {
                  const newEnabled = !anonymisationEnabled;
                  setAnonymisationEnabled(newEnabled);

                  // Reset all controls when toggling off
                  if (!newEnabled) {
                    setAnonymisationControls({
                      people: {
                        face: false,
                        full_body: false,
                      },
                      numberplate: false,
                    });
                  }
                }}
              >
                {/* Toggle knob */}
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    anonymisationEnabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />

                {/* Text inside toggle */}
                <span
                  className={`absolute inset-0 flex items-center justify-${
                    anonymisationEnabled ? "start pl-2 text-white" : "end pr-1.5 text-gray-600"
                  } text-xs font-medium`}
                >
                  {anonymisationEnabled ? "On" : "Off"}
                </span>
              </button>
            </div>

            {anonymisationEnabled && (
              <div className="space-y-3 pl-1">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="person-face"
                    checked={anonymisationControls.people.face}
                    onChange={(e) => handleAnonymisationChange("face", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="person-face" className="ml-3 text-sm text-gray-700">
                    Person (Face)
                  </label>
                </div>

                {/* <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="person-full-body"
                    checked={anonymisationControls.people.full_body}
                    onChange={(e) => handleAnonymisationChange('full_body', e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="person-full-body" className="ml-3 text-sm text-gray-700">
                    Person (Full Body)
                  </label>
                </div> */}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="vehicle-numberplate"
                    checked={anonymisationControls.numberplate}
                    onChange={(e) => handleAnonymisationChange("numberplate", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <label htmlFor="vehicle-numberplate" className="ml-3 text-sm text-gray-700">
                    Vehicle (Number Plate)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex justify-end space-x-3">
            <Button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`rounded-lg px-4 py-2 text-sm ${
                canSubmit
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "cursor-not-allowed bg-gray-300 text-gray-700"
              } transition disabled:opacity-60`}
            >
              {isSubmitting ? "Saving..." : editSite ? "Update" : "Add Site"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddSiteModal;