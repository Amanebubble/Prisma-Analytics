import { useState, useEffect } from 'react';
import { User, Key, Brain, Save, Settings as SettingsIcon, CheckCircle, Database, Shield, Eye, EyeOff, CalendarPlus, FileUp } from 'lucide-react';
import { getSessionPassword } from '../utils/authSession';
import './Configuracion.css';

type Tab = 'profile' | 'integrations' | 'security' | 'system';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState<Tab>('integrations');
  const [llamaParseKey, setLlamaParseKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Cargar claves cifradas con la contraseña de sesión.
  useEffect(() => {
    const password = getSessionPassword();
    if (password) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('get-ai-keys', password).then((res: any) => {
          if (res?.geminiKey) setGeminiKey(res.geminiKey);
          if (res?.llamaParseKey) setLlamaParseKey(res.llamaParseKey);
          if (res?.googleClientSecret) setGoogleConnected(true);
        });
      } catch (error) {
        console.warn('No fue posible cargar las claves', error);
      }
    }
  }, []);

  const handleSaveKeys = () => {
    const password = getSessionPassword();
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.invoke('save-ai-keys', { llamaParseKey, geminiKey, password });
    } catch (error) {
      console.warn('No fue posible sincronizar las claves con el backend', error);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleUploadGoogle = async (file: File) => {
    const password = getSessionPassword();
    if (!password) return;
    try {
      const text = await file.text();
      JSON.parse(text); // valida que sea JSON válido
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('save-ai-keys', { googleClientSecret: text, password });
      setGoogleConnected(true);
      alert('Credenciales de Google guardadas. Puedes conectar Google Calendar.');
    } catch (error: any) {
      alert('El archivo no es un client_secret.json válido: ' + error.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) { setPassMsg({ ok: false, text: 'La nueva contraseña debe tener al menos 4 caracteres.' }); return; }
    if (newPassword !== confirmPassword) { setPassMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden.' }); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('auth-change-password', { currentPassword, newPassword });
      if (res?.success) {
        setPassMsg({ ok: true, text: 'Contraseña actualizada correctamente.' });
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setPassMsg({ ok: false, text: res?.error || 'No fue posible cambiar la contraseña.' });
      }
    } catch (error: any) {
      setPassMsg({ ok: false, text: error?.message || 'Error al cambiar la contraseña.' });
    }
  };

  const handleExportBackup = async () => {
    const password = getSessionPassword();
    if (!password) { alert('No hay sesión activa.'); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('create-backup', { password });
      if (res?.success) alert('Copia de seguridad guardada en: ' + res.path);
      else if (!res?.canceled) alert(res?.error || 'No fue posible crear la copia.');
    } catch (error: any) {
      alert('Error al exportar: ' + error.message);
    }
  };

  const handleImportBackup = async () => {
    const password = getSessionPassword();
    if (!password) { alert('No hay sesión activa.'); return; }
    if (!window.confirm('Al importar se reemplazará tu información actual por la del archivo. La aplicación se reiniciará. ¿Continuar?')) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('import-backup', { password });
      if (res?.success) alert('Copia restaurada. La aplicación se reiniciará...');
      else if (!res?.canceled) alert(res?.error || 'No fue posible restaurar la copia.');
    } catch (error: any) {
      alert('Error al importar: ' + error.message);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('¿Seguro que deseas borrar todos los documentos y datos de auditoría cargados? Esta acción no afecta clientes ni el catálogo NIIF.')) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('reset-dev-data');
      if (result?.success) {
        alert(`Datos de prueba borrados. Se eliminaron ${result.cleared.length} tipos de registros.`);
        window.location.reload();
      }
    } catch (error: any) {
      alert('No fue posible borrar los datos: ' + error.message);
    }
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
            className={`config-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} /> Seguridad
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

              <div className="api-card">
                <div className="api-card-header">
                  <CalendarPlus size={24} color="var(--success)" />
                  <div>
                    <h3>Google Calendar (OAuth 2.0)</h3>
                    <p>Sube tu archivo <code>client_secret.json</code> de Google Cloud para sincronizar entregas y recordatorios con Google Calendar.</p>
                  </div>
                </div>
                <div className="form-group">
                  <label>Documento de credenciales (client_secret.json)</label>
                  {googleConnected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
                      <CheckCircle size={16} /> Credenciales de Google configuradas
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <FileUp size={16} /> Seleccionar client_secret.json
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadGoogle(f); }} />
                      </label>
                    </div>
                  )}
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Se guarda cifrado con tu contraseña maestra. La conexión con Google Calendar se completará en una versión próxima.</p>
                </div>
              </div>

              <div className="config-actions">
                <button className="btn-save" onClick={handleSaveKeys}>
                  {isSaved ? <><CheckCircle size={18} /> Guardado</> : <><Save size={18} /> Guardar Credenciales</>}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="config-section">
              <h2>Seguridad de la aplicación</h2>
              <p className="section-desc">Protege la información de tus clientes con una contraseña maestra.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>La contraseña se guarda de forma segura (hash) y las claves de IA se cifran con ella. Si la olvidas, usa el código de recuperación.</p>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Contraseña actual</label>
                  <div className="input-with-icon">
                    <Shield size={16} className="input-icon" />
                    <input type={showPass ? 'text' : 'password'} className="config-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Contraseña actual" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Nueva contraseña</label>
                  <div className="input-with-icon">
                    <Key size={16} className="input-icon" />
                    <input type={showPass ? 'text' : 'password'} className="config-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nueva contraseña (mínimo 4)" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirmar nueva contraseña</label>
                  <div className="input-with-icon">
                    <Key size={16} className="input-icon" />
                    <input type={showPass ? 'text' : 'password'} className="config-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite la nueva contraseña" />
                  </div>
                </div>
                <button type="button" className="btn-secondary" style={{ marginBottom: '0.75rem' }} onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />} {showPass ? 'Ocultar' : 'Mostrar'}
                </button>
                {passMsg && <p style={{ color: passMsg.ok ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{passMsg.text}</p>}
                <button type="submit" className="btn-save"><Save size={18} /> Cambiar contraseña</button>
              </form>
            </div>
          )}

            {activeTab === 'system' && (
             <div className="config-section">
               <h2>Sincronización y Sistema</h2>
               <p className="section-desc">Preferencias globales de la aplicación.</p>

               <div className="feature-placeholder" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(39,174,96,0.06)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <h3>Copias de seguridad</h3>
                <p>Exporta toda tu información (base de datos, configuración y claves) en un archivo cifrado con tu contraseña maestra. Puedes restaurarlo en otro equipo para no perder nada. El archivo es independiente del equipo.</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={handleExportBackup}><Save size={16} /> Exportar copia</button>
                  <button className="btn-secondary" onClick={handleImportBackup}><Database size={16} /> Importar copia</button>
                </div>
              </div>

               <hr className="controls-divider" style={{ margin: '1rem 0' }} />

               <div className="feature-placeholder" style={{ borderLeft: '4px solid var(--accent-primary)', background: 'rgba(14,165,233,0.06)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <h3>Modo de datos</h3>
                <p>En desarrollo, <code>npm start</code> reinicia la base en cada inicio para pruebas. Usa <code>npm run start:persist</code> para conservar los datos entre sesiones. También puedes borrar solo los datos cargados aquí, sin perder clientes ni el catálogo.</p>
                <button className="btn-danger" onClick={handleResetData} style={{ marginTop: '0.5rem' }}>
                  <Database size={18} /> Borrar datos de prueba
                </button>
              </div>

              <hr className="controls-divider" style={{ margin: '1rem 0' }} />

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
