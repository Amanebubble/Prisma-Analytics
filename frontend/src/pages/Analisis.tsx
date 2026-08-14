import { useState } from 'react';
import { mockFinancialData, getKPIs, getWorkingCapitalMetrics } from '../utils/mockFinancialData';
import DuPontTree from '../components/DuPontTree';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Activity, DollarSign, PieChart, Clock, RefreshCw } from 'lucide-react';
import './Analisis.css';

export default function Analisis() {
  const currentYearData = mockFinancialData.periodos[1];
  const previousYearData = mockFinancialData.periodos[0];
  const kpis = getKPIs(currentYearData);
  const wc = getWorkingCapitalMetrics(currentYearData);

  const [activeTab, setActiveTab] = useState<'resumen' | 'vertical' | 'dupont' | 'capital'>('resumen');

  // Preparar datos para gráfica comparativa
  const chartData = [
    {
      name: 'Activos Totales',
      '2024': previousYearData.balance_general.total_activos,
      '2025': currentYearData.balance_general.total_activos
    },
    {
      name: 'Pasivos Totales',
      '2024': previousYearData.balance_general.total_pasivos,
      '2025': currentYearData.balance_general.total_pasivos
    },
    {
      name: 'Ingresos',
      '2024': previousYearData.estado_resultados.ingresos_ventas,
      '2025': currentYearData.estado_resultados.ingresos_ventas
    },
    {
      name: 'Utilidad Neta',
      '2024': previousYearData.estado_resultados.utilidad_neta,
      '2025': currentYearData.estado_resultados.utilidad_neta
    }
  ];

  return (
    <div className="analisis-container">
      
      {/* Encabezado */}
      <div className="analisis-header">
        <div>
          <h1 className="analisis-title">Diagnóstico Financiero</h1>
          <p className="analisis-subtitle">Basado en estados financieros NIIF - {mockFinancialData.empresa}</p>
        </div>
        <div className="period-badge">Período Activo: 2025 (Simulado)</div>
      </div>

      {/* KPIs Superiores */}
      <div className="kpi-grid">
        <div className="kpi-card glass">
          <div className="kpi-icon"><DollarSign size={24} color="#0ea5e9" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Liquidez Corriente</p>
            <h3 className="kpi-value">{kpis.liquidez}x</h3>
            <p className="kpi-desc text-green">Estado Saludable</p>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon"><Activity size={24} color="#10b981" /></div>
          <div className="kpi-content">
            <p className="kpi-label">ROE (Rentabilidad)</p>
            <h3 className="kpi-value text-green">{kpis.roe}</h3>
            <p className="kpi-desc">Retorno sobre el patrimonio</p>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon"><PieChart size={24} color="#f59e0b" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Nivel de Endeudamiento</p>
            <h3 className="kpi-value text-orange">{kpis.endeudamiento}</h3>
            <p className="kpi-desc">Proporción de deuda sobre activos</p>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon"><TrendingUp size={24} color="#8b5cf6" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Crecimiento Ventas</p>
            <h3 className="kpi-value text-purple">+17.0%</h3>
            <p className="kpi-desc text-green">Crecimiento interanual</p>
          </div>
        </div>
      </div>

      {/* Navegación Interna */}
      <div className="analisis-tabs">
        <button 
          className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          Resumen Gráfico
        </button>
        <button 
          className={`tab-btn ${activeTab === 'vertical' ? 'active' : ''}`}
          onClick={() => setActiveTab('vertical')}
        >
          Análisis Vertical
        </button>
        <button 
          className={`tab-btn ${activeTab === 'dupont' ? 'active' : ''}`}
          onClick={() => setActiveTab('dupont')}
        >
          Análisis DuPont
        </button>
        <button 
          className={`tab-btn ${activeTab === 'capital' ? 'active' : ''}`}
          onClick={() => setActiveTab('capital')}
        >
          Capital de Trabajo
        </button>
      </div>

      {/* Contenido Dinámico */}
      <div className="tab-content">
        {activeTab === 'resumen' && (
          <div className="charts-section animate-fade-in">
            <div className="chart-card glass">
              <h3>Crecimiento Interanual (Análisis Horizontal)</h3>
              <div style={{ width: '100%', height: 350, marginTop: '2rem' }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                    <Tooltip 
                      formatter={(value: any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))}
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="2024" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="2025" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vertical' && (
          <div className="vertical-analysis-section animate-fade-in">
            <div className="chart-card glass">
              <h3>Análisis Vertical (2025)</h3>
              <p className="analisis-subtitle mb-4">Composición porcentual respecto al Total de Activos</p>
              
              <table className="vertical-table">
                <thead>
                  <tr>
                    <th>Cuenta Contable</th>
                    <th className="text-right">Monto ($)</th>
                    <th className="text-right">Peso Vertical (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-section-header">
                    <td colSpan={3}>ACTIVOS</td>
                  </tr>
                  {currentYearData.balance_general.desglose_activos.map((item: any, idx: number) => (
                    <tr key={`act-${idx}`}>
                      <td>{item.cuenta}</td>
                      <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.monto)}</td>
                      <td className="text-right font-bold text-blue">
                        {((item.monto / currentYearData.balance_general.total_activos) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="table-total">
                    <td>TOTAL ACTIVOS</td>
                    <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentYearData.balance_general.total_activos)}</td>
                    <td className="text-right font-bold">100.0%</td>
                  </tr>

                  <tr className="table-section-header">
                    <td colSpan={3}>PASIVOS Y PATRIMONIO</td>
                  </tr>
                  {currentYearData.balance_general.desglose_pasivos.map((item: any, idx: number) => (
                    <tr key={`pas-${idx}`}>
                      <td>{item.cuenta}</td>
                      <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.monto)}</td>
                      <td className="text-right font-bold text-orange">
                        {((item.monto / currentYearData.balance_general.total_activos) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {currentYearData.balance_general.desglose_patrimonio.map((item: any, idx: number) => (
                    <tr key={`pat-${idx}`}>
                      <td>{item.cuenta}</td>
                      <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.monto)}</td>
                      <td className="text-right font-bold text-green">
                        {((item.monto / currentYearData.balance_general.total_activos) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="table-total">
                    <td>TOTAL PASIVOS + PATRIMONIO</td>
                    <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(currentYearData.balance_general.total_pasivos + currentYearData.balance_general.total_patrimonio)}</td>
                    <td className="text-right font-bold">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dupont' && (
          <div className="animate-fade-in">
            <DuPontTree 
              data={{
                utilidadNeta: currentYearData.estado_resultados.utilidad_neta,
                ventas: currentYearData.estado_resultados.ingresos_ventas,
                activos: currentYearData.balance_general.total_activos,
                patrimonio: currentYearData.balance_general.total_patrimonio
              }} 
            />
          </div>
        )}

        {activeTab === 'capital' && (
          <div className="capital-section animate-fade-in">
            <div className="chart-card glass">
              <div className="capital-header">
                <h3>Ciclo de Conversión de Efectivo (CCC)</h3>
                <p>Mide cuánto tiempo tarda la empresa en convertir sus inversiones en inventario y otros recursos en flujos de efectivo por ventas.</p>
              </div>

              <div className="ccc-visualizer">
                <div className="ccc-metric ccc-dio">
                  <div className="ccc-icon"><RefreshCw size={20}/></div>
                  <div className="ccc-info">
                    <span className="ccc-label">Días de Inventario (DIO)</span>
                    <span className="ccc-value">{wc.dio} días</span>
                  </div>
                </div>
                <div className="ccc-operator">+</div>
                <div className="ccc-metric ccc-dso">
                  <div className="ccc-icon"><Clock size={20}/></div>
                  <div className="ccc-info">
                    <span className="ccc-label">Días de Cobro (DSO)</span>
                    <span className="ccc-value">{wc.dso} días</span>
                  </div>
                </div>
                <div className="ccc-operator">-</div>
                <div className="ccc-metric ccc-dpo">
                  <div className="ccc-icon"><TrendingUp size={20}/></div>
                  <div className="ccc-info">
                    <span className="ccc-label">Días de Pago (DPO)</span>
                    <span className="ccc-value">{wc.dpo} días</span>
                  </div>
                </div>
                <div className="ccc-operator">=</div>
                <div className="ccc-metric ccc-total">
                  <div className="ccc-info">
                    <span className="ccc-label">Ciclo Efectivo</span>
                    <span className="ccc-value text-blue">{wc.ccc} días</span>
                  </div>
                </div>
              </div>
              
              <div className="ccc-insight">
                <strong>💡 Diagnóstico Automático: </strong> 
                El dinero de la empresa está "atrapado" en la operación por <strong>{wc.ccc} días</strong> antes de volverse efectivo real. 
                {wc.ccc > 60 ? " Es un ciclo alto, se recomienda negociar más días con proveedores o acelerar los cobros a clientes para liberar liquidez." : " Es un ciclo saludable, indicando una buena gestión de inventarios y cobros."}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
