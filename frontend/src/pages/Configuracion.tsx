import { useState, useEffect } from 'react';
import { User, Key, Brain, Save, Settings as SettingsIcon, CheckCircle, Database } from 'lucide-react';
import './Configuracion.css';

type Tab = 'profile' | 'integrations' | 'system';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<Tab>('integrations');
  const [llamaParseKey, setLlamaParseKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Cargar keys guardadas al iniciar
  useEffect(() => {
    const savedLlama = localStorage.getItem('llamaParseKey');
    const savedGemini = localStorage.getItem('geminiKey');
    if (savedLlama) setLlamaParseKey(savedLlama);
    if (savedGemini) setGeminiKey(savedGemini);
  }, []);

  const handleSaveKeys = () => {
    localStorage.setItem('llamaParseKey', llamaParseKey);
    localStorage.setItem('geminiKey', geminiKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="configuracion-container fade-in">
      <div className="configuracion-header">
        <h1 className="configuracion-title">Configuración del Administrador</h1>
        <p className="configuracion-subtitle">Gestiona tu perfil, integraciones y preferencias del sistema.</p>
      </div>

      <div className="config-layout">
        
        {/* Sidebar Nav */}
        <div className="config-sidebar glass">
          <button 
            className={`config-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> Perfil
          </button>
          <button 
            className={`config-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <Brain size={18} /> Integraciones e IA
          </button>
          <button 
            className={`config-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <SettingsIcon size={18} /> Sistema
          </button>
        </div>

        {/* Content Area */}
        <div className="config-content glass animate-fade-in">
          
          {activeTab === 'profile' && (
            <div className="config-section">
              <h2>Perfil de Usuario</h2>
              <p className="section-desc">Información básica del administrador de la cuenta.</p>
              
              <div className="form-group">
                <label>Nombre Completo</label>
                <input type="text" className="config-input" defaultValue="Juan Administrador" readOnly />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input type="email" className="config-input" defaultValue="juan@prisma-analytics.com" readOnly />
              </div>
              <div className="form-group">
                <label>Rol en el Sistema</label>
                <input type="text" className="config-input" defaultValue="Socio Director / Administrador" readOnly />
              </div>
              <p className="form-note">* La autenticación y cambio de credenciales estará disponible en futuras actualizaciones.</p>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="config-section">
              <h2>Integraciones de Inteligencia Artificial</h2>
              <p className="section-desc">Conecta los motores de IA para potenciar la extracción de datos y el análisis automático.</p>
              
              <div className="api-card">
                <div className="api-card-header">
                  <Database size={24} color="var(--accent-primary)" />
                  <div>
                    <h3>LlamaParse API</h3>
                    <p>Motor de Ingesta: Extrae datos estructurados de estados de cuenta en PDF y facturas.</p>
                  </div>
                </div>
                <div className="form-group">
                  <label>API Key de LlamaParse</label>
                  <div className="input-with-icon">
                    <Key size={16} className="input-icon" />
                    <input 
                      type="password" 
                      className="config-input" 
                      placeholder="llx-..." 
                      value={llamaParseKey}
                      onChange={(e) => setLlamaParseKey(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="api-card">
                <div className="api-card-header">
                  <Brain size={24} color="var(--accent-primary)" />
                  <div>
                    <h3>Google Gemini AI</h3>
                    <p>Motor de Análisis: Redacta reportes ejecutivos e identifica anomalías financieras en lenguaje natural.</p>
                  </div>
                </div>
                <div className="form-group">
                  <label>API Key de Google Gemini</label>
                  <div className="input-with-icon">
                    <Key size={16} className="input-icon" />
                    <input 
                      type="password" 
                      className="config-input" 
                      placeholder="AIzaSy..." 
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="config-actions">
                <button className="btn-save" onClick={handleSaveKeys}>
                  {isSaved ? <><CheckCircle size={18} /> Guardado</> : <><Save size={18} /> Guardar Credenciales</>}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="config-section">
              <h2>Sincronización y Sistema</h2>
              <p className="section-desc">Preferencias globales de la aplicación.</p>
              
              <div className="feature-placeholder">
                <h3>Google Calendar Sync</h3>
                <p>La sincronización bidireccional de tareas con Google Calendar estará disponible una vez que se implemente el sistema de inicio de sesión con Google (OAuth).</p>
                <button className="btn-disabled" disabled>Conectar Google Workspace</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
