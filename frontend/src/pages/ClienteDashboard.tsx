import { RefreshCw, FileText, ArrowUpRight, CheckCircle, AlertTriangle, Building2, Database, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useClient } from '../context/ClientContext';
import { useState, useEffect } from 'react';
import './ClienteDashboard.css';

const chartData = [
  { name: "Feb '26", roe: 6.37, roa: 1.64 },
  { name: "Mar '26", roe: 6.05, roa: 1.90 },
  { name: "Abr '26", roe: 8.00, roa: 1.85 },
  { name: "May '26", roe: 9.01, roa: 3.39 },
  { name: "Jun '26", roe: 9.42, roa: 1.67 },
  { name: "Jul '26", roe: 11.33, roa: 3.53 },
];

export default function ClienteDashboard() {
  const { activeClient, resetClientData } = useClient();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!activeClient) { setSummary(null); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.invoke('get-client-summary', activeClient.id).then((res: any) => {
        setSummary(res?.hasData ? res : null);
      });
    } catch (e) {
      console.warn('No fue posible cargar el resumen', e);
    }
  }, [activeClient]);

  const assets = summary?.totals?.assets ?? 0;
  const liabilities = summary?.totals?.liabilities ?? 0;
  const margin = summary?.margin ?? 0;
  const score = summary?.score ?? 0;

  if (!activeClient) {
    return (
      <div className="cliente-dashboard animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Por favor, ve al Panel Principal y activa un cliente para ver su resumen ejecutivo.</p>
        </div>
      </div>
    );
  }

  if (!activeClient.hasData) {
    return (
      <div className="cliente-dashboard animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Esperando estados financieros...</h2>
          <p>El cliente <strong>{activeClient.name}</strong> aún no tiene datos cargados.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Ve a la sección "Carga de Datos" en el menú izquierdo para subir el archivo Excel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cliente-dashboard animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1>Resumen Ejecutivo</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Cliente Activo: <strong>{activeClient.name}</strong></p>
        </div>
        <div className="header-actions-group">
          <button className="btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => {
            if(window.confirm('¿Estás seguro de que deseas eliminar todos los datos cargados de este cliente?')) {
              resetClientData(activeClient.id);
            }
          }}>
            <Trash2 size={16} /> Limpiar Datos
          </button>
          <button className="btn-secondary">
            <RefreshCw size={16} /> Actualizar Datos
          </button>
          <button className="btn-primary">
            <FileText size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* Lado Izquierdo */}
        <div className="grid-left-col">
          
          {/* Tarjeta 1: Prisma Health Score */}
          <div className="dashboard-card score-card">
            <h3 style={{ color: 'white', marginBottom: '1.5rem', fontWeight: 600 }}>Prisma Health Score</h3>
            
            <div className="gauge-container">
              <div className="gauge-arc"></div>
              <div className="gauge-needle" style={{ transform: `rotate(${(score / 100) * 180 - 90}deg)` }}></div>
              <div className="gauge-center"></div>
              <div className="gauge-value">
                <span className="score-num">{score}</span><span className="score-max"> / 100</span>
                <span className="score-label">{score >= 70 ? 'Saludable' : score >= 40 ? 'Precaución' : 'Peligro'}</span>
              </div>
            </div>

            <div className="score-footer">
              <div className="status-row">
                <span className="status-label">Estado IVA</span>
                <span className="status-value success">OK</span>
              </div>
              <p className="status-desc">No Alertas | Declaración F-07</p>
            </div>
          </div>

          {/* Tarjeta 2: Riesgo y Salud Financiera */}
          <div className="dashboard-card risk-card">
            <h3>Riesgo y Salud Financiera</h3>
            
            <div className="risk-grid">
              <div className="risk-row">
                <span className="risk-label">Liquidez</span>
                {liabilities > 0 && (assets / liabilities) >= 1.5 ? (
                  <div className="risk-badge green">Verde<br/><small>Saludable</small></div>
                ) : (
                  <div className="risk-badge yellow">Amarillo<br/><small>Precaución</small></div>
                )}
              </div>
              <div className="risk-row">
                <span className="risk-label">Rentabilidad</span>
                {margin >= 10 ? (
                  <div className="risk-badge green">Verde<br/><small>Saludable</small></div>
                ) : margin > 0 ? (
                  <div className="risk-badge yellow">Amarillo<br/><small>Precaución</small></div>
                ) : (
                  <div className="risk-badge red" style={{ background: 'var(--danger)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>Rojo<br/><small>Pérdidas</small></div>
                )}
              </div>
              <div className="risk-row">
                <span className="risk-label">Solvencia</span>
                {assets > 0 && (liabilities / assets) <= 0.5 ? (
                  <div className="risk-badge green">Verde<br/><small>Saludable</small></div>
                ) : (
                  <div className="risk-badge yellow">Amarillo<br/><small>Precaución</small></div>
                )}
              </div>
            </div>
            
            <div className="risk-footer-note">
              <CheckCircle size={16} color="var(--success)" />
              <div>
                <strong>Cruce IVA vs Ingresos Contables</strong>
                <p>Coinciden (100%)</p>
              </div>
            </div>
          </div>

        </div>

        {/* Lado Derecho */}
        <div className="grid-right-col">
          
          {/* Tarjetas KPI Superiores */}
          <div className="kpi-row">
            <div className="dashboard-card kpi-card">
              <span className="kpi-title">Liquidez Corriente</span>
              <div className="kpi-main">
                <span className="kpi-value">
                  {liabilities > 0 ? (assets / liabilities).toFixed(2) : 'N/A'}x
                </span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend positive"><ArrowUpRight size={14}/> Datos Reales</span>
                <span className="kpi-target">Meta &gt; 1.50</span>
              </div>
            </div>

            <div className="dashboard-card kpi-card">
              <span className="kpi-title">Margen Neto</span>
              <div className="kpi-main">
                <span className="kpi-value">{margin}%</span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend positive"><ArrowUpRight size={14}/> Datos Reales</span>
                <span className="kpi-target">Sector: 10%</span>
              </div>
            </div>

            <div className="dashboard-card kpi-card">
              <span className="kpi-title">Endeudamiento Activos</span>
              <div className="kpi-main">
                <span className="kpi-value">
                  {assets > 0 ? ((liabilities / assets) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend positive"><ArrowUpRight size={14}/> Datos Reales</span>
                <span className="kpi-target">Límite 50%</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Tendencia */}
          <div className="dashboard-card chart-card">
            <div className="chart-header">
              <h3>Tendencia Mensual de Rentabilidad (ROE vs ROA)</h3>
              <div className="chart-filters">
                <span className="filter-chip active">6 meses</span>
                <span className="filter-date">Feb '26 - Jul '26</span>
              </div>
            </div>
            
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} domain={[0, 16]} ticks={[0, 4, 8, 12, 16]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', background: '#1e293b', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="roe" name="ROE" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4, fill: '#94a3b8' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="roa" name="ROA" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="chart-gradient-bg"></div>
            </div>
          </div>

        </div>
      </div>

      {/* Resumen de Auditoría Inteligente */}
      <div className="dashboard-card audit-summary-card">
        <div className="audit-summary-header">
          <div>
            <h3>Resumen de Auditoría Inteligente</h3>
            <p className="success-text">No hay discrepancias críticas.</p>
          </div>
          <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Generar Reporte PDF</button>
        </div>

        <div className="audit-chips-container">
          <div className="audit-chip success-chip">
            <CheckCircle size={18} />
            <div className="chip-text">
              <span className="chip-title">Bancarización Art. 62-A</span>
              <span className="chip-desc">Verificado (Sin Anomalías)</span>
            </div>
          </div>

          <div className="audit-chip warning-chip">
            <AlertTriangle size={18} />
            <div className="chip-text">
              <span className="chip-title">F-07 IVA Previo</span>
              <span className="chip-desc">Generado (Julio 2026)</span>
            </div>
          </div>

          <div className="audit-chip danger-chip">
            <AlertTriangle size={18} />
            <div className="chip-text">
              <span className="chip-title">Alertas Pendientes</span>
              <span className="chip-desc">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
