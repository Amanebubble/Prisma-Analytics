import { useState, useEffect, useRef } from 'react';
import { FileCheck2, ArrowLeft, Save, Download, Printer, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, PenLine, Landmark, ShieldCheck } from 'lucide-react';
import CanvasEditor from '../components/CanvasEditor';
import './Dictamen.css';

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Bloques de párrafos estandarizados NIA que el auditor puede insertar con un clic.
const NIA_PARAGRAPHS: Record<string, { title: string; body: string[] }> = {
  opinion_salvedades: {
    title: '1. Opinión con Salvedades',
    body: [
      'Hemos auditado los estados financieros adjuntos de la empresa, que comprenden el balance general, el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo al cierre del ejercicio, y las notas a los estados financieros.\n',
      'En nuestra opinión, excepto por los efectos del asunto descrito en el párrafo de "Fundamento de la Opinión con Salvedades", los estados financieros presentan razonablemente, en todos los aspectos materiales, la situación financiera de la entidad, de conformidad con las Normas Internacionales de Información Financiera para PYMES.\n'
    ]
  },
  enfasis: {
    title: '2. Párrafo de Énfasis — Empresa en Funcionamiento (NIA 706)',
    body: [
      'Llamamos la atención sobre la nota X de los estados financieros, que indica que la entidad ha incurrido en pérdidas significativas y su capacidad para continuar como empresa en funcionamiento depende de la obtención de financiamiento adicional. Este asunto no modifica nuestra opinión.\n'
    ]
  },
  kam: {
    title: '3. Cuestiones Clave de Auditoría (KAM — NIA 701)',
    body: [
      'Las cuestiones clave de auditoría son aquellas que, según nuestro juicio profesional, fueron de mayor significatividad en nuestra auditoría del ejercicio. Incluimos la valoración de inventarios, cuya estimación implica juicios significativos por parte de la administración.\n'
    ]
  },
  resp_admin: {
    title: '4. Responsabilidades de la Administración',
    body: [
      'La administración de la entidad es responsable de la preparación y presentación razonable de los estados financieros de conformidad con las NIIF para PYMES, así como del control interno que considere necesario para permitir la preparación de estos estados libres de incorrecciones materiales.\n'
    ]
  },
  resp_auditor: {
    title: '5. Responsabilidades del Auditor',
    body: [
      'Nuestra responsabilidad es expresar una opinión sobre los estados financieros con base en nuestra auditoría. La auditoría se realizó de conformidad con las Normas Internacionales de Auditoría aplicables en El Salvador.\n'
    ]
  },
  cierre_legal: {
    title: '6. Párrafo de Cierre Legal',
    body: [
      'El presente informe se emite en cumplimiento de lo establecido en el Código de Comercio y el Código Tributario de la República de El Salvador.\n'
    ]
  }
};

const NIA_VARIABLES: Record<string, (t: any) => string> = {
  nombre_empresa: (t) => t?.company || '',
  periodo: (t) => t?.periodLabel || '',
  monto_activo: (t) => formatMoney(t?.totals?.assets),
  monto_pasivo: (t) => formatMoney(t?.totals?.liabilities),
  monto_patrimonio: (t) => formatMoney(t?.totals?.equity),
  resultado: (t) => formatMoney(t?.totals?.netIncome)
};

function getQuery() {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.split('?')[1] || '');
  return {
    opinionKey: params.get('opinionKey') || 'limpia',
    clientId: Number(params.get('clientId')),
    periodYear: Number(params.get('periodYear')),
    periodMonth: Number(params.get('periodMonth')),
    company: params.get('company') || ''
  };
}

