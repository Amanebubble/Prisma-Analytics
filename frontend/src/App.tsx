import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PanelClientes from './pages/PanelClientes';
import ClienteDashboard from './pages/ClienteDashboard';
import CargaDatos from './pages/CargaDatos';
import Auditoria from './pages/Auditoria';
import Analisis from './pages/Analisis';
import Planificacion from './pages/Planificacion';
import Historial from './pages/Historial';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Clients from './pages/Clients'; // Mantendremos este por si acaso en el submenú
import ToolkitDrawer from './components/ToolkitDrawer';

function App() {
  const [isToolkitOpen, setIsToolkitOpen] = useState(false);

  return (
    <Router>
      <div className="app-container">
        <Sidebar onOpenToolkit={() => setIsToolkitOpen(true)} />
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
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/clients" element={<Clients />} />
            </Routes>
          </main>
        </div>

        {/* Panel lateral deslizable */}
        <ToolkitDrawer isOpen={isToolkitOpen} onClose={() => setIsToolkitOpen(false)} />

      </div>
    </Router>
  );
}

export default App;
