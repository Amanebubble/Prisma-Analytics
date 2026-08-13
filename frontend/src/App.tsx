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

function App() {
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
      </div>
    </Router>
  );
}

export default App;
