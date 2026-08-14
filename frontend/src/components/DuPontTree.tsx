import { useState } from 'react';
import { Info } from 'lucide-react';
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
  const [activeNode, setActiveNode] = useState<string | null>(null);

  // Cálculos DuPont
  const margenNeto = (data.utilidadNeta / data.ventas) * 100;
  const rotacionActivos = data.ventas / data.activos;
  const apalancamiento = data.activos / data.patrimonio;
  const roe = (margenNeto / 100) * rotacionActivos * apalancamiento * 100;

  const formatNumber = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);

  const toggleNode = (node: string) => {
    setActiveNode(activeNode === node ? null : node);
  };

  return (
    <div className="dupont-container glass">
      <div className="dupont-header">
        <h3 className="dupont-title">Desglose Interactivo DuPont (ROE)</h3>
        <p className="dupont-desc">Haz clic en los nodos para ver las variables que componen el cálculo.</p>
      </div>
      
      <div className="dupont-tree">
        {/* Nivel 1: ROE */}
        <div className="dupont-node root" onClick={() => toggleNode('roe')}>
          <div className="node-label">Rentabilidad Financiera (ROE)</div>
          <div className="node-value">{formatNumber(roe)}%</div>
          {activeNode === 'roe' && (
            <div className="node-details animate-fade-in">
              Indica cuánto beneficio genera la empresa por cada dólar de capital aportado por los accionistas.
            </div>
          )}
        </div>

        <div className="dupont-branches root-branches">
          <div className="branch-line"></div>
        </div>

        {/* Nivel 2: Los 3 Pilares */}
        <div className="dupont-level">
          
          <div className="dupont-column">
            <div className={`dupont-node clickable ${activeNode === 'margen' ? 'active' : ''}`} onClick={() => toggleNode('margen')}>
              <div className="node-header"><Info size={14}/> Eficiencia Operativa</div>
              <div className="node-label">Margen Neto</div>
              <div className="node-value text-blue">{formatNumber(margenNeto)}%</div>
              <div className="node-formula">Utilidad Neta / Ventas</div>
              
              {activeNode === 'margen' && (
                <div className="node-expanded animate-fade-in">
                  <div className="expanded-row">
                    <span>Utilidad Neta:</span>
                    <strong>{formatCurrency(data.utilidadNeta)}</strong>
                  </div>
                  <div className="expanded-row">
                    <span>Ventas:</span>
                    <strong>{formatCurrency(data.ventas)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dupont-operator">✕</div>

          <div className="dupont-column">
            <div className={`dupont-node clickable ${activeNode === 'rotacion' ? 'active' : ''}`} onClick={() => toggleNode('rotacion')}>
              <div className="node-header"><Info size={14}/> Eficiencia de Activos</div>
              <div className="node-label">Rotación de Activos</div>
              <div className="node-value text-green">{formatNumber(rotacionActivos)}x</div>
              <div className="node-formula">Ventas / Activos Totales</div>
              
              {activeNode === 'rotacion' && (
                <div className="node-expanded animate-fade-in">
                  <div className="expanded-row">
                    <span>Ventas:</span>
                    <strong>{formatCurrency(data.ventas)}</strong>
                  </div>
                  <div className="expanded-row">
                    <span>Activos:</span>
                    <strong>{formatCurrency(data.activos)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dupont-operator">✕</div>

          <div className="dupont-column">
            <div className={`dupont-node clickable highlight ${activeNode === 'apalancamiento' ? 'active' : ''}`} onClick={() => toggleNode('apalancamiento')}>
              <div className="node-header"><Info size={14}/> Riesgo Financiero</div>
              <div className="node-label">Apalancamiento</div>
              <div className="node-value text-orange">{formatNumber(apalancamiento)}x</div>
              <div className="node-formula">Activos Totales / Patrimonio</div>

              {activeNode === 'apalancamiento' && (
                <div className="node-expanded animate-fade-in">
                  <div className="expanded-row">
                    <span>Activos:</span>
                    <strong>{formatCurrency(data.activos)}</strong>
                  </div>
                  <div className="expanded-row">
                    <span>Patrimonio:</span>
                    <strong>{formatCurrency(data.patrimonio)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
