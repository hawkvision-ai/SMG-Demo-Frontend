import { useState } from "react";
import { sanitizeFilename } from "@/lib/utils";

export function useUploadCameraVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeXhr, setActiveXhr] = useState<XMLHttpRequest | null>(null);

  async function execute(
    file: File,
    uploadUrl: string,
    onProgress?: (pct: number) => void
  ) {
    setLoading(true);
    setError(null);
    try {
      const safeFileName = sanitizeFilename(file.name);
      const sanitizedFile = new File([file], safeFileName, {
        type: file.type,
        lastModified: file.lastModified,
      });

      const xhr = new XMLHttpRequest();
      setActiveXhr(xhr);
      
      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) resolve();
          else reject(new Error(`Upload failed (status ${xhr.status})`));
        };
        xhr.onerror = () =>
          reject(new Error("Upload failed due to network error"));
        xhr.send(sanitizedFile);
      });
      
      return xhr; // Return the XHR object for cancellation purposes
    } catch (err: any) {
      setError(err.message || "Unknown error");
      throw err;
    } finally {
      setLoading(false);
      setActiveXhr(null);
    }
  }

  function cancel() {
    console.log("Entering cancel func");
    
    if (activeXhr) {
      activeXhr.abort();
      setActiveXhr(null);
      setLoading(false);
    }
  }

  return { execute, loading, error, cancel, activeXhr };
}