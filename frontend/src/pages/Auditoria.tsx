import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, MessageSquare, Play, FileText, Building2, Database, Paperclip, X, ListChecks, StickyNote, Search, FileSpreadsheet, FileJson, Landmark } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import { useNavigate } from 'react-router-dom';
import './Auditoria.css';

interface AuditFinding {
  id: string;
  databaseId: number;
  type: string;
  title: string;
  description: string;
  impact: 'Crítico' | 'Alto' | 'Medio' | 'Informativo';
  status: 'Pendiente' | 'Justificado' | 'Observado';
  observation?: string | null;
}

export default function Auditoria() {
  const navigate = useNavigate();
  const { activeClient, activePeriod, setActivePeriod } = useClient();
  const [documents, setDocuments] = useState<any[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docQuery, setDocQuery] = useState('');
  const [docSort, setDocSort] = useState<'recent' | 'older'>('recent');
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'Pendientes' | 'Justificados'>('Todos');
  const [activeObservationId, setActiveObservationId] = useState<string | null>(null);
  const [observationText, setObservationText] = useState('');
  const [workingPaper, setWorkingPaper] = useState<any | null>(null);
  const [materiality, setMateriality] = useState({ planning_materiality: 0, execution_materiality: 0, trivial_threshold: 0 });
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjustment, setAdjustment] = useState({ reference: '', kind: 'adjustment', description: '', debitAccount: '', creditAccount: '', amount: '' });
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [reviewDraft, setReviewDraft] = useState({ tickMarks: [] as string[], assertions: { existencia: false, integridad: false, valuacion: false, presentacion: false }, reviewerNote: '' });
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '' });
  const [popover, setPopover] = useState<{ account: any; top: number; left: number } | null>(null);
  const [panelTab, setPanelTab] = useState<'hallazgos' | 'cuentas'>('hallazgos');
  const [evidenceName, setEvidenceName] = useState('');
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadWorkingPaper = async () => {
    if (!activeClient) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const [settings, paper] = await Promise.all([
        ipcRenderer.invoke('get-audit-settings', { clientId: activeClient.id, periodYear: activePeriod.year, periodMonth: activePeriod.month }),
        ipcRenderer.invoke('get-working-paper', { clientId: activeClient.id, periodYear: activePeriod.year, periodMonth: activePeriod.month })
      ]);
      setMateriality({
        planning_materiality: settings.planning_materiality || 0,
        execution_materiality: settings.execution_materiality || 0,
        trivial_threshold: settings.trivial_threshold || 0
      });
      setWorkingPaper(paper);
    } catch (error) {
      console.warn('No fue posible cargar la hoja de trabajo', error);
    }
  };

  const loadFindings = async () => {
    if (!activeClient) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('run-audit-engine', {
        clientId: activeClient.id,
        periodYear: activePeriod.year,
        periodMonth: activePeriod.month
      });
      setFindings(result || []);
    } catch (error) {
      console.error('Error cargando hallazgos de auditoría', error);
      setFindings([]);
    }
  };

  const loadDocuments = async () => {
    if (!activeClient) return;
    setDocLoading(true);
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('get-document-registry', { clientId: activeClient.id, query: docQuery, sort: docSort });
      setDocuments(result.documents || []);
    } catch (error) {
      console.warn('No fue posible cargar el inventario de documentos', error);
    } finally {
      setDocLoading(false);
    }
  };

  useEffect(() => {
    if (activeClient) loadDocuments();
  }, [activeClient, docQuery, docSort]);

  const chooseDocument = (doc: any) => {
    setSelectedDocument(doc);
    setActivePeriod({ year: doc.periodYear, month: doc.periodMonth || 12 });
  };

  useEffect(() => {
    if (activeClient && selectedDocument) { loadFindings(); loadWorkingPaper(); }
  }, [activeClient, activePeriod, selectedDocument]);

  const saveMateriality = async () => {
    if (!activeClient) return;
    const { ipcRenderer } = (window as any).require('electron');
    await ipcRenderer.invoke('save-audit-settings', {
      clientId: activeClient.id,
      periodYear: activePeriod.year,
      periodMonth: activePeriod.month,
      values: materiality
    });
  };

  const createAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeClient || !adjustment.debitAccount || !adjustment.creditAccount || !adjustment.amount) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('create-audit-adjustment', {
        clientId: activeClient.id,
        periodYear: activePeriod.year,
        periodMonth: activePeriod.month,
        data: {
          reference: adjustment.reference,
          kind: adjustment.kind,
          description: adjustment.description,
          lines: [
            { accountId: Number(adjustment.debitAccount), debit: Number(adjustment.amount), credit: 0 },
            { accountId: Number(adjustment.creditAccount), debit: 0, credit: Number(adjustment.amount) }
          ]
        }
      });
      setAdjustment({ reference: '', kind: 'adjustment', description: '', debitAccount: '', creditAccount: '', amount: '' });
      setShowAdjustment(false);
      await loadWorkingPaper();
    } catch (error: any) {
      alert(error.message || 'No fue posible crear el ajuste.');
    }
  };

  const selectAccount = (account: any, scroll = false) => {
    setSelectedAccount(account);
    setReviewDraft({
      tickMarks: account.tickMarks || [],
      assertions: { existencia: false, integridad: false, valuacion: false, presentacion: false, ...(account.assertions || {}) },
      reviewerNote: account.reviewerNote || ''
    });
    setNoteDraft({ title: account.noteTitle || `Nota - ${account.original_name}`, content: account.noteContent || '' });
    if (scroll) {
      requestAnimationFrame(() => {
        document.getElementById(`audit-row-${account.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const accountStatus = (account: any) => {
    const hasNote = Boolean(String(account.noteContent || '').trim());
    const hasReview = Boolean(String(account.reviewerNote || '').trim()) || Object.values(account.assertions || {}).some(value => Boolean(value));
    if (hasNote && hasReview) return 'ok';
    if (hasNote || hasReview) return 'warn';
    return 'none';
  };

  const statusBadge = (status: string) => {
    if (status === 'ok') return <span title="Cifra validada con nota y justificación"><span style={{ color: 'var(--success)' }}>🟢</span></span>;
    if (status === 'warn') return <span title="Falta adjuntar evidencia o justificación"><span style={{ color: 'var(--warning)' }}>🟡</span></span>;
    return <span title="Sin revisión"><span style={{ color: 'var(--text-muted)' }}>○</span></span>;
  };

  const openRowPopover = (account: any, event: React.MouseEvent) => {
    selectAccount(account);
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ account, top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 420) });
  };

  const closePopover = () => setPopover(null);

  const saveAccountReview = async () => {
    if (!activeClient || !selectedAccount) return;
    const { ipcRenderer } = (window as any).require('electron');
    const draft = evidenceName
      ? { ...reviewDraft, reviewerNote: `${reviewDraft.reviewerNote}${reviewDraft.reviewerNote ? '\n' : ''}[Evidencia adjunta: ${evidenceName}]` }
      : reviewDraft;
    await ipcRenderer.invoke('save-account-review', {
      clientId: activeClient.id,
      periodYear: activePeriod.year,
      periodMonth: activePeriod.month,
      accountId: selectedAccount.id,
      data: draft
    });
    setEvidenceName('');
    await loadWorkingPaper();
  };

  const saveAuditNote = async () => {
    if (!activeClient || !selectedAccount) return;
    const { ipcRenderer } = (window as any).require('electron');
    await ipcRenderer.invoke('save-audit-note', {
      clientId: activeClient.id,
      periodYear: activePeriod.year,
      periodMonth: activePeriod.month,
      accountId: selectedAccount.id,
      title: noteDraft.title || `Nota - ${selectedAccount.original_name}`,
      content: noteDraft.content
    });
    await loadWorkingPaper();
  };

  const formatMoney = (value: number) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dynamicNotePreview = noteDraft.content
    .replace(/\{\{saldo_auditado\}\}/g, selectedAccount ? formatMoney(selectedAccount.audited_balance) : '')
    .replace(/\{\{saldo_cliente\}\}/g, selectedAccount ? formatMoney(selectedAccount.client_balance) : '')
    .replace(/\{\{ajuste_neto\}\}/g, selectedAccount ? formatMoney(selectedAccount.audited_balance - selectedAccount.client_balance) : '');

  const handleJustify = async (finding: AuditFinding) => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('update-audit-finding', { findingId: finding.databaseId, status: 'Justificado' });
      await loadFindings();
    } catch (error) {
      console.error('Error justificando hallazgo', error);
    }
    setActiveObservationId(null);
  };

  if (!activeClient) {
    return (
      <div className="auditoria-page animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Por favor, ve al Panel Principal y activa un cliente para ver sus hallazgos de auditoría.</p>
        </div>
      </div>
    );
  }

  const hasWorkableData = workingPaper?.hasDocuments === true && (workingPaper.accounts?.length > 0 || workingPaper.documents?.iva > 0 || workingPaper.documents?.banks > 0);

  const docIcon = (kind: string) => {
    if (kind === 'financial') return <FileSpreadsheet size={18} color="var(--accent-primary)" />;
    if (kind === 'iva') return <FileJson size={18} color="var(--success)" />;
    return <Landmark size={18} color="var(--warning)" />;
  };
  const docStatusColor = (status: string) => status === 'auditado' ? 'var(--success)' : status === 'en_proceso' ? 'var(--warning)' : 'var(--text-muted)';

  if (selectedDocument && workingPaper && !hasWorkableData) {
    return (
      <div className="auditoria-page animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Sin datos para ese documento</h2>
          <p>El documento {selectedDocument.title} del período {selectedDocument.periodLabel} no tiene información cargada.</p>
          <button className="btn-secondary" onClick={() => setSelectedDocument(null)}>Volver al inventario</button>
        </div>
      </div>
    );
  }

  const handleObserve = (id: string) => {
    setActiveObservationId(id);
  };

  const saveObservation = async (finding: AuditFinding) => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('update-audit-finding', {
        findingId: finding.databaseId,
        status: 'Observado',
        observation: observationText
      });
      await loadFindings();
    } catch (error) {
      console.error('Error guardando observación', error);
    }
    setActiveObservationId(null);
    setObservationText('');
  };

  const visibleFindings = findings.filter(finding => {
    if (filter === 'Pendientes') return finding.status === 'Pendiente';
    if (filter === 'Justificados') return finding.status === 'Justificado';
    return true;
  });

  const stats = {
    total: findings.length,
    criticos: findings.filter(f => (f.impact === 'Crítico' || f.impact === 'Alto') && f.status === 'Pendiente').length,
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

  if (!activeClient) {
    return (
      <div className="auditoria-page animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Por favor, ve al Panel Principal y activa un cliente para ver sus hallazgos de auditoría.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auditoria-page animate-fade-in">
      {!selectedDocument && (
        <div className="findings-container glass animate-fade-in">
          <div className="page-header header-with-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Documentos para Auditar</h1>
              <p>Selecciona un documento para abrir su hoja de trabajo. {activeClient.name} — {activePeriod.month}/{activePeriod.year}</p>
            </div>
            <button className="btn-secondary" onClick={() => navigate('/carga-datos')}>+ Subir documentos</button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <Search size={16} color="var(--text-muted)" />
              <input value={docQuery} onChange={e => setDocQuery(e.target.value)} placeholder="Buscar por nombre o período (ej: Balance 2024, IVA...)..." style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <select value={docSort} onChange={e => setDocSort(e.target.value as any)} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              <option value="recent">Más recientes</option>
              <option value="older">Más antiguos</option>
            </select>
          </div>

          {docLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando documentos...</div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h2>Sin documentos cargados</h2>
              <p>El cliente <strong>{activeClient.name}</strong> aún no tiene documentos para auditar.</p>
              <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/carga-datos')}>Ir a Carga de Datos</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
              {documents.map(doc => (
                <div key={doc.id} onClick={() => chooseDocument(doc)} style={{ cursor: 'pointer', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                  <div className="doc-icon-box" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.5rem', display: 'flex' }}>{docIcon(doc.kind)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{doc.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doc.periodLabel}</div>
                    {doc.filename && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.filename}</div>}
                    <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', fontWeight: 600, color: docStatusColor(doc.status.key) }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: docStatusColor(doc.status.key), display: 'inline-block' }} />
                      {doc.status.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedDocument && workingPaper && (
        <div className="findings-container glass" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', alignItems: 'start' }}>
        <div>
          <div className="panel-header">
            <div>
              <h3>Hoja de Trabajo y Balanza Ajustada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{selectedDocument.title} · {selectedDocument.periodLabel} · Clic en cualquier cifra para abrir su papel de trabajo</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setSelectedDocument(null)}>Cambiar documento</button>
              <button className="btn-primary" onClick={() => setShowAdjustment(!showAdjustment)}>Nuevo ajuste</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label>Materialidad planeación<input type="number" value={materiality.planning_materiality} onChange={e => setMateriality({ ...materiality, planning_materiality: Number(e.target.value) })} /></label>
            <label>Materialidad ejecución<input type="number" value={materiality.execution_materiality} onChange={e => setMateriality({ ...materiality, execution_materiality: Number(e.target.value) })} /></label>
            <label>Umbral trivial<input type="number" value={materiality.trivial_threshold} onChange={e => setMateriality({ ...materiality, trivial_threshold: Number(e.target.value) })} /></label>
            <button className="btn-secondary" onClick={saveMateriality}>Guardar materialidad</button>
          </div>
          {showAdjustment && (
            <form onSubmit={createAdjustment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr auto', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
              <input required placeholder="Referencia AJ-01" value={adjustment.reference} onChange={e => setAdjustment({ ...adjustment, reference: e.target.value })} />
              <select value={adjustment.kind} onChange={e => setAdjustment({ ...adjustment, kind: e.target.value })}><option value="adjustment">Ajuste</option><option value="reclassification">Reclasificación</option></select>
              <input required type="number" min="0" step="0.01" placeholder="Importe" value={adjustment.amount} onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })} />
              <input required placeholder="Descripción y soporte" value={adjustment.description} onChange={e => setAdjustment({ ...adjustment, description: e.target.value })} />
              <button className="btn-primary" type="submit">Guardar</button>
              <select required value={adjustment.debitAccount} onChange={e => setAdjustment({ ...adjustment, debitAccount: e.target.value })}><option value="">Cuenta debe</option>{workingPaper.accounts.map((account: any) => <option key={`d-${account.id}`} value={account.id}>{account.original_name}</option>)}</select>
              <select required value={adjustment.creditAccount} onChange={e => setAdjustment({ ...adjustment, creditAccount: e.target.value })}><option value="">Cuenta haber</option>{workingPaper.accounts.map((account: any) => <option key={`c-${account.id}`} value={account.id}>{account.original_name}</option>)}</select>
            </form>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="findings-table"><thead><tr><th></th><th>Cuenta</th><th>Saldo cliente</th><th>Ajustes debe</th><th>Ajustes haber</th><th>Saldo auditado</th><th>Referencias</th></tr></thead>
              <tbody>{workingPaper.accounts.map((account: any) => {
                const status = accountStatus(account);
                return (
                  <tr key={account.id} id={`audit-row-${account.id}`}
                    onClick={(e) => openRowPopover(account, e)}
                    title="Haz clic para abrir el papel de trabajo de esta cifra"
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-color)', background: selectedAccount?.id === account.id ? 'rgba(14,165,233,0.12)' : undefined }}>
                    <td style={{ padding: '0.6rem', width: '24px' }}>{statusBadge(status)}</td>
                    <td style={{ padding: '0.6rem' }}>{account.niif_code} - {account.original_name}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>{formatMoney(account.client_balance)}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>{formatMoney(account.adjustments_debit)}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right' }}>{formatMoney(account.adjustments_credit)}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700 }}>{formatMoney(account.audited_balance)}</td>
                    <td style={{ padding: '0.6rem' }}>{account.references.join(', ') || '-'}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
        <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', maxHeight: '70vh', overflowY: 'auto', border: '1px solid var(--border-color)' }}>
          <div className="panel-header" style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Panel de Trabajo de Campo</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button className={panelTab === 'hallazgos' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPanelTab('hallazgos')}><ListChecks size={14} /> Hallazgos ({findings.length})</button>
            <button className={panelTab === 'cuentas' ? 'btn-primary' : 'btn-secondary'} onClick={() => setPanelTab('cuentas')}><StickyNote size={14} /> Cuentas ({workingPaper.accounts.filter((a: any) => accountStatus(a) !== 'none').length})</button>
          </div>
          {panelTab === 'hallazgos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {visibleFindings.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin hallazgos pendientes.</p>}
              {visibleFindings.map(finding => (
                <div key={finding.id} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', borderLeft: `3px solid ${finding.impact === 'Crítico' || finding.impact === 'Alto' ? 'var(--danger)' : finding.impact === 'Medio' ? 'var(--warning)' : 'var(--accent-primary)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {finding.impact === 'Crítico' || finding.impact === 'Alto'
                      ? <AlertTriangle size={14} color="var(--danger)" />
                      : finding.impact === 'Medio'
                        ? <AlertCircle size={14} color="var(--warning)" />
                        : <Info size={14} color="var(--accent-primary)" />}
                    <strong style={{ fontSize: '0.85rem' }}>{finding.title}</strong>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{finding.description}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {finding.status === 'Pendiente' ? (
                      <>
                        <button className="btn-action justify" onClick={() => handleJustify(finding)}><CheckCircle size={13}/> Justificar</button>
                        <button className="btn-action observe" onClick={() => setActiveObservationId(finding.id)}><MessageSquare size={13}/> Observar</button>
                      </>
                    ) : (
                      <span style={{ color: 'var(--success)', fontSize: '0.78rem' }}><CheckCircle size={13}/> {finding.status}</span>
                    )}
                  </div>
                  {activeObservationId === finding.id && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <textarea value={observationText} onChange={(e) => setObservationText(e.target.value)} placeholder="Nota al papel de trabajo..." style={{ width: '100%', minHeight: '50px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      <button className="btn-primary btn-small" onClick={() => saveObservation(finding)}>Guardar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {panelTab === 'cuentas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {workingPaper.accounts.filter((a: any) => accountStatus(a) !== 'none').length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ninguna cuenta tiene revisión o nota aún. Haz clic en una cifra del documento para empezar.</p>}
              {workingPaper.accounts.map((account: any) => {
                const status = accountStatus(account);
                if (status === 'none') return null;
                return (
                  <button key={account.id} onClick={() => selectAccount(account, true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: selectedAccount?.id === account.id ? 'rgba(14,165,233,0.12)' : 'var(--bg-tertiary)', cursor: 'pointer', textAlign: 'left' }}>
                    {statusBadge(status)}
                    <span style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.original_name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </div>
      )}
      <div className="page-header header-with-action">
        <div>
          <h1>Motor de Auditoría Automática</h1>
          <p>Bandeja de Hallazgos: Valida las inconsistencias detectadas por Prisma en el cruce de datos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary flex-btn" onClick={loadFindings}>
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
            <button className={`filter-btn ${filter === 'Todos' ? 'active' : ''}`} onClick={() => setFilter('Todos')}>Todos</button>
            <button className={`filter-btn ${filter === 'Pendientes' ? 'active' : ''}`} onClick={() => setFilter('Pendientes')}>Pendientes</button>
            <button className={`filter-btn ${filter === 'Justificados' ? 'active' : ''}`} onClick={() => setFilter('Justificados')}>Justificados</button>
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
            {visibleFindings.map((finding) => (
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
                        <button className="btn-action justify" onClick={() => handleJustify(finding)}>
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
                           <button className="btn-primary btn-small" onClick={() => saveObservation(finding)}>Guardar Observación</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {visibleFindings.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No hay hallazgos detectados. Todo está en orden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {popover && (
        <>
          <div onClick={closePopover} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }} />
          <div ref={popoverRef} className="glass animate-fade-in" style={{ position: 'fixed', top: popover.top, left: popover.left, width: '400px', maxHeight: '70vh', overflowY: 'auto', zIndex: 41, padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: '0 12px 32px rgba(0,0,0,0.28)', border: '1px solid var(--border-color)' }}>
            <div className="panel-header">
              <h3 style={{ fontSize: '0.95rem' }}>Papel de trabajo: {popover.account.original_name}</h3>
              <button className="btn-close" onClick={closePopover}><X size={16} /></button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Saldo cliente: {formatMoney(popover.account.client_balance)} · Auditado: {formatMoney(popover.account.audited_balance)} · {popover.account.niif_code}
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Marcas de auditoría</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.4rem 0 0.75rem' }}>
              {['√', 'Σ', 'C'].map(mark => <button key={mark} className={reviewDraft.tickMarks.includes(mark) ? 'btn-primary' : 'btn-secondary'} onClick={() => setReviewDraft({ ...reviewDraft, tickMarks: reviewDraft.tickMarks.includes(mark) ? reviewDraft.tickMarks.filter(item => item !== mark) : [...reviewDraft.tickMarks, mark] })}>{mark} {mark === '√' ? 'Cotejado' : mark === 'Σ' ? 'Suma verificada' : 'Confirmado'}</button>)}
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Aseveraciones</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '0.4rem 0 0.75rem' }}>
              {Object.entries({ existencia: 'Existencia', integridad: 'Integridad', valuacion: 'Valuación', presentacion: 'Presentación' }).map(([key, label]) => <label key={key} style={{ fontSize: '0.78rem' }}><input type="checkbox" checked={Boolean(reviewDraft.assertions[key as keyof typeof reviewDraft.assertions])} onChange={e => setReviewDraft({ ...reviewDraft, assertions: { ...reviewDraft.assertions, [key]: e.target.checked } })} /> {label}</label>)}
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Justificación / Observación del auditor</label>
            <textarea placeholder="Escribe la justificación de esta cifra..." value={reviewDraft.reviewerNote} onChange={e => setReviewDraft({ ...reviewDraft, reviewerNote: e.target.value })} style={{ width: '100%', minHeight: '60px', margin: '0.4rem 0', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => evidenceInputRef.current?.click()}><Paperclip size={14} /> {evidenceName || 'Adjuntar evidencia'}</button>
              <input ref={evidenceInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setEvidenceName(f.name); }} />
              <button className="btn-primary" onClick={saveAccountReview}>Guardar revisión</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nota a los estados financieros</label>
              <input placeholder="Título de nota" value={noteDraft.title} onChange={e => setNoteDraft({ ...noteDraft, title: e.target.value })} style={{ width: '100%', margin: '0.4rem 0', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              <textarea placeholder="Use {{saldo_cliente}}, {{saldo_auditado}} o {{ajuste_neto}} para cifras dinámicas." value={noteDraft.content} onChange={e => setNoteDraft({ ...noteDraft, content: e.target.value })} style={{ width: '100%', minHeight: '70px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              <p style={{ margin: '0.4rem 0', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Vista previa: {dynamicNotePreview}</p>
              <button className="btn-primary" onClick={saveAuditNote}>Guardar nota</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
