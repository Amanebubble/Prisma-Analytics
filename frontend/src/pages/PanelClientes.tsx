import { useState } from 'react';
import { Building2, Plus, Activity, CheckCircle, Clock, Power, PowerOff, Database } from 'lucide-react';
import { useClient, type Client } from '../context/ClientContext';
import ModalNuevoCliente from '../components/ModalNuevoCliente';
import './PanelClientes.css';

export default function PanelClientes() {
  const { clients, activeClient, setActiveClient } = useClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const toggleClient = (client: Client) => {
    if (activeClient?.id === client.id) {
      setActiveClient(null); // Desactivar si ya está activo
    } else {
      setActiveClient(client); // Activar nuevo cliente
    }
  };

  return (
    <div className="panel-clientes animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Panel de Clientes</h1>
          <p>Gestiona el estado y la salud financiera de tu cartera.</p>
        </div>
        <button className="btn-primary flex-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          Agregar Nuevo Cliente
        </button>
      </div>

      <div className="clients-table-container glass">
        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
            <h2>No hay clientes registrados</h2>
            <p style={{ marginBottom: '1.5rem' }}>Parece que tu base de datos está en blanco. Crea tu primer cliente para comenzar a trabajar.</p>
            <button className="btn-primary flex-btn" style={{ margin: '0 auto' }} onClick={() => setIsModalOpen(true)}>
              <Plus size={20} /> Crear Primer Cliente
            </button>
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Prisma Score (Salud)</th>
                <th className="text-right">Ingresos</th>
                <th className="text-right">Egresos</th>
                <th className="text-right">Margen Neto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => {
                const isActive = activeClient?.id === client.id;
                
                return (
                  <tr key={client.id} style={{ background: isActive ? 'rgba(14, 165, 233, 0.05)' : 'transparent', borderLeft: isActive ? '4px solid var(--accent-primary)' : '4px solid transparent' }}>
                    <td>
                      <div className="client-name-cell">
                        <div className="client-icon" style={{ background: isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isActive ? 'white' : 'var(--accent-primary)' }}>
                          <Building2 size={18} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="font-bold">{client.name}</span>
                          {client.nit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIT: {client.nit}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="health-score-cell">
                        <Activity size={16} color={client.score >= 80 ? 'var(--success)' : client.score >= 60 ? 'var(--warning)' : client.score === 0 ? 'var(--text-muted)' : 'var(--danger)'} />
                        <span style={{ fontWeight: 600, color: client.score >= 80 ? 'var(--success)' : client.score >= 60 ? 'var(--warning)' : client.score === 0 ? 'var(--text-muted)' : 'var(--danger)' }}>
                          {client.score > 0 ? `${client.score}/100` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="text-right">{formatCurrency(client.income)}</td>
                    <td className="text-right">{formatCurrency(client.expenses)}</td>
                    <td className="text-right">
                      <span className={`profit-badge ${client.margin > 0 ? 'positive' : client.margin === 0 ? 'neutral' : 'negative'}`} style={{ background: client.margin === 0 ? 'var(--bg-secondary)' : undefined, color: client.margin === 0 ? 'var(--text-secondary)' : undefined }}>
                        {client.margin > 0 ? '+' : ''}{client.margin}%
                      </span>
                    </td>
                    <td>
                      <div className={`status-badge ${client.status.toLowerCase().replace(' ', '-')}`}>
                        {client.status === 'Auditado' && <CheckCircle size={14} />}
                        {client.status === 'En Revisión' && <Clock size={14} />}
                        {(client.status === 'Pendiente' || client.status === 'Recién Creado') && <Clock size={14} />}
                        <span>{client.status}</span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className={`btn-small ${isActive ? 'btn-danger' : 'btn-primary'}`} 
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.8rem', background: isActive ? 'var(--danger)' : 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={() => toggleClient(client)}
                      >
                        {isActive ? <><PowerOff size={14} /> Desactivar</> : <><Power size={14} /> Activar</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ModalNuevoCliente isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
