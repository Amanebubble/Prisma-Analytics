import { Search, Bell } from 'lucide-react';
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
        <button className="action-btn">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
      </div>
    </header>
  );
}
