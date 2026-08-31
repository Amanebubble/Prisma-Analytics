import { useState, useEffect } from 'react';
import { FileCheck2, CheckCircle, AlertTriangle, XCircle, ShieldAlert, Building2, Database, ArrowRight, ArrowLeft } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import './Dictamen.css';

export default function Dictamen() {
  const { activeClient, activePeriod, setActivePeriod } = useClient();
  const [step, setStep] = useState<'diagnostico' | 'tipo'>('diagnostico');
  const [diagnosis, setDiagnosis] = useState<any | null>(null);
  const [opinionKey, setOpinionKey] = useState<string>('limpia');
  const [drafts, setDrafts] = useState<any[]>([]);

  const loadDiagnosis = async () => {
    if (!activeClient) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('get-opinion-diagnosis', {
        clientId: activeClient.id,
        periodYear: activePeriod.year,
        periodMonth: activePeriod.month
      });
      setDiagnosis(res);
      if (res?.suggestion) setOpinionKey(res.suggestion);
    } catch (error) {
      console.warn('No fue posible cargar el diagnóstico', error);
    }
  };

  const loadDrafts = async () => {
    if (!activeClient) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('get-opinion-drafts', activeClient.id);
      setDrafts(res?.drafts || []);
    } catch (error) {
      console.warn('No fue posible cargar los dictámenes guardados', error);
    }
  };

  useEffect(() => {
    if (activeClient) { loadDiagnosis(); loadDrafts(); }
  }, [activeClient, activePeriod]);

  const openDraft = async (draft: any) => {
    const year = draft.periodYear;
    const month = draft.periodMonth || 12;
    setActivePeriod({ year, month });
    const key = draft.opinion?.key || opinionKey;
    setOpinionKey(key);
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('get-opinion-template', {
        opinionKey: key,
        clientId: activeClient!.id,
        periodYear: year,
        periodMonth: month
      });
      if (res?.success) {
        await ipcRenderer.invoke('open-opinion-window', {
          opinionKey: key,
          clientId: activeClient!.id,
          periodYear: year,
          periodMonth: month,
          company: res.company
        });
      }
    } catch (error: any) {
      alert('No fue posible abrir el dictamen guardado: ' + error.message);
    }
  };

  const generateTemplate = async (key = opinionKey) => {
    if (!activeClient) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('get-opinion-template', {
        opinionKey: key,
        clientId: activeClient.id,
        periodYear: activePeriod.year,
        periodMonth: activePeriod.month
      });
      if (res?.success) {
        setOpinionKey(key);
        await ipcRenderer.invoke('open-opinion-window', {
          opinionKey: key,
          clientId: activeClient.id,
          periodYear: activePeriod.year,
          periodMonth: activePeriod.month,
          company: res.company
        });
      }
    } catch (error: any) {
      alert('No fue posible abrir el editor: ' + error.message);
    }
  };

  if (!activeClient) {
    return (
      <div className="dictamen-page animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Activa un cliente en el Panel Principal para emitir su dictamen.</p>
        </div>
      </div>
    );
  }

  const typeMeta = (key: string) => {
    const item = diagnosis?.opinionTypes?.find((t: any) => t.key === key);
    if (!item) return { icon: 'green', label: key, code: '' };
    return item;
  };

  const iconFor = (key: string) => {
    const icon = typeMeta(key).icon;
    if (icon === 'green') return <CheckCircle size={22} color="var(--success)" />;
    if (icon === 'yellow') return <AlertTriangle size={22} color="var(--warning)" />;
    if (icon === 'red') return <XCircle size={22} color="var(--danger)" />;
    return <ShieldAlert size={22} color="var(--text-muted)" />;
  };
  const colorFor = (key: string) => typeMeta(key).icon === 'green' ? 'var(--success)' : typeMeta(key).icon === 'yellow' ? 'var(--warning)' : typeMeta(key).icon === 'red' ? 'var(--danger)' : 'var(--text-muted)';

  return (
    <div className="dictamen-page animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Emisión de Dictamen</h1>
          <p>Informe del Auditor Independiente — {activeClient.name} · {activePeriod.month}/{activePeriod.year}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Período:</span>
            <select value={activePeriod.month} onChange={e => setActivePeriod({ ...activePeriod, month: parseInt(e.target.value) })} style={{ padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <input type="number" value={activePeriod.year} onChange={e => setActivePeriod({ ...activePeriod, year: parseInt(e.target.value) })} style={{ width: '76px', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>
          <button className="btn-secondary" onClick={() => { setStep('diagnostico'); loadDiagnosis(); }}>Actualizar</button>
          <div className="stepper">
            <span className={step === 'diagnostico' ? 'active' : ''}>1. Diagnóstico</span>
            <span className={step === 'tipo' ? 'active' : ''}>2. Tipo</span>
            <span>3. Editor y Firma (ventana aparte)</span>
          </div>
        </div>
      </div>

      {step === 'diagnostico' && (
        <div className="glass animate-fade-in" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          {drafts.length > 0 && (
            <div style={{ marginBottom: '1.25rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
              <div className="panel-header" style={{ marginBottom: '0.5rem' }}>
                <h3>Dictámenes guardados en este equipo</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{drafts.length} borrador(es)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {drafts.map(draft => (
                  <div key={draft.id} onClick={() => openDraft(draft)} style={{ cursor: 'pointer', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileCheck2 size={18} color="var(--accent-primary)" />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '0.9rem' }}>{draft.opinion?.label || 'Dictamen'}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {draft.company} · {draft.periodLabel || `${draft.periodMonth}/${draft.periodYear}`} · {draft.firmante ? `Firma: ${draft.firmante}` : 'Sin firma'}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(draft.lastModified).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Haz clic en un dictamen para abrir y continuar editándolo.</p>
            </div>
          )}
          <div className="panel-header">
            <h3>Diagnóstico Previo (Audit Health Check)</h3>
            <button className="btn-primary" disabled={!diagnosis} onClick={() => setStep('tipo')}>Continuar al tipo de dictamen <ArrowRight size={16} /></button>
          </div>
          {!diagnosis ? (
            <p style={{ color: 'var(--text-muted)' }}>Analizando evidencia cargada...</p>
          ) : (
            <>
              <div className="diagnosis-grid">
                <div className="diag-card">
                  <div className="diag-title"><Database size={16} /> Estados financieros</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Encontrados: <strong>{diagnosis.presentTypes.length}</strong> de 5 esenciales.
                  </p>
                  {diagnosis.missing.length > 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--warning)' }}>
                      Faltan: {diagnosis.missing.map((m: string) => m.replace('_', ' ')).join(', ')}
                    </p>
                  ) : (
                    <p style={{ fontSize: '0.78rem', color: 'var(--success)' }}>Juego completo de estados disponible.</p>
                  )}
                </div>
                <div className="diag-card">
                  <div className="diag-title"><AlertTriangle size={16} /> Hallazgos</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Críticos sin justificar: <strong style={{ color: diagnosis.openCritical > 0 ? 'var(--danger)' : 'var(--success)' }}>{diagnosis.openCritical}</strong>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Medios sin justificar: <strong style={{ color: diagnosis.openMedium > 0 ? 'var(--warning)' : 'var(--success)' }}>{diagnosis.openMedium}</strong>
                  </p>
                </div>
                <div className="diag-card">
                  <div className="diag-title"><FileCheck2 size={16} /> Evidencia complementaria</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    IVA: <strong>{diagnosis.hasIva ? 'Cargado' : 'Falta'}</strong> · Bancos: <strong>{diagnosis.hasBanks ? 'Cargado' : 'Falta'}</strong>
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${colorFor(diagnosis.suggestion)}`, background: 'rgba(14,165,233,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {iconFor(diagnosis.suggestion)}
                  <div>
                    <strong style={{ color: colorFor(diagnosis.suggestion) }}>Sugerencia del sistema</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Con base en la evidencia disponible, el sistema sugiere: <strong>{typeMeta(diagnosis.suggestion).label}</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'tipo' && (
        <div className="glass animate-fade-in" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <div className="panel-header">
            <h3>Selecciona el tipo de dictamen a emitir</h3>
            <button className="btn-secondary" onClick={() => setStep('diagnostico')}><ArrowLeft size={16} /> Volver</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {diagnosis?.opinionTypes.map((item: any) => {
              const selected = opinionKey === item.key;
              return (
                <div key={item.key} onClick={() => setOpinionKey(item.key)} style={{ cursor: 'pointer', padding: '1rem', border: `2px solid ${selected ? colorFor(item.key) : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', background: selected ? 'rgba(14,165,233,0.06)' : 'var(--bg-tertiary)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ color: colorFor(item.key) }}>{iconFor(item.key)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.code}</div>
                    {item.key === diagnosis.suggestion && (
                      <span style={{ display: 'inline-block', marginTop: '0.4rem', padding: '0.15rem 0.5rem', fontSize: '0.72rem', background: 'rgba(14,165,233,0.12)', color: 'var(--accent-primary)', borderRadius: '999px' }}>Sugerido por el sistema</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button className="btn-primary" onClick={() => generateTemplate(opinionKey)}>Generar plantilla <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

    </div>
  );
}
