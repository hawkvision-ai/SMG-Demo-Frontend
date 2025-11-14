/* ------------------------------------------------------------------ *
 *  UseCaseConfig.tsx  —  parameter & object configurator
 * ------------------------------------------------------------------ */
import { ROIResponse, UseCaseDefinitionInput } from "@/api/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

// Inline validation constants
const VALIDATION_CONSTANTS = {
  MAX_INTEGER_DIGITS: 8, // 8 digits before decimal point
  MAX_DECIMAL_PLACES: 5, // 5 digits after decimal point
  MAX_VALUE: 99999999,
  MIN_VALUE: 0,
} as const;

/* ---------- local UI helper types --------------------------------- */
interface ObjectSetting {
  isSelected: boolean;
  notify: boolean;
}

type ObjectSettings = Record<string, ObjectSetting>;
type ParamValues = Record<string, number | string>;

/* ---------- props -------------------------------------------------- */
interface UseCaseConfigProps {
  useCase: string;
  selectedROIs: ROIResponse[];
  useCaseData: UseCaseDefinitionInput;
  onComplete?: (config: UseCaseDefinitionInput) => void;
  onBack?: () => void;
  onCancel?: () => void;
  siteId: string;
  cameraId: string;
  mode?: "view" | "edit";
  className?: string;
  existingConfig?: UseCaseDefinitionInput;
}

