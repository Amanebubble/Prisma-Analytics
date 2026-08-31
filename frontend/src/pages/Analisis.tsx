import { useState, useEffect } from 'react';
import DuPontTree from '../components/DuPontTree';
import { TrendingUp, Activity, DollarSign, PieChart, Building2, Database } from 'lucide-react';
import { useClient } from '../context/ClientContext';
import './Analisis.css';

export default function Analisis() {
  const { activeClient, activePeriod } = useClient();
  const [activeTab, setActiveTab] = useState<'resumen' | 'vertical' | 'dupont' | 'capital'>('resumen');
  const [persistedRatios, setPersistedRatios] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    if (!activeClient) {
      setPersistedRatios(null);
      setSummary(null);
      return;
    }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      // Ratios del período activo.
      ipcRenderer.invoke('get-financial-ratios', {
        clientId: activeClient.id,
        periodYear: activePeriod.year,
        periodMonth: activePeriod.month
      }).then((result: any) => {
        setPersistedRatios(result.available ? result : null);
      });
      // Resumen real (último período con datos) para el diagnóstico de la página.
      ipcRenderer.invoke('get-client-summary', activeClient.id).then((res: any) => {
        setSummary(res?.hasData ? res : null);
      });
    } catch (error) {
      console.warn('No fue posible cargar ratios persistidos', error);
    }
  }, [activeClient, activePeriod]);

  if (!activeClient) {
    return (
      <div className="analisis-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Por favor, ve al Panel Principal y activa un cliente para ver su análisis financiero.</p>
        </div>
      </div>
    );
  }

  if (!activeClient.hasData) {
    return (
      <div className="analisis-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Database size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Esperando estados financieros...</h2>
          <p>Sube la información de <strong>{activeClient.name}</strong> para generar su análisis.</p>
        </div>
      </div>
    );
  }

  const sTotals = summary?.totals;
  const netProfit = persistedRatios?.totals.netIncome ?? sTotals?.netIncome ?? activeClient.income - activeClient.expenses;
  const persisted = persistedRatios?.ratios;
  const assets = sTotals?.assets ?? activeClient.assets;
  const liabilities = sTotals?.liabilities ?? activeClient.liabilities;
  const equity = sTotals?.equity ?? activeClient.equity;
  const income = sTotals?.income ?? activeClient.income;
  const formatRatio = (value: number | null | undefined, suffix = '') => value === null || value === undefined ? 'N/A' : `${value.toFixed(2)}${suffix}`;
  const liquidez = formatRatio(persisted?.currentRatio ?? (liabilities > 0 ? assets / liabilities : null));
  const roe = formatRatio(persisted?.roe ?? (equity > 0 ? (netProfit / equity) * 100 : null), '%');
  const endeudamiento = formatRatio(persisted?.debtToAssets ?? (assets > 0 ? (liabilities / assets) * 100 : null), '%');
  const margin = formatRatio(persisted?.netMargin ?? summary?.margin ?? (income > 0 ? (netProfit / income) * 100 : null), '%');

  // Agrupar cuentas para Análisis Vertical
  const activos = activeClient.accounts.filter(a => a.niifCode.startsWith('1'));
  const pasivos = activeClient.accounts.filter(a => a.niifCode.startsWith('2'));
  const patrimonio = activeClient.accounts.filter(a => a.niifCode.startsWith('3'));

  return (
    <div className="analisis-container">
      
      {/* Encabezado */}
      <div className="analisis-header">
        <div>
          <h1 className="analisis-title">Diagnóstico Financiero</h1>
          <p className="analisis-subtitle">Basado en estados financieros NIIF - {activeClient.name}</p>
        </div>
         <div className="period-badge">{(persistedRatios || summary) ? `Período con datos: ${summary?.periodYear || activePeriod.year}` : 'Sin datos del período'}</div>
      </div>

      {/* KPIs Superiores */}
      <div className="kpi-grid">
        <div className="kpi-card glass">
          <div className="kpi-icon"><DollarSign size={24} color="#0ea5e9" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Liquidez Corriente</p>
            <h3 className="kpi-value">{liquidez}x</h3>
            <p className="kpi-desc text-green">Capacidad de pago</p>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon"><Activity size={24} color="#10b981" /></div>
          <div className="kpi-content">
            <p className="kpi-label">ROE (Rentabilidad)</p>
            <h3 className="kpi-value text-green">{roe}</h3>
            <p className="kpi-desc">Retorno sobre el patrimonio</p>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon"><PieChart size={24} color="#f59e0b" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Nivel de Endeudamiento</p>
            <h3 className="kpi-value text-orange">{endeudamiento}</h3>
            <p className="kpi-desc">Proporción de deuda sobre activos</p>
          </div>
        </div>

        <div className="kpi-card glass">
          <div className="kpi-icon"><TrendingUp size={24} color="#8b5cf6" /></div>
          <div className="kpi-content">
            <p className="kpi-label">Margen Neto</p>
           <h3 className="kpi-value text-purple">{margin}</h3>
               <p className="kpi-desc text-green">Utilidad sobre ingresos</p>
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
          <div className="charts-section animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <h3>Requiere Base de Datos Histórica</h3>
              <p>El gráfico de crecimiento interanual se habilitará cuando se implemente la persistencia mensual.</p>
            </div>
          </div>
        )}

        {activeTab === 'vertical' && (
          <div className="vertical-analysis-section animate-fade-in">
            <div className="chart-card glass">
              <h3>Análisis Vertical</h3>
              <p className="analisis-subtitle mb-4">Composición porcentual respecto al Total de Activos</p>
              
              <table className="vertical-table">
                <thead>
                  <tr>
                    <th>Cuenta Contable (Clasificación NIIF)</th>
                    <th className="text-right">Monto ($)</th>
                    <th className="text-right">Peso Vertical (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-section-header">
                    <td colSpan={3}>ACTIVOS</td>
                  </tr>
                  {activos.map((item, idx) => (
                    <tr key={`act-${idx}`}>
                      <td>{item.originalName} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({item.niifCode} - {item.niifName})</span></td>
                      <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.originalBalance)}</td>
                      <td className="text-right font-bold text-blue">
                        {activeClient.assets > 0 ? ((item.originalBalance / activeClient.assets) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                  <tr className="table-total">
                    <td>TOTAL ACTIVOS</td>
                    <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activeClient.assets)}</td>
                    <td className="text-right font-bold">100.0%</td>
                  </tr>

                  <tr className="table-section-header">
                    <td colSpan={3}>PASIVOS Y PATRIMONIO</td>
                  </tr>
                  {pasivos.map((item, idx) => (
                    <tr key={`pas-${idx}`}>
                      <td>{item.originalName} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({item.niifCode} - {item.niifName})</span></td>
                      <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.originalBalance)}</td>
                      <td className="text-right font-bold text-orange">
                        {activeClient.assets > 0 ? ((item.originalBalance / activeClient.assets) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                  {patrimonio.map((item, idx) => (
                    <tr key={`pat-${idx}`}>
                      <td>{item.originalName} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({item.niifCode} - {item.niifName})</span></td>
                      <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.originalBalance)}</td>
                      <td className="text-right font-bold text-green">
                        {activeClient.assets > 0 ? ((item.originalBalance / activeClient.assets) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                  <tr className="table-total">
                    <td>TOTAL PASIVOS + PATRIMONIO</td>
                    <td className="text-right">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activeClient.liabilities + activeClient.equity)}</td>
                    <td className="text-right font-bold">
                      {activeClient.assets > 0 ? (((activeClient.liabilities + activeClient.equity) / activeClient.assets) * 100).toFixed(1) : 0}%
                    </td>
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
                utilidadNeta: netProfit,
                ventas: activeClient.income,
                activos: activeClient.assets,
                patrimonio: activeClient.equity
              }} 
            />
          </div>
        )}

        {activeTab === 'capital' && (
          <div className="capital-section animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
             <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
               <h3>Capital de Trabajo y Ciclo de Efectivo</h3>
               {persisted?.cashConversionCycle === null || persisted?.cashConversionCycle === undefined ? (
                 <p>Se requieren cuentas de inventario, cuentas por cobrar, proveedores, ingresos y costos.</p>
               ) : (
                 <div className="kpi-grid" style={{ marginTop: '1.5rem', width: '100%' }}>
                   <div className="kpi-card glass"><p className="kpi-label">Capital de trabajo</p><h3 className="kpi-value">${Number(persistedRatios.totals.workingCapital).toLocaleString('es-SV')}</h3></div>
                   <div className="kpi-card glass"><p className="kpi-label">Días de cobro</p><h3 className="kpi-value">{formatRatio(persisted.daysSalesOutstanding, ' días')}</h3></div>
                   <div className="kpi-card glass"><p className="kpi-label">Días de inventario</p><h3 className="kpi-value">{formatRatio(persisted.daysInventoryOutstanding, ' días')}</h3></div>
                   <div className="kpi-card glass"><p className="kpi-label">Ciclo de efectivo</p><h3 className="kpi-value">{formatRatio(persisted.cashConversionCycle, ' días')}</h3></div>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
