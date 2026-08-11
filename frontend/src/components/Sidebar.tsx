import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, PieChart } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clients', label: 'Clientes', icon: Users },
  { path: '/reports', label: 'Reportes Fiscales', icon: FileText },
  { path: '/valuation', label: 'Valuación', icon: PieChart },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon"></div>
          <h2>Prisma<span>Analytics</span></h2>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
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
        <div className="user-info">
          <div className="avatar">A</div>
          <div className="user-details">
            <span className="user-name">Auditor Principal</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
