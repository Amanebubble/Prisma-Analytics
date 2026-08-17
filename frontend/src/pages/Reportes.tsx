import { useState } from 'react';
import { Download, Printer, Settings, FileText, CheckCircle, AlertTriangle, Building } from 'lucide-react';
import './Reportes.css';

export default function Reportes() {
  const [includeDuPont, setIncludeDuPont] = useState(true);
  const [includeFindings, setIncludeFindings] = useState(true);
  const [signatureReady, setSignatureReady] = useState(false);

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
        <div className="a4-preview-container">
          <div className="a4-paper">
            
            {/* Document Header */}
            <div className="doc-header">
              <div className="doc-logo-area">
                <Building size={32} color="var(--accent-primary)" />
                <div className="doc-firm-name">
                  <h2>PRISMA ANALYTICS</h2>
                  <p>Auditores y Consultores</p>
                </div>
              </div>
              <div className="doc-meta">
                <p><strong>Fecha:</strong> 17 de Agosto, 2026</p>
                <p><strong>Ref:</strong> PA-2026-08-014</p>
              </div>
            </div>

            <hr className="doc-divider" />

            {/* Title */}
            <div className="doc-title">
              <h1>DICTAMEN DE AUDITORÍA FINANCIERA Y TRIBUTARIA</h1>
              <p>Al Consejo de Administración de <strong>Lácteos El Salvador S.A.</strong></p>
            </div>

            {/* Content Body */}
            <div className="doc-body">
              <section className="doc-section">
                <h3>1. Opinión del Auditor</h3>
                <p>
                  Hemos auditado los estados financieros anexos de Lácteos El Salvador S.A., que comprenden el balance general al 31 de Julio de 2026, y el estado de resultados correspondiente. En nuestra opinión, los estados financieros presentan razonablemente, en todos los aspectos importantes, la situación financiera de la compañía.
                </p>
              </section>

              <section className="doc-section">
                <h3>2. Resumen de Salud Financiera (Prisma Score)</h3>
                <div className="doc-score-box">
                  <div className="score-circle">84/100</div>
                  <div className="score-details">
                    <p><strong>Estado General:</strong> <span className="text-success">Saludable</span></p>
                    <p>La entidad presenta niveles óptimos de liquidez (1.85) y rentabilidad neta (12.4%), superando los promedios del sector industrial.</p>
                  </div>
                </div>
              </section>

              {includeFindings && (
                <section className="doc-section">
                  <h3>3. Hallazgos de Auditoría Pre-Hacienda</h3>
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>Área de Revisión</th>
                        <th>Estado</th>
                        <th>Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Bancarización (Art. 62-A)</td>
                        <td><CheckCircle size={14} color="var(--success)" /> Conforme</td>
                        <td>Todas las transacciones {'>'} $10,950 cruzadas con bancos.</td>
                      </tr>
                      <tr>
                        <td>Cruce IVA vs Ingresos</td>
                        <td><CheckCircle size={14} color="var(--success)" /> Conforme</td>
                        <td>No existen variaciones entre F-07 y Contabilidad.</td>
                      </tr>
                      <tr>
                        <td>Retenciones ISR</td>
                        <td><AlertTriangle size={14} color="var(--warning)" /> Observación</td>
                        <td>2 comprobantes con retención calculada fuera de tiempo.</td>
                      </tr>
                    </tbody>
                  </table>
                </section>
              )}

              {includeDuPont && (
                <section className="doc-section">
                  <h3>4. Resumen de Desempeño Operativo (DuPont)</h3>
                  <p>
                    El rendimiento sobre el capital (ROE) ha mostrado una tendencia alcista, cerrando en 11.33%. Esto fue impulsado principalmente por una mejora en la Rotación de Activos (reducción de Días de Inventario).
                  </p>
                </section>
              )}
            </div>

            {/* Signature Area */}
            <div className="doc-footer">
              <div className="signature-line">
                {signatureReady ? (
                  <span className="digital-signature">Juan Administrador</span>
                ) : (
                  <span className="placeholder-signature">(Firma Pendiente)</span>
                )}
                <div className="line"></div>
                <p>Socio Director</p>
                <p>Prisma Analytics S.A. de C.V.</p>
                <p>N° J.V.P.P.A.: 12345</p>
              </div>
            </div>

          </div>
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
