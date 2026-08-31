import { useState, useEffect } from 'react';
import { FileSpreadsheet, FileJson, Landmark, AlertTriangle, PenLine, CheckCircle, StickyNote, FileCheck2, Briefcase, DollarSign, Search, Filter, Database, Building2 } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import './Historial.css';

interface HistoryEvent {
  kind: string;
  clientId: number;
  clientName: string;
  action: string;
  detail: string;
  module: string;
  date: string;
  tone: 'info' | 'warn' | 'danger' | 'success';
}

export default function Historial() {
  const { clients } = useClient();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'older'>('recent');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const clientId = clientFilter === 'all' ? null : clientFilter;
      const res = await ipcRenderer.invoke('get-history', { clientId, query, sort });
      setEvents(res?.events || []);
    } catch (error) {
      console.warn('No fue posible cargar el historial', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [clientFilter, query, sort]);

  const modules = ['all', ...Array.from(new Set(events.map(e => e.module)))];
  const filtered = moduleFilter === 'all' ? events : events.filter(e => e.module === moduleFilter);

  const iconFor = (kind: string) => {
    switch (kind) {
      case 'financial': return <FileSpreadsheet size={17} color="var(--accent-primary)" />;
      case 'iva': return <FileJson size={17} color="var(--success)" />;
      case 'bank': return <Landmark size={17} color="var(--warning)" />;
      case 'finding': return <AlertTriangle size={17} color="var(--danger)" />;
      case 'adjustment': return <PenLine size={17} color="var(--warning)" />;
      case 'review': return <CheckCircle size={17} color="var(--success)" />;
      case 'note': return <StickyNote size={17} color="var(--accent-primary)" />;
      case 'draft': return <FileCheck2 size={17} color="var(--success)" />;
      case 'engagement': return <Briefcase size={17} color="var(--text-secondary)" />;
      case 'billing': return <DollarSign size={17} color="var(--success)" />;
      default: return <Database size={17} color="var(--text-secondary)" />;
    }
  };

  const toneColor = (tone: string) => tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warning)' : tone === 'success' ? 'var(--success)' : 'var(--accent-primary)';

  const months = Array.from(new Set(events.map(e => (e.date || '').slice(0, 7)))).sort().reverse();

  return (
    <div className="historial-page fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Historial de Actividad</h1>
          <p>Registro de trazabilidad de todo lo realizado en la aplicación.</p>
        </div>
        <button className="btn-secondary" onClick={loadHistory}><Filter size={16} /> Actualizar</button>
      </div>

      <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
            <Search size={16} color="var(--text-muted)" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por acción, cliente, módulo..." style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <option value="all">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'Todos los módulos' : m}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as any)} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
            <option value="recent">Más recientes</option>
            <option value="older">Más antiguos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando historial...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h3>Sin actividad registrada</h3>
          <p>Los eventos aparecerán aquí a medida que trabajes con la aplicación.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {months.map(month => {
            const monthEvents = filtered.filter(e => (e.date || '').slice(0, 7) === month);
            if (!monthEvents.length) return null;
            const [y, m] = month.split('-');
            const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            return (
              <div key={month} style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {monthEvents.map((ev, i) => (
                    <div key={`${month}-${i}`} className="glass" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '0.4rem', display: 'flex', flexShrink: 0 }}>{iconFor(ev.kind)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.88rem' }}>{ev.action}</strong>
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{ev.module}</span>
                          <span style={{ fontSize: '0.72rem', color: toneColor(ev.tone) }}>{ev.kind === 'billing' && ev.tone === 'success' ? 'Pagado' : ''}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ev.detail}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <Building2 size={12} /> {ev.clientName}
                          <span>·</span>
                          <span>{new Date(ev.date).toLocaleString('es-SV')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
