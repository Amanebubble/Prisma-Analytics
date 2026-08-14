import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, MessageSquare, Play, FileText } from 'lucide-react';
import { generateMockFindings, type AuditFinding } from '../utils/mockAuditEngine';
import './Auditoria.css';

export default function Auditoria() {
  const [findings, setFindings] = useState<AuditFinding[]>(generateMockFindings());
  const [activeObservationId, setActiveObservationId] = useState<string | null>(null);
  const [observationText, setObservationText] = useState('');

  const handleJustify = (id: string) => {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'Justificado' } : f));
    setActiveObservationId(null);
  };

  const handleObserve = (id: string) => {
    setActiveObservationId(id);
  };

  const saveObservation = (id: string) => {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'Observado' } : f));
    setActiveObservationId(null);
    setObservationText('');
  };

  const stats = {
    total: findings.length,
    criticos: findings.filter(f => f.impact === 'Crítico' && f.status === 'Pendiente').length,
    medios: findings.filter(f => f.impact === 'Medio' && f.status === 'Pendiente').length,
    resueltos: findings.filter(f => f.status !== 'Pendiente').length
  };

  const getImpactBadge = (impact: string) => {
    switch(impact) {
      case 'Crítico':
      case 'Alto': 
        return <span className="impact-badge critico"><AlertTriangle size={14}/> {impact}</span>;
      case 'Medio':
        return <span className="impact-badge medio"><AlertCircle size={14}/> Medio</span>;
      case 'Informativo':
        return <span className="impact-badge info"><Info size={14}/> Informativo</span>;
      default:
        return <span>{impact}</span>;
    }
  };

  return (
    <div className="auditoria-page animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Motor de Auditoría Automática</h1>
          <p>Bandeja de Hallazgos: Valida las inconsistencias detectadas por Prisma en el cruce de datos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary flex-btn">
            <Play size={18} /> Re-ejecutar Motor
          </button>
          <button className="btn-primary flex-btn" disabled={stats.criticos > 0}>
            <FileText size={18} /> Generar Papeles de Trabajo
          </button>
        </div>
      </div>

      <div className="audit-stats-grid">
        <div className="stat-card glass">
          <div className="stat-title">Hallazgos Pendientes</div>
          <div className="stat-value">{stats.total - stats.resueltos}</div>
        </div>
        <div className="stat-card glass danger-border">
          <div className="stat-title">Riesgo Crítico</div>
          <div className="stat-value text-danger">{stats.criticos}</div>
        </div>
        <div className="stat-card glass warning-border">
          <div className="stat-title">Riesgo Medio</div>
          <div className="stat-value text-warning">{stats.medios}</div>
        </div>
        <div className="stat-card glass success-border">
          <div className="stat-title">Hallazgos Validados</div>
          <div className="stat-value text-success">{stats.resueltos}</div>
        </div>
      </div>

      <div className="findings-container glass">
        <div className="panel-header">
          <h3>Bandeja de Hallazgos</h3>
          <div className="filters">
            <button className="filter-btn active">Todos</button>
            <button className="filter-btn">Pendientes</button>
            <button className="filter-btn">Justificados</button>
          </div>
        </div>

        <table className="findings-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo de Prueba</th>
              <th>Hallazgo Detectado</th>
              <th>Impacto / Riesgo</th>
              <th>Acción del Auditor</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <React.Fragment key={finding.id}>
                <tr className={`finding-row ${finding.status !== 'Pendiente' ? 'resolved-row' : ''}`}>
                  <td className="font-bold">{finding.id}</td>
                  <td><span className="test-type">{finding.type}</span></td>
                  <td>
                    <div className="finding-details">
                      <strong>{finding.title}</strong>
                      <p>{finding.description}</p>
                    </div>
                  </td>
                  <td>{getImpactBadge(finding.impact)}</td>
                  <td>
                    {finding.status === 'Pendiente' ? (
                      <div className="action-buttons">
                        <button className="btn-action justify" onClick={() => handleJustify(finding.id)}>
                          <CheckCircle size={16}/> Justificar
                        </button>
                        <button className="btn-action observe" onClick={() => handleObserve(finding.id)}>
                          <MessageSquare size={16}/> Observar
                        </button>
                      </div>
                    ) : (
                      <div className="resolved-status">
                        <CheckCircle size={16} color="var(--success)"/> {finding.status}
                      </div>
                    )}
                  </td>
                </tr>
                {activeObservationId === finding.id && (
                  <tr className="observation-row">
                    <td colSpan={5}>
                      <div className="observation-box">
                        <label>Agregar nota al papel de trabajo (Working Paper):</label>
                        <textarea 
                          value={observationText}
                          onChange={(e) => setObservationText(e.target.value)}
                          placeholder="Escriba el motivo de la observación o requerimiento de información al cliente..."
                        />
                        <div className="observation-actions">
                          <button className="btn-text" onClick={() => setActiveObservationId(null)}>Cancelar</button>
                          <button className="btn-primary btn-small" onClick={() => saveObservation(finding.id)}>Guardar Observación</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {findings.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No hay hallazgos detectados. Todo está en orden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
