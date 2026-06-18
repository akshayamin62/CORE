"use client";

import { useEffect } from "react";
import {
  ProtectedActivityDocumentViewer,
} from "@/components/ProtectedActivityDocumentViewer";

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  onClose: () => void;
}

export default function DocumentViewer({
  documentUrl,
  documentName,
  onClose,
}: DocumentViewerProps) {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" ||
          e.key === "s" ||
          e.key === "p" ||
          e.key === "a" ||
          e.key === "x")
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="app-modal-panel relative w-full h-full max-w-6xl max-h-screen bg-white m-4 rounded-lg overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {documentName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div
          className="flex-1 overflow-hidden"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          <ProtectedActivityDocumentViewer url={documentUrl} minHeight="100%" />
        </div>

        <div className="p-3 bg-yellow-50 border-t border-yellow-200">
          <p className="text-sm text-yellow-800 text-center">
            This document is view-only. Copying, downloading, and printing are disabled.
          </p>
        </div>
      </div>
    </div>
  );
}
