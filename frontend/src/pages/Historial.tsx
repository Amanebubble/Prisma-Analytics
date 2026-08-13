import { Clock, CheckCircle, FileText, AlertCircle, UploadCloud, DownloadCloud } from 'lucide-react';
import './Historial.css';

const mockHistory = [
  {
    id: 1,
    date: '2026-08-13',
    time: '14:30',
    type: 'upload',
    title: 'Se subieron Estados Financieros (Balance)',
    description: 'El sistema de IA mapeó 45 cuentas bajo estándar NIIF. No se encontraron descuadres matemáticos.',
    user: 'Juan (Auditor Sr.)',
  },
  {
    id: 2,
    date: '2026-08-12',
    time: '09:15',
    type: 'audit',
    title: 'Cruce de IVA F-07 completado',
    description: 'Se validaron $14,500.00 en compras. No hubo inconsistencias con los anexos presentados.',
    user: 'Ana (Asistente)',
  },
  {
    id: 3,
    date: '2026-08-10',
    time: '16:45',
    type: 'alert',
    title: 'Alerta de Bancarización detectada',
    description: 'Se detectaron 2 facturas de proveedores por encima de $25,000 sin respaldo bancario adjunto. Requiere revisión de Art. 62-A.',
    user: 'Sistema PRISMA',
  },
  {
    id: 4,
    date: '2026-08-05',
    time: '11:00',
    type: 'report',
    title: 'Generación de Reporte Ejecutivo PDF',
    description: 'Se descargó el reporte de cierre del mes de Julio 2026.',
    user: 'Juan (Auditor Sr.)',
  }
];

export default function Historial() {
  const getIcon = (type: string) => {
    switch(type) {
      case 'upload': return <UploadCloud size={18} />;
      case 'audit': return <CheckCircle size={18} />;
      case 'alert': return <AlertCircle size={18} />;
      case 'report': return <DownloadCloud size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="historial-page animate-fade-in">
      <div className="page-header header-with-action">
        <div>
          <h1>Historial de Auditoría</h1>
          <p>Trazabilidad completa de las acciones realizadas en la empresa actual.</p>
        </div>
        <button className="btn-secondary">
          <Clock size={18} />
          Filtrar por Fecha
        </button>
      </div>

      <div className="timeline-container glass">
        <ul className="timeline">
          {mockHistory.map((item) => (
            <li key={item.id} className="timeline-item">
              <div className="timeline-date">
                <span className="date-badge">{item.date}</span>
                <span className="time-text">{item.time}</span>
              </div>
              
              <div className={`timeline-icon ${item.type}`}>
                {getIcon(item.type)}
              </div>
              
              <div className="timeline-content">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span className="timeline-user">Por: {item.user}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
