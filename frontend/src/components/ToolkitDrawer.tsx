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

type TabType = 'tributaria' | 'estandar' | 'notas' | 'calendario';

export default function ToolkitDrawer({ isOpen, onClose }: ToolkitDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tributaria');
  
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
          <button className={`t-tab ${activeTab === 'tributaria' ? 'active' : ''}`} onClick={() => setActiveTab('tributaria')} title="Calc. Tributaria">
            <Calculator size={18} />
          </button>
          <button className={`t-tab ${activeTab === 'estandar' ? 'active' : ''}`} onClick={() => setActiveTab('estandar')} title="Calc. Estándar">
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
          {activeTab === 'tributaria' && (
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
            </div>
          )}

          {activeTab === 'estandar' && (
            <div className="tool-section fade-in">
              <h3>Calculadora Estándar (MathLive)</h3>
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
