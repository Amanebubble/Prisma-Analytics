import { Activity, TrendingUp, Users, AlertCircle } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const stats = [
    { title: 'Clientes Activos', value: '24', icon: Users, color: 'var(--accent-primary)' },
    { title: 'Reportes Generados', value: '156', icon: FileText, color: 'var(--success)' },
    { title: 'Alertas Fiscales', value: '3', icon: AlertCircle, color: 'var(--warning)' },
    { title: 'Salud Promedio', value: '87%', icon: Activity, color: 'var(--accent-primary)' },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header">
        <h1>Dashboard General</h1>
        <p>Resumen de actividad y métricas clave de tus clientes.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card glass">
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-title">{stat.title}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-content">
        <div className="main-panel glass">
          <div className="panel-header">
            <h3>Análisis Financiero Reciente</h3>
            <button className="btn-secondary">Ver Todos</button>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <TrendingUp size={48} className="empty-icon" />
              <p>Selecciona un cliente para comenzar el análisis financiero y valuación.</p>
              <button className="btn-primary mt-4">Analizar Nuevo Cliente</button>
            </div>
          </div>
        </div>

        <div className="side-panel glass">
          <div className="panel-header">
            <h3>Actividad Reciente</h3>
          </div>
          <div className="panel-body">
            <ul className="activity-list">
              <li className="activity-item">
                <div className="activity-dot new"></div>
                <div className="activity-text">
                  <p><strong>Empresa XYZ S.A.</strong> subió Estado de Resultados 2023</p>
                  <span>Hace 2 horas</span>
                </div>
              </li>
              <li className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-text">
                  <p>Reporte de Valuación generado para <strong>Distribuidora El Salvador</strong></p>
                  <span>Ayer, 15:30</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileText({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
