import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import CargaDatos from './pages/CargaDatos';
import Auditoria from './pages/Auditoria';
import Analisis from './pages/Analisis';
import Planificacion from './pages/Planificacion';
import Reportes from './pages/Reportes';
import Clients from './pages/Clients'; // Mantendremos este por si acaso en el submenú
import ToolkitDrawer from './components/ToolkitDrawer';

function App() {
  const [isToolkitOpen, setIsToolkitOpen] = useState(false);

  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Header />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/carga-datos" element={<CargaDatos />} />
              <Route path="/auditoria" element={<Auditoria />} />
              <Route path="/analisis" element={<Analisis />} />
              <Route path="/planificacion" element={<Planificacion />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/clients" element={<Clients />} />
            </Routes>
          </main>
        </div>

        {/* Botón flotante para la Caja de Herramientas */}
        <button 
          className="floating-toolkit-btn"
          onClick={() => setIsToolkitOpen(true)}
          title="Abrir Caja de Herramientas"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#0ea5e9',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            zIndex: 900,
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🧰
        </button>

        {/* Panel lateral deslizable */}
        <ToolkitDrawer isOpen={isToolkitOpen} onClose={() => setIsToolkitOpen(false)} />

      </div>
    </Router>
  );
}

export default App;
