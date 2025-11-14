/**
 * Input Validation Utilities
 *
 * Centralized validation functions for form inputs across the application.
 * Provides consistent validation rules and error messages.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface NameValidationOptions {
  fieldName?: string;
  minLength?: number;
  maxLength?: number;
  allowOnlyNumbers?: boolean;
  allowOnlySpecialChars?: boolean;
  requireLetter?: boolean;
  allowEmpty?: boolean;
}

/**
 * Validates a name field (site name, camera name, tag name, etc.)
 *
 * @param value - The value to validate
 * @param options - Validation options
 * @returns Validation result with error message if invalid
 *
 * @example
 * const result = validateName("Site 1", { fieldName: "Site name", maxLength: 128 });
 * if (!result.isValid) {
 *   console.error(result.error);
 * }
 */
export const validateName = (
  value: string,
  options: NameValidationOptions = {},
): ValidationResult => {
  const {
    fieldName = "Name",
    minLength = 0,
    maxLength = Infinity,
    allowOnlyNumbers = false,
    allowOnlySpecialChars = false,
    requireLetter = false,
    allowEmpty = false,
  } = options;

  // Check if empty
  if (!value || !value.trim()) {
    if (allowEmpty) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  const trimmedValue = value.trim();

  // Check minimum length
  if (trimmedValue.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} character${minLength > 1 ? "s" : ""}`,
    };
  }

  // Check maximum length
  if (trimmedValue.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
    };
  }

  // Check if only numbers
  if (!allowOnlyNumbers && /^\d+$/.test(trimmedValue)) {
    return {
      isValid: false,
      error: `${fieldName} cannot consist of only numbers`,
    };
  }

  // Check if only special characters (no letters or numbers)
  if (!allowOnlySpecialChars && /^[^a-zA-Z0-9]+$/.test(trimmedValue)) {
    return {
      isValid: false,
      error: `${fieldName} cannot consist of only special characters`,
    };
  }

  // Check if contains no letters (only numbers and/or special characters)
  // This catches cases like "!@@##212" which is a mix of special chars and numbers but no letters
  if (!allowOnlyNumbers && !allowOnlySpecialChars && !/[a-zA-Z]/.test(trimmedValue)) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least one letter`,
    };
  }

  // Check if contains at least one letter (for requireLetter option)
  if (requireLetter && !/[a-zA-Z]/.test(trimmedValue)) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least one letter`,
    };
  }

  return { isValid: true };
};

/**
 * Returns just the error message string or empty string
 * Convenience wrapper around validateName for simpler usage
 *
 * @example
 * const error = validateNameString("123", { fieldName: "Site name" });
 * setError(error);
 */
export const validateNameString = (value: string, options: NameValidationOptions = {}): string => {
  const result = validateName(value, options);
  return result.error || "";
};

/**
 * Validates a site name
 * Default rules: max 128 chars, no only-numbers, no only-special-chars
 */
export const validateSiteName = (value: string): string => {
  return validateNameString(value, {
    fieldName: "Site name",
    maxLength: 128,
    allowOnlyNumbers: false,
    allowOnlySpecialChars: false,
  });
};

/**
 * Validates a camera name
 * Default rules: requires at least one letter
 */
export const validateCameraName = (value: string): string => {
  return validateNameString(value, {
    fieldName: "Camera name",
    requireLetter: true,
    allowEmpty: true, // Allow empty for optional validation
  });
};

/**
 * Validates a tag name
 * Default rules: max 50 chars, no only-numbers, no only-special-chars
 */
export const validateTagName = (value: string): string => {
  return validateNameString(value, {
    fieldName: "Tag name",
    maxLength: 50,
    allowOnlyNumbers: false,
    allowOnlySpecialChars: false,
  });
};

/**
 * Validates a location tag name
 * Default rules: max 50 chars, no only-numbers, no only-special-chars
 */
export const validateLocationTagName = (value: string): string => {
  return validateNameString(value, {
    fieldName: "Tag name",
    maxLength: 50,
    allowOnlyNumbers: false,
    allowOnlySpecialChars: false,
  });
};

/**
 * Validates text fields like subject or description
 */
export const validateTextField = (
  value: string,
  fieldName: string,
  minLength: number = 3,
): ValidationResult => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  if (trimmedValue.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters (${trimmedValue.length}/${minLength})`,
    };
  }

  // Check if contains at least one letter
  const hasLetter = /[a-zA-Z]/.test(trimmedValue);
  if (!hasLetter) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least one letter`,
    };
  }

  return { isValid: true };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return {
      isValid: false,
      error: "Email is required",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return {
      isValid: false,
      error: "Please enter a valid email address",
    };
  }

  return { isValid: true };
};

/**
 * Validates URL format
 */
export const validateUrl = (url: string, fieldName: string = "URL"): ValidationResult => {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  try {
    new URL(trimmedUrl);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: `Please enter a valid ${fieldName}`,
    };
  }
};

/**
 * Validates numeric input
 */
export const validateNumber = (
  value: string | number,
  options: {
    fieldName?: string;
    min?: number;
    max?: number;
    allowDecimals?: boolean;
    required?: boolean;
  } = {},
): ValidationResult => {
  const {
    fieldName = "Value",
    min = -Infinity,
    max = Infinity,
    allowDecimals = true,
    required = false,
  } = options;

  const stringValue = String(value).trim();

  if (!stringValue) {
    if (required) {
      return {
        isValid: false,
        error: `${fieldName} is required`,
      };
    }
    return { isValid: true };
  }

  const numValue = Number(stringValue);

  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (!allowDecimals && !Number.isInteger(numValue)) {
    return {
      isValid: false,
      error: `${fieldName} must be a whole number`,
    };
  }

  if (numValue < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`,
    };
  }

  if (numValue > max) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${max}`,
    };
  }

  return { isValid: true };
};

/**
 * Validates required field
 */
export const validateRequired = (value: any, fieldName: string = "Field"): ValidationResult => {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  return { isValid: true };
};
