import { Link, useLocation } from 'react-router-dom';
import { Home, Database, ClipboardCheck, LineChart, Calendar, FileText, Briefcase, Settings, User, Activity, History } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Panel de Clientes', icon: Home },
  { path: '/cliente', label: 'Resumen del Cliente', icon: Activity },
  { path: '/carga-datos', label: 'Carga de Datos', icon: Database },
  { path: '/auditoria', label: 'Auditoría Pre-Hacienda', icon: ClipboardCheck },
  { path: '/analisis', label: 'Análisis Financiero (Ratios)', icon: LineChart },
  { path: '/planificacion', label: 'Planificación Mensual', icon: Calendar },
  { path: '/historial', label: 'Historial de Auditoría', icon: History },
  { path: '/reportes', label: 'Reportes Ejecutivos', icon: FileText },
];

export default function Sidebar({ onOpenToolkit }: { onOpenToolkit?: () => void }) {
  const location = useLocation();

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <div className="logo-container">
          {/* Logo will go here, currently using an icon placeholder */}
          <div className="logo-icon"></div>
          <h2>PRISMA<br/><span>Analytics</span></h2>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={20} className="nav-icon" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          
          {/* Action button in nav */}
          <li>
            <button className="nav-link" onClick={onOpenToolkit} style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <Briefcase size={20} className="nav-icon" />
              <span>Caja de Herramientas</span>
            </button>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '50%' }}>
            <User size={20} color="var(--accent-primary)" />
          </div>
          <div className="user-details" style={{ margin: 0 }}>
            <span className="user-role">Administrador</span>
            <span className="user-name">Juan</span>
          </div>
        </div>
        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
}
