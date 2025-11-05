import React, { useState } from 'react';

interface ConfirmCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: 'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro') => void;
  title?: string;
}

// Modal de confirmación para cancelación de reservas con selección de motivo
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
  <div className="modal" onClick={onClose}>
      <div
  className="modal__panel max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg item-title mb-4">
          {title}
        </h3>
        
        <div className="mb-6">
          <label className="form-label label-loose">
            Motivo de cancelación:
          </label>
          <select
            className="select"
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
            className="btn btn-secondary"
            onClick={onClose}
          >
            Volver
          </button>
          <button
            className="btn btn-danger"
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
