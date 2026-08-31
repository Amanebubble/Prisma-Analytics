import { useState, useEffect } from 'react';
import { DollarSign, Briefcase, Plus, CheckCircle, Clock, Building2, CalendarDays, TrendingUp, AlertTriangle, Lock } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import './Planificacion.css';

interface Billing {
  id: number;
  engagement_id: number;
  amount: number;
  status: string;
  due_date: string;
  received_at: string | null;
  type?: string;
  eng_desc?: string;
  client_name?: string;
}

interface Engagement {
  id: number;
  client_id: number;
  client_name: string;
  type: string;
  description: string;
  status: string;
  deadline_date: string;
  actual_delivery_date: string | null;
  created_at: string;
  billing: Billing[];
  total_billed: number;
  days_to_deadline: number | null;
}

export default function Planificacion() {
  const { clients } = useClient();
  const [activeTab, setActiveTab] = useState<'trabajos' | 'cobros' | 'clientes' | 'calendario'>('trabajos');

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [allBilling, setAllBilling] = useState<Billing[]>([]);
  const [incomeByMonth, setIncomeByMonth] = useState<any[]>([]);
  const [clientImportance, setClientImportance] = useState<any[]>([]);

  // Formulario de nuevo trabajo
  const [showNewEngagement, setShowNewEngagement] = useState(false);
  const [newEng, setNewEng] = useState({ clientId: '', type: 'Auditoría Financiera', description: '', amount: '', deadline: '' });

  // Filtros cobranza
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadEngagements = async () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('get-all-engagements');
      if (res?.success) setEngagements(res.engagements);
    } catch (e) { console.warn('No fue posible cargar los trabajos', e); }
  };

  const loadBilling = async () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const [billing, income] = await Promise.all([
        ipcRenderer.invoke('get-all-billing', { month: selectedMonth, year: selectedYear }),
        ipcRenderer.invoke('get-income-by-month', { month: selectedMonth, year: selectedYear })
      ]);
      if (billing?.success) setAllBilling(billing.billing);
      if (income?.success) setIncomeByMonth(income.income);
    } catch (e) { console.warn('No fue posible cargar la cobranza', e); }
  };

  const loadImportance = async () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('get-client-importance');
      if (res?.success) setClientImportance(res.clients);
    } catch (e) { console.warn('No fue posible cargar la importancia de clientes', e); }
  };

  useEffect(() => { loadEngagements(); }, []);
  useEffect(() => { if (activeTab === 'cobros') loadBilling(); }, [activeTab, selectedMonth, selectedYear]);
  useEffect(() => { if (activeTab === 'clientes') loadImportance(); }, [activeTab]);

  const handleCreateEngagement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEng.clientId) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('create-engagement', {
        clientId: Number(newEng.clientId),
        type: newEng.type,
        description: newEng.description,
        deadlineDate: newEng.deadline,
        amount: Number(newEng.amount) || 0
      });
      setShowNewEngagement(false);
      setNewEng({ clientId: '', type: 'Auditoría Financiera', description: '', amount: '', deadline: '' });
      loadEngagements();
    } catch (e) { console.error(e); }
  };

  const handleUpdateEngagementStatus = async (id: number, status: string) => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('update-engagement-status', { engagementId: id, status });
      loadEngagements();
      if (activeTab === 'cobros') loadBilling();
    } catch (e) { console.error(e); }
  };

  const formatMoney = (n: number) => `$${Number(n || 0).toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pendingEngagements = engagements.filter(e => e.status === 'pending');
  const activeEngagements = engagements.filter(e => e.status === 'active');
  const completedEngagements = engagements.filter(e => e.status === 'completed');

  const badge = (days: number | null, status: string) => {
    if (status === 'completed') {
      return <span style={{ fontSize: '0.72rem', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={13} /> Entregado</span>;
    }
    if (days === null) return <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin fecha</span>;
    if (days < 0) return <span style={{ fontSize: '0.72rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={13} /> Venció hace {Math.abs(days)} días</span>;
    if (days <= 7) return <span style={{ fontSize: '0.72rem', color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={13} /> Entrega en {days} días</span>;
    return <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Entrega en {days} días</span>;
  };

  const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
  const totalIncomeMonth = incomeByMonth.reduce((s, c) => s + Number(c.income), 0);
  const totalBilledMonth = allBilling.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount), 0);

  return (
    <div className="planificacion-container fade-in">
      <div className="planificacion-header">
        <div>
          <h1 className="planificacion-title">Planificación y Cobranza</h1>
          <p className="planificacion-subtitle">Gestión general de todos los trabajos, honorarios e ingresos.</p>
        </div>
        <div className="view-toggle">
          <button className={`toggle-btn ${activeTab === 'trabajos' ? 'active' : ''}`} onClick={() => setActiveTab('trabajos')}><Briefcase size={18} /> Trabajos</button>
          <button className={`toggle-btn ${activeTab === 'cobros' ? 'active' : ''}`} onClick={() => setActiveTab('cobros')}><DollarSign size={18} /> Cobranza</button>
          <button className={`toggle-btn ${activeTab === 'clientes' ? 'active' : ''}`} onClick={() => setActiveTab('clientes')}><TrendingUp size={18} /> Clientes</button>
          <button className={`toggle-btn ${activeTab === 'calendario' ? 'active' : ''}`} onClick={() => setActiveTab('calendario')}><CalendarDays size={18} /> Calendario</button>
        </div>
      </div>

      {activeTab === 'trabajos' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div><span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{pendingEngagements.length}</span> <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>pendientes</span></div>
              <div><span style={{ fontSize: '1.4rem', fontWeight: 700 }}>{activeEngagements.length}</span> <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>en ejecución</span></div>
              <div><span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{completedEngagements.length}</span> <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>finalizados</span></div>
            </div>
            <button className="primary-action-btn" onClick={() => setShowNewEngagement(!showNewEngagement)}><Plus size={18} /> Nuevo Trabajo</button>
          </div>

          {showNewEngagement && (
            <form onSubmit={handleCreateEngagement} className="glass" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.5fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem' }}>Cliente</label>
                  <select value={newEng.clientId} onChange={e => setNewEng({ ...newEng, clientId: e.target.value })} required style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                    <option value="">Seleccione...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem' }}>Tipo de trabajo</label>
                  <input
                    list="tipos-trabajo"
                    value={newEng.type}
                    onChange={e => setNewEng({ ...newEng, type: e.target.value })}
                    placeholder="Ej: Auditoría, Contabilidad mensual, Nómina, Declaraciones..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
                  />
                  <datalist id="tipos-trabajo">
                    <option value="Auditoría Financiera" />
                    <option value="Auditoría Fiscal" />
                    <option value="Asesoría Contable" />
                    <option value="Contabilidad Mensual" />
                    <option value="Nómina" />
                    <option value="Declaración de Impuestos" />
                    <option value="Precios de Transferencia" />
                    <option value="Consultoría Financiera" />
                    <option value="Auditoría de Cumplimiento" />
                    <option value="Diligencia Debida" />
                    <option value="Otro" />
                  </datalist>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem' }}>Descripción / Período</label>
                  <input type="text" required value={newEng.description} onChange={e => setNewEng({ ...newEng, description: e.target.value })} placeholder="Ej. Ejercicio fiscal 2025..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem' }}>Monto a cobrar ($)</label>
                  <input type="number" step="0.01" required value={newEng.amount} onChange={e => setNewEng({ ...newEng, amount: e.target.value })} placeholder="0.00" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem' }}>Fecha de entrega estimada</label>
                  <input type="date" required value={newEng.deadline} onChange={e => setNewEng({ ...newEng, deadline: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewEngagement(false)}>Cancelar</button>
                <button type="submit" className="primary-action-btn">Registrar Trabajo y Honorario</button>
              </div>
            </form>
          )}

          <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem' }}>Cliente</th>
                  <th style={{ padding: '0.9rem' }}>Tipo / Descripción</th>
                  <th style={{ padding: '0.9rem' }}>Entrega</th>
                  <th style={{ padding: '0.9rem' }}>Estado</th>
                  <th style={{ padding: '0.9rem', textAlign: 'right' }}>Honorarios</th>
                </tr>
              </thead>
              <tbody>
                {engagements.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay trabajos registrados. Crea tu primer trabajo.</td></tr>
                )}
                {engagements.map(eng => (
                  <tr key={eng.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.9rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={16} color="var(--accent-primary)" /><strong>{eng.client_name}</strong></div></td>
                    <td style={{ padding: '0.9rem' }}>{eng.type}<div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{eng.description}</div></td>
                    <td style={{ padding: '0.9rem' }}>{eng.deadline_date ? new Date(eng.deadline_date).toLocaleDateString() : '-'}<div>{badge(eng.days_to_deadline, eng.status)}</div></td>
                    <td style={{ padding: '0.9rem' }}>
                      <select value={eng.status} onChange={(e) => handleUpdateEngagementStatus(eng.id, e.target.value)} style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', background: eng.status === 'completed' ? 'rgba(39,174,96,0.2)' : eng.status === 'active' ? 'rgba(45,156,219,0.2)' : 'rgba(242,153,74,0.2)', color: eng.status === 'completed' ? 'var(--success)' : eng.status === 'active' ? 'var(--accent-primary)' : 'var(--warning)', fontWeight: 600 }}>
                        <option value="pending">Planificación</option>
                        <option value="active">En Ejecución</option>
                        <option value="completed">Finalizado</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.9rem', textAlign: 'right', fontWeight: 600 }}>{formatMoney(eng.total_billed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Al marcar un trabajo como "Finalizado", su honorario se registra automáticamente como ingreso del mes en curso.</p>
        </div>
      )}

      {activeTab === 'cobros' && (
        <div className="animate-fade-in">
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Cobranza — {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {selectedYear}</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ width: '80px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(39,174,96,0.1)', border: '1px solid var(--success)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: '0.4rem' }}>Ingreso del mes</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success)' }}>{formatMoney(totalIncomeMonth)}</div>
              </div>
              <div style={{ background: 'rgba(242,153,74,0.1)', border: '1px solid var(--warning)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: '0.4rem' }}>Facturado del mes</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--warning)' }}>{formatMoney(totalBilledMonth)}</div>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Movimientos</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{allBilling.length}</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Ingresos por cliente ({monthName} {selectedYear})</h3>
              {incomeByMonth.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aún no hay ingresos registrados este mes.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}><th style={{ padding: '0.5rem 0' }}>Cliente</th><th style={{ textAlign: 'right' }}>Ingreso</th></tr></thead>
                  <tbody>{incomeByMonth.map(row => (
                    <tr key={row.client_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.5rem 0' }}>{row.client_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(row.income)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clientes' && (
        <div className="animate-fade-in">
          <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Importancia de clientes</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Ranking según honorarios generados, para priorizar la cartera.</p>
            {clientImportance.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Aún no hay datos para el análisis.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {clientImportance.map((c, idx) => (
                  <div key={c.client_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ width: '26px', height: '26px', borderRadius: '8px', background: idx < 3 ? 'rgba(14,165,233,0.15)' : 'var(--bg-secondary)', color: idx < 3 ? 'var(--accent-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>{idx + 1}</span>
                        <Building2 size={15} color="var(--text-muted)" />
                        <div>
                          <strong style={{ fontSize: '0.9rem' }}>{c.client_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.sector || 'Sin sector'} · {c.total_engagements} trabajo(s)</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{formatMoney(c.total_billed)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Cobrado: {formatMoney(c.total_collected)}</div>
                      </div>
                    </div>
                    <div style={{ height: '6px', borderRadius: '6px', background: 'var(--bg-tertiary)' }}>
                      <div style={{ height: '100%', width: `${c.importance_pct}%`, borderRadius: '6px', background: 'linear-gradient(90deg, var(--accent-primary), #0ea5e9)' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'calendario' && (
        <div className="animate-fade-in">
          <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '3rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(45,156,219,0.1)', color: 'var(--accent-primary)', marginBottom: '1.5rem' }}><Lock size={40} /></div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Integración con Calendario</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
              Los recordatorios de entrega (días restantes) ya se muestran en la pestaña Trabajos. La sincronización automática con Google Calendar y notificaciones requiere integrar una API de calendario.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Disponible en una versión futura.</p>
          </div>
        </div>
      )}
    </div>
  );
}
