import { Search, Bell, Building, Calendar } from 'lucide-react';
import './Header.css';

export default function Header() {
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
      
      <div className="header-actions">
        {/* Selector de Cliente Global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <Building size={16} color="#0ea5e9" />
          <select 
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            defaultValue="1"
          >
            <option value="1">Lácteos El Salvador S.A.</option>
            <option value="2">Distribuidora Bengala</option>
            <option value="3">TechSolutions de C.V.</option>
          </select>
        </div>

        {/* Selector de Periodo Global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginRight: '1rem' }}>
          <Calendar size={16} color="#0ea5e9" />
          <select 
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            defaultValue="2026-07"
          >
            <option value="2026-07">Julio 2026</option>
            <option value="2026-06">Junio 2026</option>
            <option value="2026-05">Mayo 2026</option>
          </select>
        </div>

        <button className="action-btn">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
      </div>
    </header>
  );
}
