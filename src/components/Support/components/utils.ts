// utils.ts - Validation utilities for Create Ticket Modal
import {
  validateTextField as validateTextFieldUtil,
  ValidationResult,
} from "@/utils/inputValidation";
import React from "react";

// Re-export ValidationResult for backward compatibility
export type { ValidationResult };

export interface FormData {
  subject: string;
  category: string;
  description: string;
  priority: string;
  issue_key: string;
  sites: Array<{ id: string; name: string; cameras: string[] }>;
}

export interface FormErrors {
  subject?: string;
  category?: string;
  description?: string;
  sites?: string;
  submit?: string;
}

export interface TouchedFields {
  subject: boolean;
  description: boolean;
}

/**
 * Validates a text field (subject or description)
 */
export const validateTextField = (
  value: string,
  fieldName: "subject" | "description",
): ValidationResult => {
  const minLength = fieldName === "subject" ? 3 : 20;
  return validateTextFieldUtil(
    value,
    fieldName === "subject" ? "Subject" : "Description",
    minLength,
  );
};

/**
 * Validates the category field
 */
export const validateCategory = (category: string): ValidationResult => {
  if (!category || category.trim() === "") {
    return {
      isValid: false,
      error: "Category is required",
    };
  }

  return { isValid: true };
};

/**
 * Validates the sites selection
 */
export const validateSites = (
  sites: Array<{ id: string; name: string; cameras: string[] }>,
): ValidationResult => {
  if (sites.length === 0) {
    return {
      isValid: false,
      error: "At least one site must be selected",
    };
  }

  return { isValid: true };
};

/**
 * Validates the entire form
 */
export const validateForm = (formData: FormData): { isValid: boolean; errors: FormErrors } => {
  const errors: FormErrors = {};
  let isValid = true;

  // Validate subject
  const subjectValidation = validateTextField(formData.subject, "subject");
  if (!subjectValidation.isValid) {
    errors.subject = subjectValidation.error;
    isValid = false;
  }

  // Validate category
  const categoryValidation = validateCategory(formData.category);
  if (!categoryValidation.isValid) {
    errors.category = categoryValidation.error;
    isValid = false;
  }

  // Validate description
  const descriptionValidation = validateTextField(formData.description, "description");
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.error;
    isValid = false;
  }

  // Sites validation is optional - uncomment if needed
  // const sitesValidation = validateSites(formData.sites);
  // if (!sitesValidation.isValid) {
  //   errors.sites = sitesValidation.error;
  //   isValid = false;
  // }

  return { isValid, errors };
};

/**
 * Debounce utility function
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number,
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
): ((...args: Parameters<T>) => void) => {
  return (...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => func(...args), delay);
  };
};

/**
 * Creates debounced validation functions for form fields
 */
export const createDebouncedValidation = (
  fieldName: "subject" | "description",
  delay: number,
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>,
) => {
  return debounce(
    (value: string, touched: boolean) => {
      if (touched) {
        const validation = validateTextField(value, fieldName);
        setErrors((prev) => ({
          ...prev,
          [fieldName]: validation.isValid ? undefined : validation.error,
        }));
      }
    },
    delay,
    timeoutRef,
  );
};

/**
 * Format file size utility
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Sorting utilities
 */
export type SortOrder = "asc" | "desc";

export const sortOptions = <T extends { label: string; value: string }>(
  options: T[],
  order: SortOrder,
): T[] => {
  return [...options].sort((a, b) => {
    const comparison = a.label.localeCompare(b.label);
    return order === "asc" ? comparison : -comparison;
  });
};

/**
 * Get next sort order
 */
export const getNextSortOrder = (currentOrder: SortOrder): SortOrder => {
  return currentOrder === "asc" ? "desc" : "asc";
};

/**
 * Clear errors for a specific field
 */
export const clearFieldError = (
  fieldName: keyof FormErrors,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>,
) => {
  setErrors((prev) => ({
    ...prev,
    [fieldName]: undefined,
  }));
};

/**
 * Mark field as touched
 */
export const markFieldTouched = (
  fieldName: keyof TouchedFields,
  setTouchedFields: React.Dispatch<React.SetStateAction<TouchedFields>>,
) => {
  setTouchedFields((prev) => ({
    ...prev,
    [fieldName]: true,
  }));
};
