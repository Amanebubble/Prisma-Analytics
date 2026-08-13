import { Activity, TrendingUp, Users, AlertCircle, Upload } from 'lucide-react';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export default function Dashboard() {
  const stats = [
    { title: 'Clientes Activos', value: '24', icon: Users, color: 'var(--accent-primary)' },
    { title: 'Reportes Generados', value: '156', icon: FileText, color: 'var(--success)' },
    { title: 'Alertas Fiscales', value: '3', icon: AlertCircle, color: 'var(--warning)' },
    { title: 'Salud Promedio', value: '87%', icon: Activity, color: 'var(--accent-primary)' },
  ];

  const [isUploading, setIsUploading] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);

  const handleUpload = async () => {
    try {
      // @ts-ignore
      if (!window.require) {
        alert("La subida de archivos requiere entorno Electron.");
        return;
      }
      // @ts-ignore
      const { ipcRenderer } = window.require('electron');
      
      const result = await ipcRenderer.invoke('open-file-dialog', {
        filters: [{ name: 'Excel', extensions: ['xlsx', 'csv'] }]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setIsUploading(true);
        const filePath = result.filePaths[0];
        
        // Simular ID de cliente y año por ahora (en producción habría un modal)
        const response = await ipcRenderer.invoke('process-excel', {
          filePath,
          clientId: 1, 
          year: 2023,
          type: 'balance'
        });
        
        if (response.success) {
          // Generar datos ficticios para el gráfico para la demostración, 
          // o idealmente llamar a get-financials
          setFinancialData([
            { name: 'Activo Corriente', value: 45000 },
            { name: 'Activo No Corriente', value: 120000 },
            { name: 'Pasivo Corriente', value: 30000 },
            { name: 'Patrimonio', value: 135000 },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error procesando el archivo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Dashboard General</h1>
          <p>Resumen de actividad y métricas clave de tus clientes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {financialData && (
            <button className="btn-secondary flex-btn" onClick={() => window.print()}>
              Descargar PDF
            </button>
          )}
          <button className="btn-primary flex-btn" onClick={handleUpload} disabled={isUploading}>
            <Upload size={20} />
            {isUploading ? 'Procesando...' : 'Subir Excel Financiero'}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card glass">
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-details">
                <span className="stat-title">{stat.title}</span>
                <span className="stat-value">{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-content">
        <div className="main-panel glass">
          <div className="panel-header">
            <h3>Análisis Financiero Reciente</h3>
            <button className="btn-secondary">Ver Todos</button>
          </div>
          <div className="panel-body">
            {!financialData ? (
              <div className="empty-state">
                <TrendingUp size={48} className="empty-icon" />
                <p>Selecciona un cliente o sube un archivo Excel para comenzar el análisis.</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <h4>Estructura de Capital (Ejemplo)</h4>
                <ResponsiveContainer>
                  <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                    <Bar dataKey="value" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="side-panel glass">
          <div className="panel-header">
            <h3>Actividad Reciente</h3>
          </div>
          <div className="panel-body">
            <ul className="activity-list">
              <li className="activity-item">
                <div className="activity-dot new"></div>
                <div className="activity-text">
                  <p><strong>Empresa XYZ S.A.</strong> subió Estado de Resultados 2023</p>
                  <span>Hace 2 horas</span>
                </div>
              </li>
              <li className="activity-item">
                <div className="activity-dot"></div>
                <div className="activity-text">
                  <p>Reporte de Valuación generado para <strong>Distribuidora El Salvador</strong></p>
                  <span>Ayer, 15:30</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileText({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
