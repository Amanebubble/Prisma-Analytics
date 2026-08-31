import { useState, useEffect } from 'react';
import { FileCheck2, ArrowLeft, Save, Plus, Trash2, FileSpreadsheet, CheckCircle, AlertTriangle, Download, Scale } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CLASSIFICATIONS, STATE_TYPES, STATE_LABELS, PERIOD_NATURE, type TypeKey } from '../utils/classificationCatalog';
import './CrearDatos.css';

function getQuery() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  return { clientId: Number(params.get('clientId')) || 0 };
}

interface Row {
  name: string;
  type: TypeKey;
  detail: string;
  sign: 'sum' | 'sub';
  amount: string;
}

const STATES = ['balance', 'trial_balance', 'results', 'equity_changes', 'cash_flow'];

export default function CrearDatos() {
  const query = getQuery();
  const [tab, setTab] = useState<'financieros' | 'iva' | 'bancos'>('financieros');
  const [step, setStep] = useState<'select' | 'editing'>('select');
  const [stateType, setStateType] = useState<string>('balance');
  const [client, setClient] = useState<any | null>(null);
  const [company, setCompany] = useState('');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [periodMonth, setPeriodMonth] = useState(12);
  const [periodDay, setPeriodDay] = useState(31);
  const [periodStartMonth, setPeriodStartMonth] = useState(1);
  const [periodEndMonth, setPeriodEndMonth] = useState(12);
  const [rows, setRows] = useState<Row[]>([{ name: '', type: 'activo', detail: '', sign: 'sum', amount: '' }]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Estado IVA
  const [ivaCompany, setIvaCompany] = useState('');
  const [ivaPeriodMonth, setIvaPeriodMonth] = useState(new Date().getMonth() + 1);
  const [ivaPeriodYear, setIvaPeriodYear] = useState(new Date().getFullYear());
  const [iva, setIva] = useState({ ivaVentas: '', ivaCompras: '', ivaDebito: '', ivaCredito: '', ivaPagar: '', ivaRetenciones: '' });

  // Estado Bancos
  const [bankCompany, setBankCompany] = useState('');
  const [bankPeriodMonth, setBankPeriodMonth] = useState(new Date().getMonth() + 1);
  const [bankPeriodYear, setBankPeriodYear] = useState(new Date().getFullYear());
  const [bankRows, setBankRows] = useState<any[]>([{ date: '', description: '', debit: '', credit: '', balance: '' }]);

  const saveIva = async () => {
    if (!query.clientId) { setError('No hay cliente seleccionado.'); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const analysis = { success: true, sourceFilename: 'Manual', sourcePath: '', document: {
        empresa: ivaCompany, periodo: `${ivaPeriodYear}-${String(ivaPeriodMonth).padStart(2,'0')}`, moneda: 'USD', tipo_documento: 'iva_return',
        ventas: Number(iva.ivaVentas) || 0, compras: Number(iva.ivaCompras) || 0, debito_fiscal: Number(iva.ivaDebito) || 0, credito_fiscal: Number(iva.ivaCredito) || 0, impuesto_declarado: Number(iva.ivaPagar) || 0, retenciones: Number(iva.ivaRetenciones) || 0, documento_identificado: 'F-07', observaciones: []
      } };
      const res = await ipcRenderer.invoke('save-iva-document', { clientId: query.clientId, periodYear: ivaPeriodYear, periodMonth: ivaPeriodMonth, documentType: 'iva_return', analysis });
      if (res?.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); setError(''); }
      else setError(res?.error || 'No fue posible guardar.');
    } catch (e: any) { setError(e?.message || 'Error al guardar.'); }
  };

  const addBankRow = () => setBankRows(prev => [...prev, { date: '', description: '', debit: '', credit: '', balance: '' }]);
  const removeBankRow = (index: number) => setBankRows(prev => prev.filter((_, i) => i !== index));
  const updateBankRow = (index: number, field: string, value: string) => setBankRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));

  const bankTotals = bankRows.reduce((acc, r) => ({ debits: acc.debits + (Number(r.debit) || 0), credits: acc.credits + (Number(r.credit) || 0), final: Number(r.balance) || 0 }), { debits: 0, credits: 0, final: 0 });
  bankTotals.net = bankRows.length > 1 ? bankTotals.debits - bankTotals.credits : 0;
  const bankBalanced = Math.abs(bankTotals.final - (bankRows.length ? bankRows[bankRows.length - 1].balance : 0)) <= 0.01;

  const saveBank = async () => {
    if (!query.clientId) { setError('No hay cliente seleccionado.'); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const analysis = { success: true, sourceFilename: 'Manual', sourcePath: '', document: {
        empresa: bankCompany, periodo: `${bankPeriodYear}-${String(bankPeriodMonth).padStart(2,'0')}`, moneda: 'USD', banco: '', cuenta_bancaria: '',
        movimientos: bankRows.filter(r => r.date).map(r => ({ fecha: r.date, descripcion: r.description, referencia: '', debito: Number(r.debit) || 0, credito: Number(r.credit) || 0, saldo: Number(r.balance) || 0 })), observaciones: []
      } };
      const res = await ipcRenderer.invoke('save-bank-document', { clientId: query.clientId, periodYear: bankPeriodYear, periodMonth: bankPeriodMonth, analysis });
      if (res?.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); setError(''); }
      else setError(res?.error || 'No fue posible guardar.');
    } catch (e: any) { setError(e?.message || 'Error al guardar.'); }
  };

  const allowedTypes = STATE_TYPES[stateType] || ['activo', 'pasivo', 'patrimonio'];

  useEffect(() => {
    (async () => {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        if (query.clientId) {
          const clients = await ipcRenderer.invoke('get-clients');
          const found = (clients || []).find((c: any) => c.id === query.clientId);
          if (found) { setClient(found); setCompany(found.name); }
        }
      } catch (e) { console.warn(e); }
    })();
  }, []);

  const closeWindow = async () => {
    try { const { ipcRenderer } = (window as any).require('electron'); await ipcRenderer.invoke('close-data-entry-window'); }
    catch (e) { window.close(); }
  };

  const updateRow = (index: number, field: string, value: any) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const next = { ...r, [field]: value } as Row;
      if (field === 'type') { next.detail = ''; next.sign = 'sum'; }
      if (field === 'detail') {
        const cls = (CLASSIFICATIONS[r.type] || []).find(c => c.id === value);
        if (cls) next.sign = cls.sign;
      }
      return next;
    }));
  };

  const addRow = () => setRows(prev => [...prev, { name: '', type: allowedTypes[0] as TypeKey, detail: '', sign: 'sum', amount: '' }]);
  const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index));

  // Resolver cada fila a una cuenta con saldo con signo, tipo y grupo (jerarquía).
  const resolveRows = () => rows
    .filter(r => r.name.trim() && r.detail)
    .map(r => {
      const cls = (CLASSIFICATIONS[r.type] || []).find(c => c.id === r.detail)!;
      const amount = Number(r.amount) || 0;
      return { originalName: r.name.trim(), originalBalance: r.sign === 'sub' ? -amount : amount, niifCode: cls.niifCode, niifName: cls.label, rawAmount: amount, type: r.type, group: cls.group };
    });

  // Totales por naturaleza para el panel lateral.
  const groupTotals = rows.reduce((acc, r) => {
    const cls = (CLASSIFICATIONS[r.type] || []).find(c => c.id === r.detail);
    if (!cls) return acc;
    const amount = Number(r.amount) || 0;
    const value = r.sign === 'sub' ? -amount : amount;
    const code = cls.niifCode;
    if (code.startsWith('1')) acc.activos += value;
    else if (code.startsWith('2')) acc.pasivos += value;
    else if (code.startsWith('3')) acc.patrimonio += value;
    else if (code.startsWith('4')) acc.ingresos += value;
    else if (code.startsWith('5') || code.startsWith('6')) acc.gastos += value;
    return acc;
  }, { activos: 0, pasivos: 0, patrimonio: 0, ingresos: 0, gastos: 0 });

  const periodResult = groupTotals.ingresos - groupTotals.gastos;
  const expected = groupTotals.pasivos + groupTotals.patrimonio + (stateType === 'trial_balance' ? periodResult : 0);
  const balanced = Math.abs(groupTotals.activos - expected) <= 5;
  const isBalance = PERIOD_NATURE[stateType] === 'point_in_time';

  const generateHeader = () => {
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    if (isBalance) return `Al ${periodDay} de ${months[periodMonth - 1]} de ${periodYear}`;
    const lastDay = new Date(periodYear, periodEndMonth, 0).getDate();
    return `Por el período del 1 de ${months[periodStartMonth - 1]} de ${periodYear} al ${lastDay} de ${months[periodEndMonth - 1]} de ${periodYear}`;
  };

  const num = (n: number) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportExcel = () => {
    const data = resolveRows().map(r => ({ Cuenta: r.originalName, Clasificación: r.niifName, Monto: r.originalBalance }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estados');
    XLSX.writeFile(wb, `${STATE_LABELS[stateType]} ${company || ''} ${periodYear}.xlsx`);
  };

  const styleFor = (kind?: string) => ({
    fontStyle: (kind === 'section' || kind === 'group' || kind === 'subtotal' || kind === 'total') ? 'bold' : 'normal',
    fillColor: kind === 'section' ? [235, 245, 255] : undefined
  } as any);

  const groupByType = (type: string) => {
    const items = resolveRows().filter(r => r.type === type);
    if (!items.length) return null;
    const groups = Array.from(new Set(items.map(r => r.group)));
    return { items, groups };
  };

  const buildColumn = (types: string[], totals: Record<string, number>) => {
    const rows: any[] = [];
    for (const type of types) {
      const data = groupByType(type);
      if (!data) { rows.push({ label: `TOTAL ${type.toUpperCase()}`, amount: num(totals[type] || 0), kind: 'total' }); continue; }
      rows.push({ label: type.toUpperCase(), amount: '', kind: 'section' });
      for (const group of data.groups) {
        rows.push({ label: '  ' + group, amount: '', kind: 'group' });
        for (const it of data.items.filter(r => r.group === group)) rows.push({ label: '    ' + it.originalName, amount: num(it.originalBalance), kind: 'row' });
        rows.push({ label: '    Total ' + group, amount: num(data.items.filter(r => r.group === group).reduce((s, r) => s + r.originalBalance, 0)), kind: 'subtotal' });
      }
      rows.push({ label: '  Total ' + type.toUpperCase(), amount: num(totals[type] || 0), kind: 'total' });
    }
    return rows;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const center = pageWidth / 2;
    // Encabezado
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text((company || '').toUpperCase(), center, 16, { align: 'center' });
    doc.setFontSize(11);
    doc.text(STATE_LABELS[stateType] || 'Estado Financiero', center, 23, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(generateHeader(), center, 29, { align: 'center' });
    doc.text('(Valores expresados en Dólares de los Estados Unidos de América)', center, 34, { align: 'center' });

    // Columnas: en formatos de balance, doble columna (Activo | Pasivo y Patrimonio).
    const totalsMap: Record<string, number> = { activo: groupTotals.activos, pasivo: groupTotals.pasivos, patrimonio: groupTotals.patrimonio, ingreso: groupTotals.ingresos, gasto: groupTotals.gastos };
    const isBalance = stateType === 'balance' || stateType === 'trial_balance';
    let leftRows: any[]; let rightRows: any[];
    if (isBalance) {
      leftRows = buildColumn(['activo'], totalsMap);
      rightRows = [
        ...buildColumn(['pasivo'], totalsMap),
        ...buildColumn(['patrimonio'], totalsMap),
        { label: 'Total Pasivo y Patrimonio', amount: num(groupTotals.pasivos + groupTotals.patrimonio), kind: 'total' }
      ];
    } else {
      leftRows = buildColumn(['ingreso', 'gasto'], totalsMap);
      rightRows = [{ label: 'Resultado del Ejercicio', amount: num(groupTotals.ingresos - groupTotals.gastos), kind: 'total' }];
    }

    const max = Math.max(leftRows.length, rightRows.length);
    const body = [];
    for (let i = 0; i < max; i++) {
      const l = leftRows[i]; const r = rightRows[i];
      body.push([
        { content: l?.label || '', styles: { ...styleFor(l?.kind), halign: 'left' } },
        { content: l?.amount || '', styles: { halign: 'right' } },
        { content: r?.label || '', styles: { ...styleFor(r?.kind), halign: 'left' } },
        { content: r?.amount || '', styles: { halign: 'right' } }
      ]);
    }

    autoTable(doc, {
      startY: 42,
      margin: { left: 16, right: 16 },
      head: [['Concepto', 'Monto', 'Concepto', 'Monto']],
      body,
      theme: 'grid',
      styles: { cellPadding: 3, fontSize: 8.5 },
      headStyles: { fillColor: [14, 165, 233], halign: 'left' },
      columnStyles: { 1: { halign: 'right', cellWidth: 52 }, 3: { halign: 'right', cellWidth: 52 } }
    });

    // Firmas al pie de página, distribuidas a lo ancho (izquierda / centro / derecha).
    let baseY = (doc as any).lastAutoTable.finalY + 22;
    if (baseY > 700) { doc.addPage(); baseY = 100; }
    const lineW = 120;
    const leftX = 40;
    const centerX = center;
    const rightX = pageWidth - 40;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    // Representante Legal (izquierda)
    doc.line(leftX - lineW / 2, baseY, leftX + lineW / 2, baseY);
    doc.text('Representante Legal', leftX, baseY + 6, { align: 'center' });
    // Contador General (centro)
    doc.line(centerX - lineW / 2, baseY, centerX + lineW / 2, baseY);
    doc.text('Contador General', centerX, baseY + 6, { align: 'center' });
    // Auditor Externo (derecha)
    doc.line(rightX - lineW / 2, baseY, rightX + lineW / 2, baseY);
    doc.text('Auditor Externo', rightX, baseY + 6, { align: 'center' });

    doc.save(`${STATE_LABELS[stateType]} ${company || ''} ${periodYear}.pdf`);
  };

  const handleSave = async () => {
    if (!query.clientId) { setError('No hay cliente seleccionado.'); return; }
    const mapped = resolveRows();
    if (mapped.length === 0) { setError('Agrega al menos una cuenta con nombre y clasificación.'); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const endMonth = isBalance ? periodMonth : periodEndMonth;
      const lastDay = new Date(periodYear, endMonth, 0).getDate();
      const res = await ipcRenderer.invoke('save-financial-data', {
        clientId: query.clientId,
        periodYear, periodMonth: endMonth,
        mappedData: mapped,
        statementType: stateType,
        metadata: {
          company, periodYear, periodMonth: endMonth,
          periodStart: isBalance ? `${periodYear}-${String(periodMonth).padStart(2,'0')}-${String(periodDay).padStart(2,'0')}` : `${periodYear}-${String(periodStartMonth).padStart(2,'0')}-01`,
          periodEnd: isBalance ? null : `${periodYear}-${String(endMonth).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`,
          periodNature: PERIOD_NATURE[stateType]
        }
      });
      if (res?.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); setError(''); }
      else setError(res?.error || 'No fue posible guardar.');
    } catch (e: any) { setError(e?.message || 'Error al guardar.'); }
  };

  const pickState = (s: string) => { setStateType(s); setRows([{ name: '', type: (STATE_TYPES[s]?.[0] as TypeKey) || 'activo', detail: '', sign: 'sum', amount: '' }]); setStep('editing'); };

  return (
    <div className="data-entry-root">
      <div className="data-entry-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileCheck2 size={22} color="var(--accent-primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Creación de Datos</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{client?.name || 'Sin cliente'} · Creación manual</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={closeWindow}><ArrowLeft size={16} /> Volver a la app</button>
          {tab === 'financieros' && step === 'editing' && (
            <>
              <button className="btn-secondary" onClick={exportExcel}><FileSpreadsheet size={16} /> Excel</button>
              <button className="btn-secondary" onClick={exportPDF}><Download size={16} /> PDF</button>
            </>
          )}
          {tab === 'financieros' && step === 'editing' && <button className="btn-primary" onClick={handleSave}><Save size={16} /> {saved ? 'Guardado' : 'Guardar a la base'}</button>}
        </div>
      </div>

      <div className="data-entry-tabs">
        <button className={tab === 'financieros' ? 'active' : ''} onClick={() => setTab('financieros')}><FileSpreadsheet size={16} /> Estados Financieros</button>
        <button className={tab === 'iva' ? 'active' : ''} onClick={() => setTab('iva')}><FileCheck2 size={16} /> Declaración IVA</button>
        <button className={tab === 'bancos' ? 'active' : ''} onClick={() => setTab('bancos')}><Scale size={16} /> Estados Bancarios</button>
      </div>

      {tab === 'iva' && (
        <div className="data-entry-body animate-fade-in">
          <div className="de-toolbar">
            <strong style={{ fontSize: '1rem' }}>Declaración IVA</strong>
            <input value={ivaCompany} onChange={e => setIvaCompany(e.target.value)} placeholder="Nombre de la empresa" style={{ flex: 1, minWidth: '160px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            <select value={ivaPeriodMonth} onChange={e => setIvaPeriodMonth(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <input type="number" value={ivaPeriodYear} onChange={e => setIvaPeriodYear(Number(e.target.value))} placeholder="Año" style={{ width: '90px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>

          <div className="de-grid">
            <div className="iva-form">
              <div className="de-totals" style={{ marginBottom: '1rem' }}>
                <h4>Totalizadores de la declaración</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[
                    ['Ventas gravadas', 'ivaVentas'], ['Compras', 'ivaCompras'],
                    ['Débito fiscal', 'ivaDebito'], ['Crédito fiscal', 'ivaCredito'],
                    ['IVA a pagar', 'ivaPagar'], ['Retenciones', 'ivaRetenciones']
                  ].map(([label, key]) => (
                    <label key={key as string} style={{ fontSize: '0.8rem' }}>{label}
                      <input type="number" step="0.01" value={(iva as any)[key as string] || ''} onChange={e => setIva({ ...iva, [key as string]: e.target.value })} placeholder="0.00" style={{ width: '100%', marginTop: '0.2rem', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }} />
                    </label>
                  ))}
                </div>
              </div>
              <div className="de-balance-indicator">
                <span style={{ color: 'var(--success)' }}><CheckCircle size={16} /> Crédito fiscal esperado (compras × 13%): {num((Number(iva.ivaCompras) || 0) * 0.13)} — ingresado: {num(Number(iva.ivaCredito) || 0)}</span>
              </div>
            </div>
            <div className="de-totals">
              <h4>Resultado</h4>
              <div>IVA a pagar: <strong>{num((Number(iva.ivaDebito) || 0) - (Number(iva.ivaCredito) || 0))}</strong></div>
              <div>Con retenciones: <strong>{num((Number(iva.ivaDebito) || 0) - (Number(iva.ivaCredito) || 0) - (Number(iva.ivaRetenciones) || 0))}</strong></div>
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
              <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={saveIva}><Save size={16} /> Guardar declaración IVA</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'bancos' && (
        <div className="data-entry-body animate-fade-in">
          <div className="de-toolbar">
            <strong style={{ fontSize: '1rem' }}>Estado de Cuenta Bancario</strong>
            <input value={bankCompany} onChange={e => setBankCompany(e.target.value)} placeholder="Empresa" style={{ flex: 1, minWidth: '160px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            <select value={bankPeriodMonth} onChange={e => setBankPeriodMonth(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <input type="number" value={bankPeriodYear} onChange={e => setBankPeriodYear(Number(e.target.value))} placeholder="Año" style={{ width: '90px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
          </div>

          <div className="de-grid">
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
              <table className="de-table">
                <thead><tr><th>Fecha</th><th>Descripción</th><th>Débito</th><th>Crédito</th><th>Saldo</th><th></th></tr></thead>
                <tbody>
                  {bankRows.map((row, i) => (
                    <tr key={i}>
                      <td><input type="date" value={row.date} onChange={e => updateBankRow(i, 'date', e.target.value)} /></td>
                      <td><input value={row.description} onChange={e => updateBankRow(i, 'description', e.target.value)} placeholder="Descripción" /></td>
                      <td><input type="number" step="0.01" value={row.debit} onChange={e => updateBankRow(i, 'debit', e.target.value)} placeholder="0.00" /></td>
                      <td><input type="number" step="0.01" value={row.credit} onChange={e => updateBankRow(i, 'credit', e.target.value)} placeholder="0.00" /></td>
                      <td><input type="number" step="0.01" value={row.balance} onChange={e => updateBankRow(i, 'balance', e.target.value)} placeholder="0.00" /></td>
                      <td><button className="de-rm" onClick={() => removeBankRow(i)}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={addBankRow}><Plus size={16} /> Agregar movimiento</button>
            </div>
            <div className="de-totals">
              <h4>Conciliación de saldo</h4>
              <div>Total débitos: <strong>{num(bankTotals.debits)}</strong></div>
              <div>Total créditos: <strong>{num(bankTotals.credits)}</strong></div>
              <div>Saldo inicial + déb − créd: <strong>{num(bankTotals.net)}</strong></div>
              <div>Saldo final reportado: <strong>{num(bankTotals.final)}</strong></div>
              <div className={`de-balance-indicator ${bankBalanced ? '' : 'bad'}`}>{bankBalanced ? <span style={{ color: 'var(--success)' }}><CheckCircle size={16} /> Cuadra</span> : <span style={{ color: 'var(--danger)' }}><AlertTriangle size={16} /> No cuadra</span>}</div>
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{error}</p>}
              <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={saveBank}><Save size={16} /> Guardar estado bancario</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'financieros' && (step === 'select' ? (
        <div className="data-entry-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>¿Qué estado financiero crearás?</h2>
          <div className="state-select-grid">
            {STATES.map(s => (
              <button key={s} onClick={() => pickState(s)} className="state-select-btn">
                <Scale size={26} />
                <span>{STATE_LABELS[s]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="data-entry-body animate-fade-in">
          <div className="de-toolbar">
            <button className="btn-secondary" onClick={() => setStep('select')}><ArrowLeft size={15} /> Cambiar</button>
            <strong style={{ fontSize: '1rem' }}>{STATE_LABELS[stateType]}</strong>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Nombre de la empresa" style={{ flex: 1, minWidth: '160px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            {isBalance ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="number" min="1" max="31" value={periodDay} onChange={e => setPeriodDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} style={{ width: '60px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                <select value={periodMonth} onChange={e => setPeriodMonth(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <input type="number" value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))} style={{ width: '70px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <select value={periodStartMonth} onChange={e => setPeriodStartMonth(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <span>al</span>
                <select value={periodEndMonth} onChange={e => setPeriodEndMonth(Number(e.target.value))} style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <input type="number" value={periodYear} onChange={e => setPeriodYear(Number(e.target.value))} style={{ width: '70px', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              </div>
            )}
            <button className="btn-secondary" onClick={addRow}><Plus size={16} /> Agregar cuenta</button>
          </div>

          <div className={`de-balance-indicator ${balanced ? '' : 'bad'}`}>
            {balanced ? <span style={{ color: 'var(--success)' }}><CheckCircle size={16} /> {generateHeader()} · Encabezado NIIF válido</span> : <span style={{ color: 'var(--danger)' }}><AlertTriangle size={16} /> Descuadre: Activos {num(groupTotals.activos)} vs {num(expected)}</span>}
          </div>

          <div className="de-grid">
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)' }}>
              <table className="de-table">
                <thead><tr><th>Cuenta</th><th>Naturaleza</th><th>Detalle</th><th>Signo</th><th>Monto</th><th></th></tr></thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td><input value={row.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="Nombre de la cuenta" /></td>
                      <td><select value={row.type} onChange={e => updateRow(i, 'type', e.target.value)}>{allowedTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></td>
                      <td><select value={row.detail} onChange={e => updateRow(i, 'detail', e.target.value)}><option value="">-- Especifica --</option>{(CLASSIFICATIONS[row.type] || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></td>
                      <td><select value={row.sign} onChange={e => updateRow(i, 'sign', e.target.value)}><option value="sum">Sumar (+)</option><option value="sub">Restar (−)</option></select></td>
                      <td><input type="number" step="0.01" value={row.amount} onChange={e => updateRow(i, 'amount', e.target.value)} placeholder="0.00" /></td>
                      <td><button className="de-rm" onClick={() => removeRow(i)}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="de-totals">
              <h4>Resumen del balance</h4>
              <div>Activos: <strong>{num(groupTotals.activos)}</strong></div>
              <div>Pasivos: <strong>{num(groupTotals.pasivos)}</strong></div>
              <div>Patrimonio: <strong>{num(groupTotals.patrimonio)}</strong></div>
              <div>Ingresos: <strong>{num(groupTotals.ingresos)}</strong></div>
              <div>Gastos: <strong>{num(groupTotals.gastos)}</strong></div>
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}><AlertTriangle size={13} /> {error}</p>}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>El programa clasifica internamente; solo indica naturaleza, detalle y si suma o resta.</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