/* =================================================================== */
const UseCaseConfig: React.FC<UseCaseConfigProps> = ({
  useCase,
  useCaseData,
  onComplete,
  mode = "edit",
  existingConfig,
  onCancel,
}) => {
  /* ---------- state ------------------------------------------------ */
  const [objectSettings, setObjectSettings] = useState<ObjectSettings>({});
  const [paramValues, setParamValues] = useState<ParamValues>({});
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});
  const [globalNotify, setGlobalNotify] = useState<boolean>(true);

  /* ---------- initialise from props -------------------------------- */
  useEffect(() => {
    if (!useCaseData) return;

    const objSettings: ObjectSettings = {};
    useCaseData.objects.forEach(([name, defaultNotify]) => {
      const savedObj = existingConfig?.objects.find((o) => o[0] === name);
      const savedSelected = !!savedObj;

      let savedNotify = defaultNotify;
      if (savedObj && savedObj.length > 1) {
        savedNotify = savedObj[1] === true;
      }

      objSettings[name] = {
        isSelected: savedSelected,
        notify: savedNotify,
      };
    });

    setObjectSettings(objSettings);

    const paramInit: ParamValues = {};
    useCaseData.parameters.forEach((p) => {
      const saved = existingConfig?.parameters.find((sp) => sp.id === p.id);

      if (p.type === "range") {
        let defaultValue = 0;
        let savedValue = 0;

        if (saved?.type === "range") {
          savedValue = Array.isArray(saved.int_params)
            ? saved.int_params[0]
            : typeof saved.int_params === "number"
              ? saved.int_params
              : defaultValue;
        }

        paramInit[p.id] = savedValue || defaultValue;
      } else {
        let defaultValue = "";
        if (p.int_params && Array.isArray(p.int_params) && p.int_params.length > 0) {
          defaultValue = p.int_params[0];
        }

        let savedValue = "";

        if (saved?.type === "dropdown") {
          savedValue = Array.isArray(saved.int_params)
            ? saved.int_params[0]
            : typeof saved.int_params === "string"
              ? saved.int_params
              : defaultValue;
        }

        paramInit[p.id] = savedValue || defaultValue;
      }
    });

    setParamValues(paramInit);
  }, [useCaseData, existingConfig]);

  /* ---------- helpers ---------------------------------------------- */
  const toggleObjectSelection = (name: string) => {
    const s = objectSettings[name];
    if (mode === "view") return;
    setObjectSettings((prev) => ({
      ...prev,
      [name]: { ...s, isSelected: !s.isSelected },
    }));
  };

  const toggleNotification = (name: string) => {
    const s = objectSettings[name];
    if (mode === "view") return;
    setObjectSettings((prev) => ({
      ...prev,
      [name]: { ...s, notify: !s.notify },
    }));
  };

  const toggleGlobalNotify = () => {
    if (mode === "view") return;
    setGlobalNotify((prev) => !prev);
  };

  const handleParamChange = (paramId: string, value: number | string) => {
    if (mode === "view") return;
    setParamValues((prev) => ({ ...prev, [paramId]: value }));
  };

  const format = (str: string) => {
    const parameterDisplayNames: Record<string, string> = {
      margin_distance: "Safe Distance",
    };

    if (parameterDisplayNames[str]) {
      return parameterDisplayNames[str];
    }

    return str
      .split("_")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  };

  /* ---------- save -------------------------------------------------- */
  const handleSaveConfig = () => {
    const objects = Object.entries(objectSettings)
      .filter(([, s]) => s.isSelected)
      .map(([name, s]) => [name, false, s.notify] as [string, boolean, boolean]);

    if (useCaseData.objects.length > 0 && objects.length === 0) {
      toast.error("At least one object must be selected.");
      return;
    }

    const parameters: UseCaseDefinitionInput["parameters"] = useCaseData.parameters.map((p) => {
      if (p.type === "range") {
        const val = Number(paramValues[p.id] ?? 0);
        return {
          id: p.id,
          type: "range",
          int_params: [val, val],
          unit: p.unit ?? undefined,
        };
      } else {
        const val = String(paramValues[p.id] ?? "");
        return {
          id: p.id,
          type: "dropdown",
          int_params: [val],
          unit: p.unit ?? undefined,
        };
      }
    });

    onComplete?.({ objects, parameters });
  };

  /* ---------- Toggle Switch Component ------------------------------ */
  const ToggleSwitch = ({
    checked,
    onChange,
    disabled = false,
  }: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none ${
        checked ? "bg-teal-600" : "bg-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`absolute left-1.5 text-xs font-medium text-white transition-opacity duration-200 ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      >
        On
      </span>
      <span
        className={`absolute right-1 text-xs font-medium text-gray-500 transition-opacity duration-200 ${
          checked ? "opacity-0" : "opacity-100"
        }`}
      >
        Off
      </span>
      <span
        className={`relative z-10 inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );

  const hasObjects = useCaseData.objects.length > 0;
  const hasParameters = useCaseData.parameters.length > 0;
  const showGlobalNotify = !hasObjects && !hasParameters;
  const showGlobalNotifyWithParameters = !hasObjects && hasParameters;

  /* ---------- render ------------------------------------------------ */
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Configure {useCase.replace(/[_-]/g, " ")}
        </h2>
        <div className="flex items-center space-x-4">
          {(showGlobalNotify || showGlobalNotifyWithParameters) && (
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">Notify</span>
              <ToggleSwitch
                checked={globalNotify}
                onChange={toggleGlobalNotify}
                disabled={mode === "view"}
              />
            </div>
          )}
          {mode === "edit" && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
              Edit Mode Active
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {showGlobalNotify && (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-gray-50 p-6">
              <Info className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-700">
              No parameters or objects are required for this use case.
            </h3>
            <p className="max-w-md text-lg text-gray-500">
              You can save the configuration directly.
            </p>
          </div>
        )}

        {/* Objects */}
        {hasObjects && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-lg font-medium text-gray-800">Objects</h3>
            {useCaseData.objects.map(([name]) => {
              const s = objectSettings[name];
              if (!s) return null;
              return (
                <div
                  key={name}
                  className="flex items-center justify-between border-b border-gray-200 py-3 last:border-0"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={s.isSelected}
                      onChange={() => toggleObjectSelection(name)}
                      disabled={mode === "view"}
                      className="mr-3 h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="capitalize">{format(name)}</span>
                  </div>
                  {s.isSelected && (
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">Notify</span>
                      <ToggleSwitch
                        checked={s.notify}
                        onChange={() => toggleNotification(name)}
                        disabled={mode === "view"}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Parameters */}
        {hasParameters && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-4 text-lg font-medium text-gray-800">Parameters</h3>

            {useCaseData.parameters.map((p) => {
              const label = (
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {format(p.id)} {p.unit ? `(${p.unit})` : ""}
                </span>
              );

              if (p.type === "range") {
                const value = paramValues[p.id] !== undefined ? paramValues[p.id] : "";

                // Define parameter-specific min/max ranges
                const getMinMax = (paramId: string) => {
                  // Vehicle count parameters should be 1-25
                  if (paramId === "max_vehicles") {
                    return { min: 1, max: 25 };
                  }
                  // Default range for other parameters
                  return {
                    min: VALIDATION_CONSTANTS.MIN_VALUE,
                    max: VALIDATION_CONSTANTS.MAX_VALUE,
                  };
                };

                const { min, max } = getMinMax(p.id);

                const validateInput = (inputValue: string): boolean => {
                  if (inputValue === "") return true;

                  const parts = inputValue.split(".");
                  const integerPart = parts[0] || "";
                  const decimalPart = parts[1] || "";

                  // Check integer part
                  if (integerPart.length > VALIDATION_CONSTANTS.MAX_INTEGER_DIGITS) {
                    setParamErrors((prev) => ({
                      ...prev,
                      [p.id]: `Maximum ${VALIDATION_CONSTANTS.MAX_INTEGER_DIGITS} digits before decimal`,
                    }));
                    return false;
                  }

                  // Check decimal part
                  if (decimalPart.length > VALIDATION_CONSTANTS.MAX_DECIMAL_PLACES) {
                    setParamErrors((prev) => ({
                      ...prev,
                      [p.id]: `Maximum ${VALIDATION_CONSTANTS.MAX_DECIMAL_PLACES} decimal places`,
                    }));
                    return false;
                  }

                  const numValue = parseFloat(inputValue);
                  if (isNaN(numValue)) return false;

                  if (numValue < min) {
                    setParamErrors((prev) => ({
                      ...prev,
                      [p.id]: `Value must be at least ${min}`,
                    }));
                    return false;
                  }

                  if (numValue > max) {
                    setParamErrors((prev) => ({
                      ...prev,
                      [p.id]: `Value cannot exceed ${max}`,
                    }));
                    return false;
                  }

                  return true;
                };

                const handleInputChange = (inputValue: string) => {
                  setParamErrors((prev) => ({ ...prev, [p.id]: "" }));

                  if (inputValue === "") {
                    handleParamChange(p.id, "");
                    return;
                  }

                  // For max_vehicles, don't allow decimal points at all
                  if (p.id === "max_vehicles" && inputValue.includes(".")) {
                    setParamErrors((prev) => ({
                      ...prev,
                      [p.id]: "Vehicles must be a whole number",
                    }));
                    return;
                  }

                  // Only allow digits and a single decimal point
                  const validInputRegex = /^[0-9]*\.?[0-9]*$/;
                  if (!validInputRegex.test(inputValue)) {
                    return; // Don't update if invalid characters
                  }

                  // Prevent multiple decimal points
                  const decimalCount = (inputValue.match(/\./g) || []).length;
                  if (decimalCount > 1) {
                    return;
                  }

                  // Allow typing decimal point and any digits after it (including zeros)
                  // This handles cases like "1.", "1.0", "1.00", "12.003", "122.00000"
                  if (validateInput(inputValue)) {
                    handleParamChange(p.id, inputValue);
                  }
                };

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-gray-200 py-2 last:border-0"
                  >
                    {label}
                    <div className="flex w-3/5 items-center justify-end">
                      <div className="flex w-full flex-col items-end">
                        <div className="flex items-center">
                          <input
                            type="text"
                            inputMode={p.id === "max_vehicles" ? "numeric" : "decimal"}
                            value={value}
                            placeholder="0"
                            onChange={(e) => handleInputChange(e.target.value)}
                            onBlur={(e) => {
                              const val = e.target.value;
                              // Clean up trailing decimal point on blur (optional)
                              if (val.endsWith(".") && p.id !== "max_vehicles") {
                                const cleanedValue = val.slice(0, -1);
                                handleParamChange(p.id, cleanedValue || "");
                              }
                            }}
                            disabled={mode === "view"}
                            className={`h-10 w-auto min-w-[5rem] rounded border pr-4 pl-2 text-left text-sm focus:outline-none ${
                              paramErrors[p.id]
                                ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200"
                                : "border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            }`}
                          />
                          {p.unit && (
                            <span className="ml-2 text-sm whitespace-nowrap text-gray-600">
                              {p.unit}
                            </span>
                          )}
                        </div>
                        {paramErrors[p.id] && (
                          <p className="mt-1 text-right text-xs font-medium text-red-600">
                            {paramErrors[p.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-b border-gray-200 py-2 last:border-0"
                >
                  {label}
                  <div className="w-3/5">
                    <Select
                      value={String(paramValues[p.id] ?? "")}
                      onValueChange={(value) => handleParamChange(p.id, value)}
                      disabled={mode === "view"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(p.int_params ?? []).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {format(opt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {mode === "edit" && (
        <div className="flex justify-between border-t border-gray-200 bg-white px-6 py-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="rounded-md bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          >
            Save Configuration
          </button>
        </div>
      )}
    </div>
  );
};

export default UseCaseConfig;