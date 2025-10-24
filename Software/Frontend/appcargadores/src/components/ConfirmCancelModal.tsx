import React, { useState } from 'react';

interface ConfirmCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: 'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro') => void;
  title?: string;
}

const ConfirmCancelModal: React.FC<ConfirmCancelModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro de cancelar?'
}) => {
  const [cancelReason, setCancelReason] = useState<'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro'>('indisponibilidad');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(cancelReason);
    setCancelReason('indisponibilidad'); // Reset to default
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {title}
        </h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Motivo de cancelación:
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value as any)}
          >
            <option value="indisponibilidad">Indisponibilidad</option>
            <option value="mantenimiento">En mantenimiento</option>
            <option value="falta_tiempo">Falta de tiempo</option>
            <option value="otro">Otro motivo</option>
          </select>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            onClick={onClose}
          >
            Volver
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            onClick={handleConfirm}
          >
            Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCancelModal;