export default function DictamenEditor() {
  const query = getQuery();
  const [template, setTemplate] = useState<any | null>(null);
  const [editorContent, setEditorContent] = useState<any>(null);
  const [firmante, setFirmante] = useState('');
  const [nombreAuditor, setNombreAuditor] = useState('');
  const [regCvp, setRegCvp] = useState('');
  const [regDgii, setRegDgii] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [incluyeEnfasis, setIncluyeEnfasis] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        const res = await ipcRenderer.invoke('get-opinion-template', {
          opinionKey: query.opinionKey,
          clientId: query.clientId,
          periodYear: query.periodYear,
          periodMonth: query.periodMonth
        });
        if (res?.success) {
          setTemplate(res);
          setEditorContent(res.blocks);
        }
      } catch (error: any) {
        console.error('Error cargando plantilla en el editor', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [query.opinionKey, query.clientId, query.periodYear, query.periodMonth]);

  // Ejecutar un comando del editor de forma segura.
  const runCmd = (fn: (cmd: any) => void) => {
    const cmd = editorRef.current?.command;
    if (!cmd) return;
    try { fn(cmd); } catch (e) { console.error('Comando del editor falló', e); }
  };

  const bold = () => runCmd(c => c.executeBold());
  const italic = () => runCmd(c => c.executeItalic());
  const underline = () => runCmd(c => c.executeUnderline());
  const align = (value: string) => runCmd(c => c.executeRowFlex(value));
  const bulletList = () => runCmd(c => c.executeList('bulleted'));
  const numberList = () => runCmd(c => c.executeList('number'));

  const [niaChecklist, setNiaChecklist] = useState<any[] | null>(null);

  const insertParagraph = (key: string) => {
    const cmd = editorRef.current?.command;
    const para = NIA_PARAGRAPHS[key];
    if (!cmd || !para) return;
    const bloques = [
      { value: '\n\n', size: 14 },
      { value: para.title, size: 14, bold: true },
      ...para.body.map(texto => ({ value: texto, size: 12 }))
    ];
    try { cmd.executeAppendElementList(bloques as any); } catch (e) { console.error('No fue posible insertar el párrafo', e); }
  };

  const insertVariable = (key: string) => {
    const cmd = editorRef.current?.command;
    const resolver = NIA_VARIABLES[key];
    if (!cmd || !resolver) return;
    const value = resolver(template);
    try { cmd.executeAppendElementList([{ value, size: 12 }] as any); } catch (e) { console.error('No fue posible insertar la variable', e); }
  };

  const insertTableAjustes = () => {
    const cmd = editorRef.current?.command;
    if (!cmd) return;
    try {
      cmd.executeAppendElementList([
        { value: '\n\nTABLA A: Resumen de Ajustes Propuestos', size: 12, bold: true, rowFlex: 'center' },
        { value: '\n(NC = No corregido · C = Corregido)', size: 9, rowFlex: 'center' }
      ] as any);
      // Tabla nativa: 5 filas (encabezado + 4), 5 columnas.
      cmd.executeInsertTable(5, 5);
    } catch (e) {
      // Fallback: tabla en texto con columnas.
      const filas = [
        ['CUENTA', 'SEGÚN CONTABILIDAD', 'AJUSTES', 'SEGÚN AUDITORÍA', 'DIFERENCIA'],
        ['', '0.00', '0.00', '0.00', '0.00'],
        ['', '0.00', '0.00', '0.00', '0.00'],
        ['', '0.00', '0.00', '0.00', '0.00']
      ];
      const bloques = [
        { value: '\n\nTABLA A: Resumen de Ajustes Propuestos', size: 12, bold: true, rowFlex: 'center' },
        ...filas.map(fila => ({ value: fila.map((c, i) => `${c.padEnd(i === 0 ? 22 : 18)}`).join(''), size: 10, rowFlex: 'left' }))
      ];
      try { cmd.executeAppendElementList(bloques as any); } catch (e2) { console.error('No fue posible insertar la tabla', e2); }
    }
  };

  const insertSalvedad = () => {
    const cmd = editorRef.current?.command;
    if (!cmd) return;
    try {
      cmd.executeAppendElementList([
        { value: '\n\nSalvedad cuantificada sobre el resultado del ejercicio', size: 13, bold: true },
        { value: `La incorrección afecta el resultado del ejercicio en ${formatMoney(template?.totals?.netIncome)} y los correspondientes totales del activo y patrimonio.`, size: 12 }
      ] as any);
    } catch (e) { console.error('No fue posible insertar la salvedad', e); }
  };

  const getBlocks = (): any[] => {
    const content = editorContent;
    if (Array.isArray(content)) return content;
    return content?.main || [];
  };

  const validateNia = () => {
    const blocks = getBlocks();
    const fullText = blocks.map((b: any) => String(b.value || '')).join(' ').toLowerCase();
    const checks = [
      { key: 'Encabezado del informe', done: /informe del auditor|dictamen|auditor independiente/i.test(fullText) },
      { key: 'Destinatario', done: /a los accionistas|al consejo|a la junta directiva|señores(?:es)? accionistas|directorio/i.test(fullText) },
      { key: 'Párrafo de Opinión', done: /opinión|hemos auditado|en nuestra opinión/i.test(fullText) },
      { key: 'Fundamento de la Opinión', done: /fundamento de la opinión|.en nuestra opinión, excepto|nuestra auditoría se realizó de conformidad/i.test(fullText) },
      { key: 'Responsabilidades de la Administración', done: /responsabilidades de la administración|la administración de/i.test(fullText) },
      { key: 'Responsabilidades del Auditor', done: /responsabilidades del auditor|nuestra responsabilidad/i.test(fullText) },
      { key: 'Empresa en Funcionamiento', done: /empresa en funcionamiento|negocio en marcha/i.test(fullText) || !template?.totals || template.totals.netIncome >= 0 },
      { key: 'Párrafo de Énfasis (NIA 706)', done: incluyeEnfasis ? /párrafo de énfasis|llamamos la atención/i.test(fullText) : true },
      { key: 'Firma y acreditación', done: /registro cvpcpa|consejo de vigilancia|contadores públicos/i.test(fullText) || Boolean(regCvp || regDgii) }
    ];
    setNiaChecklist(checks);
  };

  const insertFirma = () => {
    const cmd = editorRef.current?.command;
    if (!cmd) return;
    const fecha = fechaEmision ? new Date(`${fechaEmision}T00:00:00`).toLocaleDateString('es-SV', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-SV');
    const bloques = [
      { value: '\n\n', size: 14 },
      { value: '____________________________', size: 12, rowFlex: 'center' },
      { value: nombreAuditor || 'Nombre del Auditor', size: 12, bold: true, rowFlex: 'center' },
      { value: 'Contadores Públicos e Independientes', size: 11, rowFlex: 'center' },
      { value: `Reg. CVPCPA No. ${regCvp || 'XXXX'} | Reg. Auditor Fiscal No. ${regDgii || 'XXXX'}`, size: 10, rowFlex: 'center' },
      { value: `San Salvador, El Salvador, ${fecha}`, size: 10, rowFlex: 'center' }
    ];
    try {
      cmd.executeAppendElementList(bloques as any);
    } catch (e) {
      try { cmd.executeInsertElementList(bloques as any); } catch (e2) { console.error('No fue posible insertar la firma', e2); }
    }
  };

  const saveDraft = async () => {
    const content = {
      blocks: editorContent,
      opinion: template?.opinion,
      company: template?.company,
      periodLabel: template?.periodLabel,
      firmante: nombreAuditor,
      regCvp,
      regDgii,
      fechaEmision,
      incluyeEnfasis,
      updatedAt: new Date().toISOString()
    };
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('save-report-draft', {
        clientId: query.clientId,
        periodYear: query.periodYear,
        periodMonth: query.periodMonth,
        draftContent: content
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      alert('No fue posible guardar el dictamen: ' + error.message);
    }
  };

  const closeWindow = async () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('close-opinion-window');
    } catch (error) {
      window.close();
    }
  };

  const exportPDF = () => {
    try {
      if (editorRef.current && typeof (editorRef.current as any).print === 'function') {
        (editorRef.current as any).print();
      } else if (editorRef.current && typeof (editorRef.current as any).exportPDF === 'function') {
        (editorRef.current as any).exportPDF(`Dictamen-${template?.company || 'auditoria'}-${template?.periodLabel || ''}.pdf`);
      } else {
        window.print();
      }
    } catch (error) {
      window.print();
    }
  };

  const printCopy = () => {
    try { window.print(); } catch (error) { /* noop */ }
  };

  const inputStyle = { width: '100%', marginTop: '0.4rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' };

  return (
    <div className="dictamen-window-root">
      <div className="dictamen-window-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <FileCheck2 size={22} color="var(--accent-primary)" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Editor de Dictamen — {template?.opinion?.label || 'Cargando...'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {template?.company || query.company} · Período {template?.periodLabel || query.periodYear}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={closeWindow}><ArrowLeft size={16} /> Volver a la app</button>
          <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> Exportar como PDF</button>
          <button className="btn-secondary" onClick={printCopy}><Printer size={16} /> Imprimir</button>
          <button className="btn-primary" onClick={saveDraft}><Save size={16} /> {saved ? 'Guardado' : 'Guardar borrador'}</button>
        </div>
      </div>

      <div className="dictamen-toolbar">
        <div className="tb-group">
          <span className="tb-label">Formato</span>
          <button className="tb-btn" onClick={bold} title="Negrita"><Bold size={16} /></button>
          <button className="tb-btn" onClick={italic} title="Cursiva"><Italic size={16} /></button>
          <button className="tb-btn" onClick={underline} title="Subrayado"><Underline size={16} /></button>
        </div>
        <div className="tb-group">
          <span className="tb-label">Alinear</span>
          <button className="tb-btn" onClick={() => align('left')} title="Izquierda"><AlignLeft size={16} /></button>
          <button className="tb-btn" onClick={() => align('center')} title="Centro"><AlignCenter size={16} /></button>
          <button className="tb-btn" onClick={() => align('right')} title="Derecha"><AlignRight size={16} /></button>
          <button className="tb-btn" onClick={() => align('justify')} title="Justificar"><AlignJustify size={16} /></button>
        </div>
        <div className="tb-group">
          <span className="tb-label">Listas</span>
          <button className="tb-btn" onClick={bulletList} title="Viñetas"><List size={16} /></button>
          <button className="tb-btn" onClick={numberList} title="Numerada"><ListOrdered size={16} /></button>
        </div>
        <div className="tb-group">
          <span className="tb-label">Párrafo NIA</span>
          <select className="tb-btn" defaultValue="" onChange={(e) => { if (e.target.value) { insertParagraph(e.target.value); e.target.value = ''; } }} style={{ cursor: 'pointer' }}>
            <option value="" disabled>Insertar...</option>
            {Object.entries(NIA_PARAGRAPHS).map(([key, para]) => <option key={key} value={key}>{para.title}</option>)}
          </select>
        </div>
        <div className="tb-group">
          <span className="tb-label">Variable</span>
          <select className="tb-btn" defaultValue="" onChange={(e) => { if (e.target.value) { insertVariable(e.target.value); e.target.value = ''; } }} style={{ cursor: 'pointer' }}>
            <option value="" disabled>Insertar...</option>
            {Object.keys(NIA_VARIABLES).map(key => <option key={key} value={key}>{"{{" + key + "}}"}</option>)}
          </select>
        </div>
        <div className="tb-group">
          <span className="tb-label">Insertar</span>
          <button className="tb-btn" onClick={insertTableAjustes} title="Insertar tabla financiera de ajustes"><FileCheck2 size={16} /> Tabla de Ajustes</button>
          <button className="tb-btn" onClick={insertSalvedad} title="Insertar salvedad cuantificada"><PenLine size={16} /> Salvedad</button>
        </div>
        <div className="tb-group">
          <button className="tb-btn" onClick={validateNia} title="Validar estructura NIA"><ShieldCheck size={16} /> Validar NIA</button>
          <button className="tb-btn" onClick={insertFirma} title="Insertar Bloque de Firma Legítima"><PenLine size={16} /> Firma</button>
        </div>
      </div>

      <div className="dictamen-window-body">
        <div className="editor-area">
          <div className="a4-preview-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Generando plantilla...</div>
            ) : (
              <CanvasEditor key={`${query.opinionKey}-${query.periodYear}-${query.periodMonth}`} initialContent={editorContent} onChange={(c) => setEditorContent(c)} onInit={(editor) => { editorRef.current = editor; }} />
            )}
          </div>
        </div>
        <div className="editor-sidebar" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          {template && (
            <>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>Datos del dictamen</h4>
              <div style={{ fontSize: '0.85rem' }}>
                <div>Empresa: <strong>{template.company}</strong></div>
                <div>Período: <strong>{template.periodLabel}</strong></div>
                <div>Activo: <strong>${Number(template.totals?.assets || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
                <div>Pasivo: <strong>${Number(template.totals?.liabilities || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
                <div>Patrimonio: <strong>${Number(template.totals?.equity || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
                <div>Resultado: <strong>${Number(template.totals?.netIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
              </div>

              <hr style={{ margin: '0.75rem 0', borderColor: 'var(--border-color)' }} />
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Acreditación profesional (El Salvador)</h4>

              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Nombre del auditor / Firma Auditada</label>
              <input value={nombreAuditor} onChange={e => setNombreAuditor(e.target.value)} placeholder="Nombre del auditor" style={inputStyle} />

              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Nombre de la firma</label>
              <input value={firmante} onChange={e => setFirmante(e.target.value)} placeholder="Nombre de la firma auditora" style={inputStyle} />

              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>No. Registro CVPCPA</label>
              <input value={regCvp} onChange={e => setRegCvp(e.target.value)} placeholder="Reg. CVPCPA" style={inputStyle} />

              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>No. Registro Auditor Fiscal DGII</label>
              <input value={regDgii} onChange={e => setRegDgii(e.target.value)} placeholder="Reg. Auditor Fiscal (MH)" style={inputStyle} />

              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Fecha de emisión del dictamen</label>
              <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} style={inputStyle} />

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginTop: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={incluyeEnfasis} onChange={e => setIncluyeEnfasis(e.target.checked)} />
                Incluye Párrafo de Énfasis (NIA 706)
              </label>

              <button className="btn-secondary" style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }} onClick={insertFirma}>
                <Landmark size={16} /> Insertar Bloque de Firma Legítima
              </button>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Inserta al final del documento la firma en el formato estándar salvadoreño.
              </p>

              <hr style={{ margin: '0.9rem 0', borderColor: 'var(--border-color)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Estructura NIA</h4>
                <button className="btn-secondary" onClick={validateNia}>Validar</button>
              </div>
              {niaChecklist === null ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pulsa "Validar" para revisar los párrafos obligatorios según el tipo de opinión.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {niaChecklist.map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.78rem' }}>
                      <span style={{ color: item.done ? 'var(--success)' : 'var(--warning)' }}>{item.done ? '✓' : '○'}</span>
                      <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{item.key}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
