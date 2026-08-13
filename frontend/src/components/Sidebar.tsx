import { Link, useLocation } from 'react-router-dom';
import { Home, Database, ClipboardCheck, LineChart, Calendar, FileText } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Principal', icon: Home },
  { path: '/carga-datos', label: 'Carga de Datos', icon: Database },
  { path: '/auditoria', label: 'Auditoría Pre-Hacienda', icon: ClipboardCheck },
  { path: '/analisis', label: 'Análisis Financiero (Ratios)', icon: LineChart },
  { path: '/planificacion', label: 'Planificación Mensual', icon: Calendar },
  { path: '/reportes', label: 'Reportes Ejecutivos', icon: FileText },
];

export default function Sidebar() {
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
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-details">
          <span className="user-role">Empresa Actual</span>
          <span className="user-name">Lácteos El Salvador S.A.</span>
        </div>
        <div className="user-details" style={{ marginTop: '0.5rem' }}>
          <span className="user-role">Periodo: <strong style={{ color: 'var(--text-primary)'}}>Julio 2026</strong></span>
        </div>
      </div>
    </aside>
  );
}
