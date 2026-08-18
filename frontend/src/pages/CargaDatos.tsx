import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, FileJson, CheckCircle, AlertCircle, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { processFinancialDataWithAI, type MappedAccount } from '../services/aiService';
import './CargaDatos.css';

export default function CargaDatos() {
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [mappedData, setMappedData] = useState<MappedAccount[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [aiDiff, setAiDiff] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cargar cliente activo (simulado)
    const fetchActiveClient = async () => {
      setSelectedClientId(1); // Fijo por ahora hasta que haya contexto global
    };
    fetchActiveClient();
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
      await processFile(files[0]);
    }
  };

  const handleClickUpload = () => {
    if (!selectedClientId) {
      alert("Por favor selecciona una empresa primero.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
    // Clear input to allow uploading the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    // Limpiar estado global (reseteo solicitado por el usuario)
    setAiStatus(null);
    setMappedData([]);
    setAiDiff(0);
    
    try {
      // 1. Leer el archivo Excel en el navegador
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Tomar la primera hoja
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir a CSV simple
      const csvData = XLSX.utils.sheet_to_csv(worksheet);

      // 2. Enviar datos a Gemini AI
      const response = await processFinancialDataWithAI(csvData);
      
      if (response.success && response.mapped_data) {
        setMappedData(response.mapped_data);
        setAiStatus(response.ai_status || 'OK');
        setAiDiff(response.ai_diff || 0);
      } else {
        alert("Error de IA: " + response.error);
      }
    } catch (error: any) {
      console.error(error);
      alert('Error procesando el archivo localmente: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="carga-datos-container animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Carga de Datos y Mapeo NIIF (Motor IA)</h1>
          <p>Sube tus balances (Excel). Prisma extraerá el texto y Gemini estructurará y validará los montos.</p>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".xlsx, .xls, .csv" 
        onChange={handleFileChange}
      />

      <div className="upload-grid">
        {/* Tarjeta 1: Balances y E.R. */}
        <div className="upload-card">
          <div className="upload-icon-wrapper">
            <FileText size={32} />
          </div>
          <h3>Estados Financieros</h3>
          <p>Sube tu archivo real (.xlsx, .csv)</p>
          
          <div 
            id="financials"
            className={`dropzone ${activeUpload === 'financials' ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
          >
            {isProcessing ? (
               <Loader2 size={24} className="spin" color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            ) : (
               <UploadCloud size={24} color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            )}
            
            <div className="dropzone-text">{isProcessing ? 'Procesando con Gemini IA...' : 'Haz clic o arrastra tu Excel real aquí'}</div>
            <div className="dropzone-subtext">Lee archivos locales</div>
          </div>
        </div>

        {/* Tarjeta 2: Libros y Anexos (Placeholder) */}
        <div className="upload-card" style={{ opacity: 0.6 }}>
          <div className="upload-icon-wrapper" style={{ background: 'rgba(39, 174, 96, 0.1)', color: 'var(--success)' }}>
            <FileSpreadsheet size={32} />
          </div>
          <h3>Libros y anexos</h3>
          <p>Próximamente para IVA</p>
          <div className="dropzone">
            <UploadCloud size={24} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">En desarrollo</div>
          </div>
        </div>

        {/* Tarjeta 3: Estados Bancarios (Placeholder) */}
        <div className="upload-card" style={{ opacity: 0.6 }}>
          <div className="upload-icon-wrapper" style={{ background: 'rgba(242, 153, 74, 0.1)', color: 'var(--warning)' }}>
            <FileJson size={32} />
          </div>
          <h3>Estados de cuenta</h3>
          <p>Próximamente vía LlamaParse</p>
          <div className="dropzone">
            <UploadCloud size={24} color="var(--warning)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">En desarrollo</div>
          </div>
        </div>
      </div>

      {/* Sección de Mapeo */}
      <div className="mapping-section" style={{ opacity: mappedData.length > 0 ? 1 : 0.5, pointerEvents: mappedData.length > 0 ? 'auto' : 'none', transition: 'all 0.3s' }}>
        <div className="mapping-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Mapeo Inteligente Gemini AI</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
              Estos datos provienen de la inferencia real del modelo Gemini.
            </p>
          </div>
          <button className="btn-secondary" disabled={mappedData.length === 0}>
            <CheckCircle size={18} /> Confirmar Mapeo
          </button>
        </div>
        
        {mappedData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Sube un archivo de Excel para probar la Inteligencia Artificial...
          </div>
        ) : (
          <div>
            {aiStatus === 'DESCUADRE' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(235, 87, 87, 0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle size={20} style={{ marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Desfase Contable Detectado</h4>
                  <p style={{ fontSize: '0.875rem' }}>El modelo de IA detectó que la ecuación contable no cuadra. Diferencia aproximada: <strong>${Number(aiDiff).toLocaleString('es-SV')}</strong>.</p>
                </div>
              </div>
            )}
            
            {aiStatus === 'OK' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(39, 174, 96, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={20} />
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Validación Exitosa: Activo = Pasivo + Patrimonio o los datos son congruentes.</span>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem' }}>Cuenta Extraída (Excel)</th>
                    <th style={{ padding: '0.75rem' }}>Saldo Real</th>
                    <th style={{ padding: '0.75rem' }}>Clasificación NIIF Asignada</th>
                    <th style={{ padding: '0.75rem' }}>Confianza</th>
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
                            <AlertCircle size={14}/> Dudoso
                          </span>
                        ) : (
                          <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={14}/> Alta
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
