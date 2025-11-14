// Secret configuration file for fallback URLs and sensitive data
// This file should be added to .gitignore to keep secrets secure

export const SECRETS = {
  // Fallback backend URL when environment variable is not available
  FALLBACK_BACKEND_URL: "https://test-hv-backend-app-a7d2dcgpczcuhud2.uksouth-01.azurewebsites.net",
};

export default SECRETS;