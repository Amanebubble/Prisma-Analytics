import { Plus, MoreVertical, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import './Clients.css';

// Usamos any para simplificar, en producción definiríamos una interfaz TypeScript
export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        // Checamos si estamos corriendo dentro de Electron
        // @ts-ignore
        if (window.require) {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          const dbClients = await ipcRenderer.invoke('get-clients');
          setClients(dbClients);
        } else {
          // Si estamos en el navegador normal, usamos datos falsos
          setClients([
            { id: 1, name: 'Empresa XYZ S.A. de C.V. (Web)', nit: '0614-010190-101-1', nrc: '123456-7', sector: 'Tecnología', status: 'active' },
          ]);
        }
      } catch (error) {
        console.error("Error fetching clients", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadClients();
  }, []);
  return (
    <div className="clients-page animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Gestión de Clientes</h1>
          <p>Administra las empresas y entidades para auditoría o análisis.</p>
        </div>
        <button className="btn-primary flex-btn">
          <Plus size={20} />
          Nuevo Cliente
        </button>
      </div>

      <div className="clients-table-container glass">
        <table className="clients-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>NIT</th>
              <th>NRC</th>
              <th>Sector</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{textAlign: 'center'}}>Cargando clientes...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign: 'center'}}>No hay clientes registrados.</td></tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id}>
                <td className="company-cell">
                  <div className="company-icon">
                    <Building2 size={16} />
                  </div>
                  <span className="company-name">{client.name}</span>
                </td>
                <td>{client.nit}</td>
                <td>{client.nrc}</td>
                <td>{client.sector}</td>
                <td>
                  <span className={`status-badge ${client.status}`}>
                    {client.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button className="icon-btn">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
