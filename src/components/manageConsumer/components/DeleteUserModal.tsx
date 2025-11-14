import React from 'react';
import { X } from 'lucide-react';
import { DeleteUserModalProps } from '@/api/types';

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  userType,
  isDeleting = false
}) => {
  if (!isOpen) return null;

  const userTypeCapitalized = userType.charAt(0).toUpperCase() + userType.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-2">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" style={{ minHeight: '60px' }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
        Delete {userTypeCapitalized}
        </h1>
        <button
        onClick={onClose}
        className="text-gray-400 transition-colors hover:text-gray-600"
        disabled={isDeleting}
        >
        <X className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="mb-6">
        <p className="mb-4 text-base text-gray-700">
        Deleting this {userType} will unassign all sites. Proceed?
        </p>
        <div className="rounded-lg bg-gray-50 p-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Note:</span> You can transfer sites to another {userType} instead.
        </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
        onClick={onClose}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
        disabled={isDeleting}
        >
        Cancel
        </button>
        <button
        onClick={onDelete}
        className="flex-1 rounded-lg bg-[#FFE1E1B2] px-4 py-2 text-base font-medium text-[#E75451]"
        disabled={isDeleting}
        >
        {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;