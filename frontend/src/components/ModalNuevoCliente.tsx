import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useClient, type NewClientInput } from '../context/ClientContext';
import './ModalNuevoCliente.css';

interface ModalNuevoClienteProps {
  isOpen: boolean;
  onClose: () => void;
}

const GIROS_COMERCIALES = [
  'Comercio al por mayor',
  'Comercio al por menor',
  'Servicios Profesionales',
  'Servicios de Tecnología / Software',
  'Industria Manufacturera',
  'Construcción e Inmobiliaria',
  'Agricultura y Ganadería',
  'Transporte y Logística',
  'Salud y Asistencia Social',
  'Educación',
  'Hostelería y Turismo',
  'Servicios Financieros y Seguros',
  'Energía y Servicios Públicos',
  'Telecomunicaciones',
  'Minería y Extracción',
  'Pesca y Acuicultura',
  'Alimentos y Bebidas',
  'Manufactura y Maquila',
  'Servicios Inmobiliarios',
  'Medios, Publicidad y Entretenimiento',
  'Organizaciones sin Fines de Lucro',
  'Importación y Exportación',
  'Otro'
];

export default function ModalNuevoCliente({ isOpen, onClose }: ModalNuevoClienteProps) {
  const { addClient } = useClient();
  
  const [formData, setFormData] = useState({
    alias: '',
    razonSocial: '',
    giro: GIROS_COMERCIALES[0]
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newClient: NewClientInput = {
      name: formData.alias || formData.razonSocial, // Usar alias como nombre principal si existe
      alias: formData.alias,
      razonSocial: formData.razonSocial,
      giro: formData.giro,
    };

    addClient(newClient);
    
    // Resetear form y cerrar
      setFormData({
        alias: '',
        razonSocial: '',
        giro: GIROS_COMERCIALES[0]
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade-in">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} color="var(--accent-primary)" />
            <h2>Crear Nuevo Cliente</h2>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="alias">Alias (Nombre Corto)</label>
            <input 
              type="text" 
              id="alias" 
              name="alias" 
              placeholder="Ej. Prisma Analytics" 
              value={formData.alias}
              onChange={handleChange}
              required
            />
            <small>Así aparecerá en el menú y encabezados.</small>
          </div>

          <div className="form-group">
            <label htmlFor="razonSocial">Razón Social</label>
            <input 
              type="text" 
              id="razonSocial" 
              name="razonSocial" 
              placeholder="Ej. Prisma Soluciones, S.A. de C.V." 
              value={formData.razonSocial}
              onChange={handleChange}
              required
            />
            <small>Nombre legal según escritura de constitución.</small>
          </div>

          <div className="form-group">
            <label htmlFor="giro">Actividad Económica (Giro)</label>
            <select 
              id="giro" 
              name="giro" 
              value={formData.giro}
              onChange={handleChange}
              required
            >
              {GIROS_COMERCIALES.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Crear e Iniciar Trabajo</button>
          </div>
        </form>
      </div>
    </div>
  );
}
