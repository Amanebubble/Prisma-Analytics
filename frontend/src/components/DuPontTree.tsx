import './DuPontTree.css';

interface DuPontProps {
  data: {
    utilidadNeta: number;
    ventas: number;
    activos: number;
    patrimonio: number;
  };
}

export default function DuPontTree({ data }: DuPontProps) {
  // Cálculos DuPont
  const margenNeto = (data.utilidadNeta / data.ventas) * 100;
  const rotacionActivos = data.ventas / data.activos;
  const apalancamiento = data.activos / data.patrimonio;
  const roe = (margenNeto / 100) * rotacionActivos * apalancamiento * 100;

  const formatNumber = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="dupont-container">
      <h3 className="dupont-title">Desglose DuPont (ROE)</h3>
      
      <div className="dupont-tree">
        {/* Nivel 1: ROE */}
        <div className="dupont-node root">
          <div className="node-label">Rentabilidad Financiera (ROE)</div>
          <div className="node-value">{formatNumber(roe)}%</div>
        </div>

        <div className="dupont-branches root-branches">
          <div className="branch-line"></div>
        </div>

        {/* Nivel 2: Los 3 Pilares */}
        <div className="dupont-level">
          
          <div className="dupont-column">
            <div className="dupont-node">
              <div className="node-label">Margen Neto</div>
              <div className="node-value">{formatNumber(margenNeto)}%</div>
              <div className="node-formula">Utilidad Neta / Ventas</div>
            </div>
          </div>

          <div className="dupont-operator">✕</div>

          <div className="dupont-column">
            <div className="dupont-node">
              <div className="node-label">Rotación de Activos</div>
              <div className="node-value">{formatNumber(rotacionActivos)}x</div>
              <div className="node-formula">Ventas / Activos Totales</div>
            </div>
          </div>

          <div className="dupont-operator">✕</div>

          <div className="dupont-column">
            <div className="dupont-node highlight">
              <div className="node-label">Apalancamiento</div>
              <div className="node-value">{formatNumber(apalancamiento)}x</div>
              <div className="node-formula">Activos Totales / Patrimonio</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
