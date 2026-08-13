import { Building2, Plus, Activity, CheckCircle, Clock } from 'lucide-react';
import './PanelClientes.css';

const mockClients = [
  {
    id: 1,
    name: 'Lácteos El Salvador S.A.',
    healthScore: 88,
    income: 350400,
    expenses: 325000,
    profitMargin: 7.2,
    status: 'Auditado',
  },
  {
    id: 2,
    name: 'Distribuidora Bengala',
    healthScore: 65,
    income: 120500,
    expenses: 115000,
    profitMargin: 4.5,
    status: 'En Revisión',
  },
  {
    id: 3,
    name: 'TechSolutions de C.V.',
    healthScore: 92,
    income: 580000,
    expenses: 410000,
    profitMargin: 29.3,
    status: 'Auditado',
  },
  {
    id: 4,
    name: 'Constructora del Norte',
    healthScore: 45,
    income: 85000,
    expenses: 92000,
    profitMargin: -8.2,
    status: 'Pendiente',
  }
];

export default function PanelClientes() {
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="panel-clientes animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Panel de Clientes</h1>
          <p>Gestiona el estado y la salud financiera de tu cartera.</p>
        </div>
        <button className="btn-primary flex-btn">
          <Plus size={20} />
          Agregar Nuevo Cliente
        </button>
      </div>

      <div className="clients-table-container glass">
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
            {mockClients.map(client => (
              <tr key={client.id}>
                <td>
                  <div className="client-name-cell">
                    <div className="client-icon">
                      <Building2 size={18} />
                    </div>
                    <span className="font-bold">{client.name}</span>
                  </div>
                </td>
                <td>
                  <div className="health-score-cell">
                    <Activity size={16} color={client.healthScore >= 80 ? 'var(--success)' : client.healthScore >= 60 ? 'var(--warning)' : 'var(--danger)'} />
                    <span style={{ fontWeight: 600, color: client.healthScore >= 80 ? 'var(--success)' : client.healthScore >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                      {client.healthScore}/100
                    </span>
                  </div>
                </td>
                <td className="text-right">{formatCurrency(client.income)}</td>
                <td className="text-right">{formatCurrency(client.expenses)}</td>
                <td className="text-right">
                  <span className={`profit-badge ${client.profitMargin > 0 ? 'positive' : 'negative'}`}>
                    {client.profitMargin > 0 ? '+' : ''}{client.profitMargin}%
                  </span>
                </td>
                <td>
                  <div className={`status-badge ${client.status.toLowerCase().replace(' ', '-')}`}>
                    {client.status === 'Auditado' && <CheckCircle size={14} />}
                    {client.status === 'En Revisión' && <Clock size={14} />}
                    {client.status === 'Pendiente' && <Clock size={14} />}
                    <span>{client.status}</span>
                  </div>
                </td>
                <td>
                  <button className="btn-secondary btn-small">Ver Dashboard</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
