import { useState } from 'react';
import { Download, Printer, Settings, FileText, Building2, Database } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import CanvasEditor from '../components/CanvasEditor';
import './Reportes.css';

export default function Reportes() {
  const { activeClient, reportDraft, setReportDraft } = useClient();
  const [includeDuPont, setIncludeDuPont] = useState(true);
  const [includeFindings, setIncludeFindings] = useState(true);
  const [signatureReady, setSignatureReady] = useState(false);

  if (!activeClient) {
    return (
      <div className="reportes-container fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Por favor, ve al Panel Principal y activa un cliente para generar su dictamen ejecutivo.</p>
        </div>
      </div>
    );
  }

  if (!activeClient.hasData) {
    return (
      <div className="reportes-container fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Esperando estados financieros...</h2>
          <p>Sube la información de <strong>{activeClient.name}</strong> para generar el dictamen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reportes-container fade-in">
      <div className="reportes-header">
        <div>
          <h1 className="reportes-title">Generación de Dictamen</h1>
          <p className="reportes-subtitle">Vista previa del reporte final de auditoría.</p>
        </div>
      </div>

      <div className="reportes-layout">
        
        {/* Left Side: A4 Preview */}
        <div className="a4-preview-container" style={{ overflow: 'hidden', padding: 0 }}>
          <CanvasEditor 
            initialContent={reportDraft || [
              {
                value: 'DICTAMEN DE AUDITORÍA FINANCIERA Y TRIBUTARIA',
                size: 16,
                bold: true,
                rowFlex: 'center' as any,
              },
              {
                value: '\n\nAl Consejo de Administración de ',
                size: 12,
              },
              {
                value: activeClient.name,
                size: 12,
                bold: true,
              },
              {
                value: '\n\n1. Opinión del Auditor\n',
                size: 14,
                bold: true,
              },
              {
                value: `Hemos auditado los estados financieros anexos de ${activeClient.name}, que comprenden el balance general al 31 de Julio de 2026, y el estado de resultados correspondiente. En nuestra opinión, los estados financieros presentan razonablemente, en todos los aspectos importantes, la situación financiera de la compañía.\n`,
                size: 12,
              },
              {
                value: '\n2. Resumen de Salud Financiera\n',
                size: 14,
                bold: true,
              },
              {
                value: 'La entidad presenta niveles óptimos de liquidez y rentabilidad, superando los promedios del sector industrial.\n',
                size: 12,
              },
              {
                value: '\n3. Resumen de Desempeño Operativo\n',
                size: 14,
                bold: true,
              },
              {
                value: 'El rendimiento sobre el capital (ROE) ha mostrado una tendencia alcista, impulsado principalmente por una mejora en la Rotación de Activos.\n\n\n\n',
                size: 12,
              },
              {
                value: signatureReady ? 'Firma: Juan Administrador\nSocio Director\nPrisma Analytics S.A. de C.V.' : '(Firma Pendiente)\nSocio Director\nPrisma Analytics S.A. de C.V.',
                size: 12,
                rowFlex: 'center' as any
              }
            ]}
            onChange={(content) => {
              setReportDraft(content);
            }}
          />
        </div>

        {/* Right Side: Settings & Export Controls */}
        <div className="reportes-controls glass">
          <h3><Settings size={18} /> Ajustes del Documento</h3>
          
          <div className="control-group">
            <label className="control-label">Anexos a Incluir</label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={includeFindings} 
                onChange={(e) => setIncludeFindings(e.target.checked)}
              />
              Tabla de Hallazgos (IVA/Renta)
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={includeDuPont} 
                onChange={(e) => setIncludeDuPont(e.target.checked)}
              />
              Resumen Análisis DuPont
            </label>
            <label className="checkbox-label">
              <input type="checkbox" defaultChecked />
              Estados Financieros Básicos
            </label>
          </div>

          <div className="control-group">
            <label className="control-label">Firma Digital</label>
            <button 
              className={`btn-signature ${signatureReady ? 'signed' : ''}`}
              onClick={() => setSignatureReady(!signatureReady)}
            >
              {signatureReady ? 'Firma Aplicada' : 'Aplicar mi Firma'}
            </button>
          </div>

          <hr className="controls-divider" />

          <div className="export-actions">
            <button className="btn-export-primary">
              <Download size={18} /> Exportar como PDF
            </button>
            <button className="btn-export-secondary">
              <Printer size={18} /> Imprimir Copia
            </button>
            <button className="btn-export-secondary">
              <FileText size={18} /> Enviar al Cliente
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
