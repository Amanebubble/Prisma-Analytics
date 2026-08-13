import { useState, useEffect, useRef } from 'react';
import { X, Calculator, Sliders, NotebookPen, CalendarClock } from 'lucide-react';
import 'mathlive';
import { ComputeEngine } from '@cortex-js/compute-engine';
import './ToolkitDrawer.css';

// Tipos globales movidos a src/mathlive.d.ts

interface ToolkitDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'calculadora' | 'escenarios' | 'notas' | 'calendario';

export default function ToolkitDrawer({ isOpen, onClose }: ToolkitDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('calculadora');
  
  const ce = new ComputeEngine();
  const [mathInput, setMathInput] = useState<string>('');
  const [mathResult, setMathResult] = useState<string>('');
  const mfRef = useRef<any>(null);

  useEffect(() => {
    if (mfRef.current) {
      mfRef.current.addEventListener('input', (ev: any) => {
        const val = ev.target.value;
        setMathInput(val);
        try {
          // Evaluar la expresión LaTeX usando ComputeEngine
          const expr = ce.parse(val);
          const res = expr.evaluate().value;
          if (res !== undefined && res !== null && !Number.isNaN(res)) {
            setMathResult(res.toString());
          } else {
            setMathResult('');
          }
        } catch (e) {
          setMathResult('');
        }
      });
    }
  }, []);

  // Estados para la Calculadora de IVA El Salvador
  const [valorInput, setValorInput] = useState<string>('');
  const [tipoCalculo, setTipoCalculo] = useState<'masIVA' | 'menosIVA'>('masIVA');
  
  const calcularIVA = () => {
    const val = parseFloat(valorInput) || 0;
    if (tipoCalculo === 'masIVA') {
      return {
        neto: val,
        iva: val * 0.13,
        total: val * 1.13
      };
    } else {
      return {
        neto: val / 1.13,
        iva: val - (val / 1.13),
        total: val
      };
    }
  };

  // Estados para Simulador What-If (Usando datos base ficticios para la demo)
  const [ventasVar, setVentasVar] = useState<number>(0);
  const [costosVar, setCostosVar] = useState<number>(0);
  const baseVentas = 100000;
  const baseCostos = 60000;
  
  const simVentas = baseVentas * (1 + (ventasVar / 100));
  const simCostos = baseCostos * (1 + (costosVar / 100));
  const simUtilidad = simVentas - simCostos;
  const baseUtilidad = baseVentas - baseCostos;

  const ivaResult = calcularIVA();
  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <>
      {/* Overlay oscuro */}
      {isOpen && <div className="toolkit-overlay" onClick={onClose}></div>}
      
      {/* Panel Lateral */}
      <div className={`toolkit-drawer ${isOpen ? 'open' : ''}`}>
        
        <div className="toolkit-header">
          <div className="header-title">
            <span className="toolkit-emoji">🧰</span>
            <h2>Audit Toolkit</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="toolkit-tabs">
          <button className={`t-tab ${activeTab === 'calculadora' ? 'active' : ''}`} onClick={() => setActiveTab('calculadora')}>
            <Calculator size={18} />
          </button>
          <button className={`t-tab ${activeTab === 'escenarios' ? 'active' : ''}`} onClick={() => setActiveTab('escenarios')}>
            <Sliders size={18} />
          </button>
          <button className={`t-tab ${activeTab === 'notas' ? 'active' : ''}`} onClick={() => setActiveTab('notas')}>
            <NotebookPen size={18} />
          </button>
          <button className={`t-tab ${activeTab === 'calendario' ? 'active' : ''}`} onClick={() => setActiveTab('calendario')}>
            <CalendarClock size={18} />
          </button>
        </div>

        <div className="toolkit-content">
          {activeTab === 'calculadora' && (
            <div className="tool-section fade-in">
              <h3>Calculadora Tributaria (El Salvador)</h3>
              <p className="tool-desc">Extrae o suma el 13% de IVA al instante.</p>
              
              <div className="iva-calculator">
                <div className="input-group">
                  <label>Monto Base ($)</label>
                  <input 
                    type="number" 
                    value={valorInput} 
                    onChange={(e) => setValorInput(e.target.value)} 
                    placeholder="0.00"
                    className="calc-input"
                  />
                </div>
                
                <div className="toggle-group">
                  <button 
                    className={`toggle-btn ${tipoCalculo === 'masIVA' ? 'active' : ''}`}
                    onClick={() => setTipoCalculo('masIVA')}
                  >
                    + Agregar IVA (13%)
                  </button>
                  <button 
                    className={`toggle-btn ${tipoCalculo === 'menosIVA' ? 'active' : ''}`}
                    onClick={() => setTipoCalculo('menosIVA')}
                  >
                    - Extraer IVA (13%)
                  </button>
                </div>

                <div className="calc-results">
                  <div className="result-row">
                    <span>Valor Neto</span>
                    <span>{formatCurrency(ivaResult.neto)}</span>
                  </div>
                  <div className="result-row">
                    <span>IVA (13%)</span>
                    <span className="text-blue">{formatCurrency(ivaResult.iva)}</span>
                  </div>
                  <div className="result-row total">
                    <span>Valor Total</span>
                    <span>{formatCurrency(ivaResult.total)}</span>
                  </div>
                </div>
              </div>

              <h3 className="mt-6">Calculadora Estándar (MathLive)</h3>
              <p className="tool-desc">Escribe sumas, restas, multiplicaciones y divisiones.</p>
              <div className="mathlive-container">
                {/* @ts-ignore */}
                <math-field 
                  ref={mfRef} 
                  class="math-input-field"
                >
                  {mathInput}
                {/* @ts-ignore */}
                </math-field>
                <div className="math-result">
                  <span>Resultado:</span>
                  <span className="res-value">{mathResult ? mathResult : '0'}</span>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'escenarios' && (
            <div className="tool-section fade-in">
              <h3>Simulador "What-If"</h3>
              <p className="tool-desc">Analiza la sensibilidad de las ganancias ante cambios en la operación.</p>
              
              <div className="scenario-simulator">
                <div className="slider-group">
                  <div className="slider-header">
                    <label>Variación en Ventas</label>
                    <span className={ventasVar > 0 ? 'text-green' : ventasVar < 0 ? 'text-orange' : ''}>
                      {ventasVar > 0 ? '+' : ''}{ventasVar}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" max="50" step="1" 
                    value={ventasVar} 
                    onChange={(e) => setVentasVar(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                <div className="slider-group mt-4">
                  <div className="slider-header">
                    <label>Variación en Costos y Gastos</label>
                    <span className={costosVar < 0 ? 'text-green' : costosVar > 0 ? 'text-orange' : ''}>
                      {costosVar > 0 ? '+' : ''}{costosVar}%
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="-50" max="50" step="1" 
                    value={costosVar} 
                    onChange={(e) => setCostosVar(Number(e.target.value))}
                    className="slider-input"
                  />
                </div>

                <div className="calc-results mt-4">
                  <div className="result-row">
                    <span>Ventas Proyectadas</span>
                    <span>{formatCurrency(simVentas)}</span>
                  </div>
                  <div className="result-row">
                    <span>Costos Proyectados</span>
                    <span>{formatCurrency(simCostos)}</span>
                  </div>
                  <div className="result-row total">
                    <span>Utilidad Simulada</span>
                    <span className={simUtilidad > 0 ? 'text-green' : 'text-orange'}>
                      {formatCurrency(simUtilidad)}
                    </span>
                  </div>
                  
                  <div className="insight-box">
                    {simUtilidad < 0 ? 
                      "⚠️ Alerta: La empresa entraría en pérdida operativa." : 
                      simUtilidad > baseUtilidad ? 
                      "✅ El escenario mejora la rentabilidad actual." : 
                      "📉 El escenario reduce las ganancias, pero se mantiene a flote."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notas' && (
            <div className="tool-section fade-in">
              <h3>Papeles de Trabajo</h3>
              <p className="tool-desc">Bloc de notas anclado a tus revisiones.</p>
              <textarea 
                className="notes-area" 
                placeholder="Escribe aquí las observaciones de la auditoría actual..."
                rows={10}
              ></textarea>
            </div>
          )}

          {activeTab === 'calendario' && (
            <div className="tool-section fade-in">
              <h3>Vencimientos Fiscales</h3>
              <div className="coming-soon-box">
                <p>Cronómetro para F-07 y F-14 próximamente.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
