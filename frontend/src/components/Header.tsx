import { Search, Building } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import './Header.css';

export default function Header() {
  const { activeClient } = useClient();

  return (
    <header className="app-header glass">
      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar clientes, reportes, documentos..." 
          className="search-input"
        />
      </div>
      
      {/* Indicador Centrado del Cliente Activo */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem', 
          background: activeClient ? 'rgba(14, 165, 233, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
          padding: '0.5rem 1.5rem', 
          borderRadius: '20px', 
          border: `1px solid ${activeClient ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          transition: 'all 0.3s'
        }}>
          <Building size={16} color={activeClient ? "var(--accent-primary)" : "var(--text-muted)"} />
          <span style={{ 
            fontSize: '0.95rem', 
            fontWeight: 600, 
            color: activeClient ? 'var(--accent-primary)' : 'var(--text-muted)' 
          }}>
            {activeClient ? `Cliente Activo: ${activeClient.name}` : 'Ningún cliente activo'}
          </span>
        </div>
      </div>

      <div className="header-actions">
        {/* Acciones del encabezado pueden ir aquí en el futuro */}
      </div>
    </header>
  );
}
