import { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PanelClientes from './pages/PanelClientes';
import ClienteDashboard from './pages/ClienteDashboard';
import CargaDatos from './pages/CargaDatos';
import Auditoria from './pages/Auditoria';
import Analisis from './pages/Analisis';
import Planificacion from './pages/Planificacion';
import Historial from './pages/Historial';
import Dictamen from './pages/Dictamen';
import DictamenEditor from './pages/DictamenEditor';
import CrearDatos from './pages/CrearDatos';
import Configuracion from './pages/Configuracion';
import Clients from './pages/Clients'; // Mantendremos este por si acaso en el submenú
import ToolkitDrawer from './components/ToolkitDrawer';
import { ClientProvider } from './context/ClientContext';
import AuthGate from './components/AuthGate';

function App() {
  const [isToolkitOpen, setIsToolkitOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Ventanas independientes: se renderizan sin el layout principal.
  if (window.location.hash.startsWith('#dictamen')) {
    return <DictamenEditor />;
  }
  if (window.location.hash.startsWith('#data-entry')) {
    return <CrearDatos />;
  }

  return (
    <AuthGate>
    <ClientProvider>
      <Router>
        <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Sidebar 
            onOpenToolkit={() => setIsToolkitOpen(true)} 
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          <div className="main-content">
            <Header />
            <main className="page-content">
              <Routes>
                <Route path="/" element={<PanelClientes />} />
                <Route path="/cliente" element={<ClienteDashboard />} />
                <Route path="/carga-datos" element={<CargaDatos />} />
                <Route path="/auditoria" element={<Auditoria />} />
                <Route path="/analisis" element={<Analisis />} />
                <Route path="/planificacion" element={<Planificacion />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/dictamen" element={<Dictamen />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/clients" element={<Clients />} />
              </Routes>
            </main>
          </div>

          {/* Panel lateral deslizable */}
          <ToolkitDrawer isOpen={isToolkitOpen} onClose={() => setIsToolkitOpen(false)} />

        </div>
      </Router>
    </ClientProvider>
    </AuthGate>
  );
}

export default App;
