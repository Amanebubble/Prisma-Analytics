import { RefreshCw, FileText, ArrowUpRight, ArrowDownRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  return (
    <div className="cliente-dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1>Principal: <span style={{ fontWeight: 400 }}>Julio 2026</span></h1>
        <div className="header-actions-group">
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
              <div className="gauge-needle" style={{ transform: 'rotate(50deg)' }}></div>
              <div className="gauge-center"></div>
              <div className="gauge-value">
                <span className="score-num">84</span><span className="score-max"> / 100</span>
                <span className="score-label">Saludable</span>
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
                <div className="risk-badge green">Verde</div>
                <div className="risk-badge green">Verde<br/><small>Saludable</small></div>
              </div>
              <div className="risk-row">
                <span className="risk-label">Rentabilidad</span>
                <div className="risk-badge green">Verde</div>
                <div className="risk-badge green">Verde<br/><small>Saludable</small></div>
              </div>
              <div className="risk-row">
                <span className="risk-label">Solvencia</span>
                <div className="risk-badge yellow">Amarillo</div>
                <div className="risk-badge yellow">Amarillo<br/><small>Precaución</small></div>
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
                <span className="kpi-value">1.85</span>
                <span className="kpi-delta positive"><ArrowUpRight size={14}/> 3%</span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend positive"><ArrowUpRight size={14}/> 3%</span>
                <span className="kpi-target">Meta &gt; 1.50</span>
              </div>
            </div>

            <div className="dashboard-card kpi-card">
              <span className="kpi-title">Margen Neto</span>
              <div className="kpi-main">
                <span className="kpi-value">12.4%</span>
                <span className="kpi-delta positive"><ArrowUpRight size={14}/> 1.1%</span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend positive"><ArrowUpRight size={14}/> 1.1%</span>
                <span className="kpi-target">Sector: 10%</span>
              </div>
            </div>

            <div className="dashboard-card kpi-card">
              <span className="kpi-title">Endeudamiento Activos</span>
              <div className="kpi-main">
                <span className="kpi-value">42%</span>
                <span className="kpi-delta negative"><ArrowDownRight size={14}/> 0.5%</span>
              </div>
              <div className="kpi-footer">
                <span className="kpi-trend negative"><ArrowDownRight size={14}/> 0.5%</span>
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
