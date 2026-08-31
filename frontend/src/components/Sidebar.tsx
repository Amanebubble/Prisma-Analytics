import { Link, useLocation } from 'react-router-dom';
import { Home, Database, ClipboardCheck, LineChart, Calendar, Briefcase, Settings, User, Activity, History, Power, ChevronLeft, ChevronRight, FileCheck2, PenSquare } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Panel de Clientes', icon: Home },
  { path: '/cliente', label: 'Resumen del Cliente', icon: Activity },
  { path: '/carga-datos', label: 'Carga de Datos', icon: Database },
  { path: '/auditoria', label: 'Auditoría Pre-Hacienda', icon: ClipboardCheck },
  { path: '/dictamen', label: 'Emisión de Dictamen', icon: FileCheck2 },
  { path: '/analisis', label: 'Análisis Financiero (Ratios)', icon: LineChart },
  { path: '/planificacion', label: 'Planificación Mensual', icon: Calendar },
  { path: '/historial', label: 'Historial de Auditoría', icon: History },
];

export default function Sidebar({ onOpenToolkit, isCollapsed, onToggleCollapse }: { onOpenToolkit?: () => void, isCollapsed?: boolean, onToggleCollapse?: () => void }) {
  const location = useLocation();
  const { activeClient } = useClient();

  const openDataEntry = () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.invoke('open-data-entry-window', { clientId: activeClient?.id || 0 });
    } catch (e) {
      // Navegador: no hay ventana aparte; no hacer nada.
    }
  };

  return (
    <aside className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '0' : '0 1.5rem' }}>
        <div className="logo-container">
          {/* Logo will go here, currently using an icon placeholder */}
          <div className="logo-icon"></div>
          {!isCollapsed && <h2>PRISMA<br/><span>Analytics</span></h2>}
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
                <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`} title={isCollapsed ? item.label : undefined}>
                  <Icon size={20} className="nav-icon" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
          
          {/* Creación de Datos: abre ventana independiente */}
          <li>
            <button className="nav-link" onClick={openDataEntry} style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} title={isCollapsed ? "Creación de Datos" : undefined}>
              <PenSquare size={20} className="nav-icon" />
              {!isCollapsed && <span>Creación de Datos</span>}
            </button>
          </li>

          {/* Action button in nav */}
          <li>
            <button className="nav-link" onClick={onOpenToolkit} style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} title={isCollapsed ? "Caja de Herramientas" : undefined}>
              <Briefcase size={20} className="nav-icon" />
              {!isCollapsed && <span>Caja de Herramientas</span>}
            </button>
          </li>
        </ul>
      </nav>
      
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '50%' }}>
            <User size={20} color="var(--accent-primary)" />
          </div>
          {!isCollapsed && (
            <div className="user-details" style={{ margin: 0 }}>
              <span className="user-role">Administrador</span>
              <span className="user-name">Juan</span>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/configuracion" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Configuración">
              <Settings size={18} />
            </Link>
            <button 
              onClick={() => {
                if (window.confirm('¿Estás seguro que deseas cerrar Prisma Analytics?')) {
                  try {
                    const { ipcRenderer } = (window as any).require('electron');
                    ipcRenderer.invoke('quit-app');
                  } catch (e) {
                    console.error('Electron IPC not available', e);
                    window.close();
                  }
                }
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
              title="Cerrar Sistema"
            >
              <Power size={18} />
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={onToggleCollapse} 
        style={{
          position: 'absolute',
          top: '20px',
          right: isCollapsed ? '-14px' : '-14px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          zIndex: 10
        }}
        title={isCollapsed ? "Expandir Menú" : "Colapsar Menú"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
