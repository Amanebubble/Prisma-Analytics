import { useState, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, FileJson, CheckCircle, AlertCircle, Building, FileText, AlertTriangle } from 'lucide-react';
import './CargaDatos.css';

export default function CargaDatos() {
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiDiff, setAiDiff] = useState<number>(0);

  useEffect(() => {
    // Cargar los clientes al iniciar
    const fetchClients = async () => {
      try {
        // @ts-ignore
        if (window.require) {
          // @ts-ignore
          const { ipcRenderer } = window.require('electron');
          const clientsData = await ipcRenderer.invoke('get-clients');
          if (clientsData && clientsData.length > 0) {
            setClients(clientsData);
            setSelectedClientId(clientsData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    fetchClients();
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveUpload((e.currentTarget as HTMLElement).id);
  };

  const handleDragLeave = () => {
    setActiveUpload(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setActiveUpload(null);
    if (!selectedClientId) {
      alert("Por favor selecciona una empresa primero.");
      return;
    }
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // @ts-ignore
      if (files[0].path) {
        // @ts-ignore
        await processFile(files[0].path);
      } else {
        alert('Subida soportada solo en entorno nativo actualmente.');
      }
    }
  };

  const handleClickUpload = async (fileTypes: string[]) => {
    if (!selectedClientId) {
      alert("Por favor selecciona una empresa primero.");
      return;
    }
    try {
      // @ts-ignore
      if (window.require) {
        // @ts-ignore
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('open-file-dialog', {
          filters: [{ name: 'Documentos', extensions: fileTypes }]
        });
        if (!result.canceled && result.filePaths.length > 0) {
          await processFile(result.filePaths[0]);
        }
      } else {
        alert('Selección de archivo manual simulada (Solo en navegador).');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processFile = async (filePath: string) => {
    setIsProcessing(true);
    setAiStatus(null);
    setMappedData([]);
    
    try {
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      const response = await ipcRenderer.invoke('process-excel', {
        filePath,
        clientId: selectedClientId,
        year: 2026,
        type: 'balance'
      });
      
      if (response.success && response.mapped_data) {
        setMappedData(response.mapped_data);
        setAiStatus(response.ai_status);
        setAiDiff(response.ai_diff);
      }
    } catch (error: any) {
      console.error(error);
      alert('Error procesando el archivo con IA: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="carga-datos-container animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Carga de Datos y Mapeo NIIF (Motor IA)</h1>
          <p>Sube tus balances (Excel o PDF). Prisma usará Inteligencia Artificial para estructurar y validar los montos.</p>
        </div>
        
        {/* Selector de Empresa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <Building size={18} color="var(--accent-primary)" />
          <select 
            value={selectedClientId} 
            onChange={(e) => setSelectedClientId(Number(e.target.value))}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            {clients.length === 0 && <option value={0}>Cargando empresas...</option>}
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="upload-grid">
        {/* Tarjeta 1: Balances y E.R. */}
        <div className="upload-card">
          <div className="upload-icon-wrapper">
            <FileText size={32} />
          </div>
          <h3>Estados Financieros</h3>
          <p>Balance General, E.R. o Balance de Comprobación (.xlsx, .csv, .pdf)</p>
          
          <div 
            id="financials"
            className={`dropzone ${activeUpload === 'financials' ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => handleClickUpload(['xlsx', 'csv', 'pdf'])}
          >
            <UploadCloud size={24} color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">{isProcessing ? '🤖 IA Analizando...' : 'Haz clic o arrastra tu archivo aquí'}</div>
            <div className="dropzone-subtext">Impulsado por LlamaParse & Gemini</div>
          </div>
        </div>

        {/* Tarjeta 2: Libros IVA */}
        <div className="upload-card">
          <div className="upload-icon-wrapper" style={{ background: 'rgba(39, 174, 96, 0.1)', color: 'var(--success)' }}>
            <FileSpreadsheet size={32} />
          </div>
          <h3>Libros de IVA (F-07)</h3>
          <p>Libro de Ventas y Compras Mensual para cruces pre-hacienda (.xlsx, .csv)</p>
          
          <div 
            id="iva"
            className={`dropzone ${activeUpload === 'iva' ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => handleClickUpload(['xlsx', 'csv'])}
          >
            <UploadCloud size={24} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">Haz clic o arrastra tu archivo aquí</div>
            <div className="dropzone-subtext">Plantillas del Ministerio de Hacienda</div>
          </div>
        </div>

        {/* Tarjeta 3: DTEs (JSON) */}
        <div className="upload-card">
          <div className="upload-icon-wrapper" style={{ background: 'rgba(242, 153, 74, 0.1)', color: 'var(--warning)' }}>
            <FileJson size={32} />
          </div>
          <h3>Documentos DTE</h3>
          <p>Facturación electrónica, CCF, Notas de Crédito (.json, .xml)</p>
          
          <div 
            id="dte"
            className={`dropzone ${activeUpload === 'dte' ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => handleClickUpload(['json', 'xml'])}
          >
            <UploadCloud size={24} color="var(--warning)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">Haz clic o arrastra tus archivos aquí</div>
            <div className="dropzone-subtext">JSON estructurados del MH</div>
          </div>
        </div>
      </div>

      {/* Sección de Mapeo */}
      <div className="mapping-section" style={{ opacity: mappedData.length > 0 ? 1 : 0.5, pointerEvents: mappedData.length > 0 ? 'auto' : 'none', transition: 'all 0.3s' }}>
        <div className="mapping-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Mapeo Inteligente NIIF</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
              Revisa cómo la IA ha clasificado tus cuentas. 
            </p>
          </div>
          <button className="btn-secondary" disabled={mappedData.length === 0}>
            <CheckCircle size={18} /> Confirmar Mapeo
          </button>
        </div>
        
        {mappedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Esperando datos de entrada...
          </div>
        ) : (
          <div>
            {aiStatus === 'DESCUADRE' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(235, 87, 87, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle size={20} style={{ marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Desfase Contable Detectado</h4>
                  <p style={{ fontSize: '0.875rem' }}>El motor matemático detectó que la ecuación contable no cuadra. Diferencia: <strong>${Number(aiDiff).toLocaleString('es-SV')}</strong>. Revisa los montos extraídos.</p>
                </div>
              </div>
            )}
            
            {aiStatus === 'OK' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(39, 174, 96, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={20} />
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Validación Matemática Exitosa: Activo = Pasivo + Patrimonio al 100%.</span>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Cuenta Original (Extraída por IA)</th>
                    <th style={{ padding: '0.75rem' }}>Saldo</th>
                    <th style={{ padding: '0.75rem' }}>Clasificación NIIF</th>
                    <th style={{ padding: '0.75rem' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{row.originalName || 'S/N'}</td>
                      <td style={{ padding: '0.75rem' }}>${Number(row.originalBalance).toLocaleString('es-SV')}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <select 
                          defaultValue={row.niifCode}
                          style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
                        >
                          <option value="Unmapped">-- Sin Mapear --</option>
                          <option value={row.niifCode}>{row.niifCode} - {row.niifName}</option>
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {row.niifCode === 'Unmapped' ? (
                          <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={14}/> Revisión
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14}/> Mapeado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
