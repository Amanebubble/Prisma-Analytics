import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileSpreadsheet, FileJson, CheckCircle, AlertCircle, FileText, Loader2, Building2, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { processFinancialDataWithAI } from '../services/aiService';
import { validateFinancialData } from '../utils/mathValidator';
import { useClient } from '../context/ClientContext';
import './CargaDatos.css';

export default function CargaDatos() {
  const navigate = useNavigate();
  const { activeClient, setClientDataLoaded, pendingMappingData, setPendingMappingData, activePeriod, setActivePeriod } = useClient();
  const [activeUpload, setActiveUpload] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: '' });
  const [ivaResult, setIvaResult] = useState<any | null>(null);
  const [ivaReview, setIvaReview] = useState<{ company: string; year: number; month: number; type: string; currency: string } | null>(null);
  const [bankResult, setBankResult] = useState<any | null>(null);
  const [bankReview, setBankReview] = useState<{ company: string; year: number; month: number; currency: string } | null>(null);
  const [ivaReconciliation, setIvaReconciliation] = useState<any | null>(null);
  const [registeredAccounts, setRegisteredAccounts] = useState<any[]>([]);
  const [niifCatalog, setNiifCatalog] = useState<any[]>([]);
  const [ivaType, setIvaType] = useState('iva_return');
  const [statementType, setStatementType] = useState('auto');
  const [comparativePeriods, setComparativePeriods] = useState<any[]>([]);
  const [activeComparativeIndex, setActiveComparativeIndex] = useState(0);
  const [documentReview, setDocumentReview] = useState<{
    company: string;
    year: number;
    month: number;
    type: string;
    currency: string;
    periodConfirmed: boolean;
    periodStart: string;
    periodEnd: string;
    periodNature: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ivaInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);

  const getElectronFilePath = (file: File) => {
    let filePath = (file as File & { path?: string }).path;
    try {
      const { webUtils } = (window as any).require('electron');
      filePath = filePath || webUtils?.getPathForFile(file);
    } catch (error) {
      console.warn('No fue posible obtener la ruta local del documento', error);
    }
    return filePath;
  };

  const normalizeAccountName = (value: string) => value.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  const parseSourceNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    const text = String(value ?? '').trim();
    if (!text || !/[0-9]/.test(text)) return null;
    const cleaned = text.replace(/[,$\s]/g, '');
    const negative = /^\(.*\)$/.test(cleaned);
    const parsed = Number(cleaned.replace(/[()]/g, '').replace(/\$/g, ''));
    return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : null;
  };

  const loadIvaReconciliation = async (year = activePeriod.year, month = activePeriod.month) => {
    if (!activeClient) {
      setIvaReconciliation(null);
      return;
    }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('get-iva-reconciliation', {
        clientId: activeClient.id,
        periodYear: year,
        periodMonth: month
      });
      setIvaReconciliation(result);
    } catch (error) {
      console.warn('No fue posible cargar la conciliación IVA', error);
    }
  };

  const loadRegisteredAccounts = async (year = activePeriod.year, month = activePeriod.month) => {
    if (!activeClient) {
      setRegisteredAccounts([]);
      return;
    }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('get-client-accounts', {
        clientId: activeClient.id,
        periodYear: year,
        periodMonth: month
      });
      setRegisteredAccounts(result.accounts || []);
    } catch (error) {
      console.warn('No fue posible cargar el catálogo de cuentas del cliente', error);
    }
  };

  useEffect(() => {
    loadIvaReconciliation();
    loadRegisteredAccounts();
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.invoke('get-niif-catalog').then((catalog: any[]) => setNiifCatalog(catalog || []));
    } catch (error) {
      console.warn('No fue posible cargar el catálogo NIIF', error);
    }
  }, [activeClient, activePeriod]);

  const updateRow = (index: number, changes: Record<string, unknown>) => {
    if (!pendingMappingData) return;
    const data = pendingMappingData.data.map((account, accountIndex) => accountIndex === index
      ? { ...account, ...changes }
      : account
    );
    const validation = validateFinancialData(data, documentReview?.type || pendingMappingData.statementType || 'balance');
    const updated = {
      ...pendingMappingData,
      data,
      status: validation.ai_status,
      diff: validation.ai_diff,
      totals: validation.calculated_totals
    };
    setPendingMappingData(updated);
    if (comparativePeriods.length > 1) {
      setComparativePeriods(periods => periods.map((period, periodIndex) => periodIndex === activeComparativeIndex ? { ...period, ...updated } : period));
    }
  };

  const handleMappingChange = (index: number, niifCode: string) => {
    const catalogItem = niifCatalog.find(item => item.code === niifCode);
    updateRow(index, { niifCode, niifName: catalogItem?.name || 'Sin mapear' });
  };

  const handleBalanceChange = (index: number, value: string) => {
    const balance = value === '' ? 0 : Number(value);
    if (!Number.isFinite(balance)) return;
    updateRow(index, { originalBalance: balance });
  };

  const handleNameChange = (index: number, value: string) => {
    updateRow(index, { originalName: value });
  };

  const selectComparativePeriod = (index: number) => {
    const period = comparativePeriods[index];
    if (!period) return;
    setActiveComparativeIndex(index);
    setPendingMappingData(period);
    setDocumentReview(period.review);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveUpload((e.currentTarget as HTMLElement).id);
  };

  const handleDragLeave = () => {
    setActiveUpload(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setActiveUpload(null);
    if (!activeClient) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleClickUpload = () => {
    if (!activeClient) return;
    fileInputRef.current?.click();
  };

  const processIvaFile = async (file: File) => {
    if (!activeClient) return;
    const filePath = getElectronFilePath(file);
    if (!filePath) {
      alert('La carga de documentos IVA requiere ejecutar la aplicación dentro de Electron.');
      return;
    }

    setIsProcessing(true);
    setProgress({ percent: 20, text: 'Extrayendo declaración IVA con LlamaParse...' });
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      setProgress({ percent: 45, text: isCsv ? 'Validando estructura oficial del anexo CSV...' : 'Estructurando totales con Gemini...' });
      let result;
      if (isCsv) {
        const validation = await ipcRenderer.invoke('analyze-iva-csv', {
          filePath,
          periodYear: activePeriod.year,
          periodMonth: activePeriod.month,
          documentType: ivaType
        });
        if (!validation.success) {
          const details = validation.errors.slice(0, 8).map((error: any) => `Línea ${error.line}: ${error.message}`).join('\n');
          throw new Error(`El anexo no cumple el formato oficial:\n${details}`);
        }
        const rows = validation.rows;
        const totalColumn = ivaType === 'sales_taxpayer' ? 15 : ivaType === 'sales_consumer' ? 19 : 14;
        const fiscalColumn = ivaType === 'sales_taxpayer' ? 12 : ivaType === 'purchases' ? 13 : null;
        const document = {
          empresa: activeClient.name,
          periodo: `${activePeriod.year}-${String(activePeriod.month).padStart(2, '0')}`,
          moneda: 'USD',
          tipo_documento: ivaType,
          ventas: ivaType.startsWith('sales') ? rows.reduce((sum: number, row: string[]) => sum + (Number(row[totalColumn]) || 0), 0) : 0,
          compras: ivaType === 'purchases' ? rows.reduce((sum: number, row: string[]) => sum + (Number(row[totalColumn]) || 0), 0) : 0,
          debito_fiscal: fiscalColumn === 12 ? rows.reduce((sum: number, row: string[]) => sum + (Number(row[fiscalColumn]) || 0), 0) : 0,
          credito_fiscal: fiscalColumn === 13 ? rows.reduce((sum: number, row: string[]) => sum + (Number(row[fiscalColumn]) || 0), 0) : 0,
          impuesto_declarado: 0,
          retenciones: 0,
          observaciones: [],
          csvValidation: validation
        };
        result = { success: true, sourceFilename: validation.sourceFilename, sourcePath: filePath, document };
      } else {
        result = await ipcRenderer.invoke('analyze-iva-document', {
          filePath,
          fallbackYear: activePeriod.year,
          fallbackMonth: activePeriod.month,
          documentType: ivaType
        });
      }
      if (!result.success) throw new Error(result.error || 'No fue posible procesar el documento.');
      setIvaResult(result);
      const periodMatch = String(result.document.periodo || '').match(/(\d{4})[-/]?(0?[1-9]|1[0-2])?/);
      setIvaReview({
        company: result.document.empresa || '',
        year: periodMatch ? Number(periodMatch[1]) : activePeriod.year,
        month: periodMatch?.[2] ? Number(periodMatch[2]) : activePeriod.month,
        type: ivaType,
        currency: result.document.moneda || 'USD'
      });
      setProgress({ percent: 100, text: 'Documento IVA analizado. Requiere confirmación.' });
    } catch (error: any) {
      console.error(error);
      alert('Error procesando documento IVA: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ percent: 0, text: '' });
    }
  };

  const processBankFile = async (file: File) => {
    if (!activeClient) return;
    const filePath = getElectronFilePath(file);
    if (!filePath) {
      alert('La carga bancaria requiere ejecutar la aplicación dentro de Electron.');
      return;
    }
    setIsProcessing(true);
    setProgress({ percent: 20, text: 'Extrayendo movimientos bancarios con LlamaParse...' });
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const result = await ipcRenderer.invoke('analyze-bank-document', { filePath });
      if (!result.success) throw new Error(result.error || 'No fue posible analizar el estado bancario.');
      const periodMatch = String(result.document.periodo || '').match(/(\d{4})[-/]?(0?[1-9]|1[0-2])?/);
      setBankResult(result);
      setBankReview({
        company: result.document.empresa || '',
        year: periodMatch ? Number(periodMatch[1]) : activePeriod.year,
        month: periodMatch?.[2] ? Number(periodMatch[2]) : activePeriod.month,
        currency: result.document.moneda || 'USD'
      });
      setProgress({ percent: 100, text: 'Estado bancario analizado. Requiere confirmación.' });
    } catch (error: any) {
      console.error(error);
      alert('Error procesando estado bancario: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ percent: 0, text: '' });
    }
  };

  const confirmCompany = (company: string) => {
    if (!activeClient || !company.trim()) {
      alert('No se pudo identificar la empresa. Corrige el nombre antes de guardar.');
      return false;
    }
    const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clientName = normalizeName(activeClient.name);
    const documentName = normalizeName(company);
    if (!clientName.includes(documentName) && !documentName.includes(clientName)) {
      return window.confirm(`La empresa detectada es "${company}" y el cliente activo es "${activeClient.name}". ¿Deseas continuar de todos modos?`);
    }
    return true;
  };

  const handleConfirmIva = async () => {
    if (!activeClient || !ivaResult || !ivaReview || !confirmCompany(ivaReview.company)) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('save-iva-document', {
        clientId: activeClient.id,
        periodYear: ivaReview.year,
        periodMonth: ivaReview.month,
        documentType: ivaReview.type,
        analysis: ivaResult
      });
      setActivePeriod({ year: ivaReview.year, month: ivaReview.month });
      await loadIvaReconciliation(ivaReview.year, ivaReview.month);
      setIvaReview(null);
      alert(`Documento IVA guardado en ${ivaReview.month}/${ivaReview.year}.`);
    } catch (error: any) {
      alert('No fue posible guardar el documento IVA: ' + error.message);
    }
  };

  const handleConfirmBank = async () => {
    if (!activeClient || !bankResult || !bankReview || !confirmCompany(bankReview.company)) return;
    try {
      const { ipcRenderer } = (window as any).require('electron');
      await ipcRenderer.invoke('save-bank-document', {
        clientId: activeClient.id,
        periodYear: bankReview.year,
        periodMonth: bankReview.month,
        analysis: bankResult
      });
      setActivePeriod({ year: bankReview.year, month: bankReview.month });
      setBankReview(null);
      alert(`Estado bancario guardado en ${bankReview.month}/${bankReview.year}.`);
    } catch (error: any) {
      alert('No fue posible guardar el estado bancario: ' + error.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
    // Clear input to allow uploading the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processPdfFinancialFile = async (file: File) => {
    if (!activeClient) return;
    const filePath = getElectronFilePath(file);
    if (!filePath) {
      alert('La carga PDF requiere ejecutar la aplicación dentro de Electron.');
      return;
    }
    setIsProcessing(true);
    setProgress({ percent: 25, text: 'Extrayendo tablas PDF con LlamaParse...' });
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const response = await ipcRenderer.invoke('analyze-financial-document', { filePath });
      if (!response.success || !response.mapped_data?.length) throw new Error('No se encontraron cuentas financieras en el PDF.');
      const detectedType = response.tipo_documento || 'balance';
      const sourcePeriods = Array.isArray(response.periods) && response.periods.length > 1 ? response.periods : [response];
      const periods = sourcePeriods.map((period: any) => {
        const periodType = period.tipo_documento || detectedType;
        const codes = (period.mapped_data || []).map((account: any) => String(account.originalName).match(/^\s*(\d+)/)?.[1]).filter(Boolean) as string[];
        const data = (period.mapped_data || []).map((account: any) => {
          const code = String(account.originalName).match(/^\s*(\d+)/)?.[1] || '';
          return { ...account, isSummary: Boolean(code && codes.some(other => other !== code && other.startsWith(code))) };
        });
        const validation = validateFinancialData(data, periodType);
        const periodMatch = String(period.periodo || response.periodo || '').match(/(\d{4})[-/]?(0?[1-9]|1[0-2])?/);
        const review = {
          company: response.empresa || '',
          year: periodMatch ? Number(periodMatch[1]) : activePeriod.year,
          month: periodMatch?.[2] ? Number(periodMatch[2]) : activePeriod.month,
          type: periodType,
          currency: response.moneda || 'USD',
          periodConfirmed: false,
          periodStart: period.periodo_inicio || response.periodo_inicio || '',
          periodEnd: period.periodo_fin || response.periodo_fin || '',
          periodNature: period.naturaleza_periodo || response.naturaleza_periodo || (periodType === 'balance' || periodType === 'trial_balance' ? 'point_in_time' : 'range')
        };
        return { data, status: validation.ai_status, diff: validation.ai_diff, totals: validation.calculated_totals, statementType: periodType, detectedCompany: review.company, detectedCurrency: review.currency, metadata: review, review };
      });
      setComparativePeriods(periods.length > 1 ? periods : []);
      setActiveComparativeIndex(0);
      setDocumentReview(periods[0].review);
      setPendingMappingData(periods[0]);
    } catch (error: any) {
      alert('Error procesando el PDF financiero: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ percent: 0, text: '' });
    }
  };

  const processFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      await processPdfFinancialFile(file);
      return;
    }
    setIsProcessing(true);
    setProgress({ percent: 10, text: 'Leyendo Excel...' });
    // Limpiar estado global (reseteo solicitado por el usuario)
    setPendingMappingData(null);
    
    let simInterval: any;

    try {
      // 1. Leer el archivo Excel en el navegador
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Preferir la hoja del período seleccionado; si no existe, usar la hoja anual más reciente.
      const sheetYears = workbook.SheetNames
        .map(name => ({ name, year: Number(name.match(/\b(19|20)\d{2}\b/)?.[0] || 0) }))
        .filter(item => item.year > 0);
      const periodSheet = sheetYears.find(item => item.year === activePeriod.year);
      const selectedSheet = periodSheet || sheetYears.sort((left, right) => right.year - left.year)[0];
      const firstSheetName = selectedSheet?.name || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sourceRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true, defval: '' });
      const namedPeriodSources = sheetYears.length >= 2
        ? sheetYears.map(item => ({ year: item.year, rows: XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[item.name], { header: 1, raw: true, defval: '' }), kind: 'sheet' }))
        : [];
      const balanceHeader = sourceRows.find(row => row.some(cell => /saldo\s*final/i.test(String(cell))));
      const balanceColumnIndex = balanceHeader ? balanceHeader.findIndex(cell => /saldo\s*final/i.test(String(cell))) : -1;
      const workbookStatementType = balanceHeader && balanceHeader.some(cell => /cargos|abonos/i.test(String(cell))) ? 'trial_balance' : null;
      const comparativeHeader = sourceRows.find(row => row.filter(cell => /^(19|20)\d{2}$/.test(String(cell).trim())).length >= 2);
      const comparativeColumns = comparativeHeader
        ? comparativeHeader.map((cell, index) => ({ year: Number(String(cell).trim()), index })).filter(item => item.year >= 1900)
        : [];
      const periodSources: any[] = namedPeriodSources.length >= 2
        ? namedPeriodSources
        : comparativeColumns.length >= 2
          ? comparativeColumns.map(column => ({ ...column, rows: sourceRows, kind: 'column' }))
          : [];

      const HEADER_LABELS = /^(total\b.*|activos?|pasivos?|patrimonio|corriente|no\s+corriente|no\s*corriente|cuentas|activo\s+corriente|activo\s+no\s+corriente|pasivo\s+corriente|pasivo\s+no\s+corriente)$/i;
      // En formato de cuenta (activo a la izquierda, pasivo a la derecha) el saldo
      // de cada cuenta es el primer número a la derecha del nombre, antes del próximo texto.
      const balanceRightOfText = (row: any[], textIndex: number) => {
        for (let i = textIndex + 1; i < row.length; i++) {
          const next = row[i];
          if (typeof next === 'string' && next.trim() !== '' && /[a-záéíóúñ]/i.test(next)) return null;
          const parsed = parseSourceNumber(next);
          if (parsed !== null) return parsed;
        }
        return null;
      };
      const getPeriodBalance = (rows: any[], accountName: string) => {
        const header = rows.find((row: any[]) => row.some((cell: any) => /saldo\s*final/i.test(String(cell))));
        const finalColumn = header ? header.findIndex((cell: any) => /saldo\s*final/i.test(String(cell))) : -1;
        const normalized = normalizeAccountName(accountName);
        const sourceRowIndex = rows.findIndex((row: any[]) => row.some((cell: any) => typeof cell === 'string' && normalizeAccountName(cell).includes(normalized)));
        if (sourceRowIndex < 0) return null;
        const sourceRow = rows[sourceRowIndex];
        if (finalColumn >= 0) return parseSourceNumber(sourceRow[finalColumn]);
        const textIndex = sourceRow.findIndex((cell: any) => typeof cell === 'string' && normalizeAccountName(cell).includes(normalized));
        return textIndex >= 0 ? balanceRightOfText(sourceRow, textIndex) : null;
      };
      const sourceBalances = sourceRows.flatMap(row => {
        return row.flatMap((cell, index) => {
          if (typeof cell !== 'string' || !/[a-záéíóúñ]/i.test(cell)) return [];
          if (cell.trim().length < 3 || HEADER_LABELS.test(cell.trim())) return [];
          const finalBalance = balanceColumnIndex >= 0 ? parseSourceNumber(row[balanceColumnIndex]) : balanceRightOfText(row, index);
          const accountCode = String(row[0]).match(/^\s*(\d+)/)?.[1] || '';
          const accountName = accountCode && typeof row[1] === 'string' ? `${accountCode} ${row[1]}` : cell;
          return finalBalance !== null ? [{ name: accountName, balance: finalBalance }] : [];
        });
      });
      
      // Convertir a CSV simple
      const csvData = XLSX.utils.sheet_to_csv(worksheet);

      // 2. Enviar datos a Gemini AI
      setProgress({ percent: 30, text: 'Conectando con Gemini 3.6 Flash...' });
      
      let simProgress = 30;
      simInterval = setInterval(() => {
        if (simProgress < 85) {
          simProgress += 5;
          setProgress({ percent: simProgress, text: 'Procesando NIIF y cálculos matemáticos...' });
        }
      }, 1000);

       const response = await processFinancialDataWithAI(csvData, statementType);
      clearInterval(simInterval);
      
      if (response.success && response.mapped_data) {
        const mappedData = response.mapped_data;
        setProgress({ percent: 100, text: '¡Mapeo completado exitosamente!' });
        await new Promise(r => setTimeout(r, 600)); // Pequeña pausa para mostrar 100%

        const periodMatch = String(response.periodo || '').match(/(\d{4})[-/]?(0?[1-9]|1[0-2])?/);
        const detectedYear = selectedSheet?.year || (periodMatch ? Number(periodMatch[1]) : activePeriod.year);
        const detectedMonth = periodMatch?.[2] ? Number(periodMatch[2]) : activePeriod.month;
        const detectedType = workbookStatementType || (['balance', 'trial_balance', 'results', 'equity_changes', 'cash_flow'].includes(response.tipo_documento || '')
          ? response.tipo_documento as string
          : statementType === 'auto' ? 'balance' : statementType);

        setDocumentReview({
          company: response.empresa || '',
          year: detectedYear,
          month: detectedMonth,
          type: detectedType,
          currency: response.moneda || 'USD',
          periodConfirmed: false,
          periodStart: response.periodo_inicio || '',
          periodEnd: response.periodo_fin || '',
          periodNature: response.naturaleza_periodo || (detectedType === 'balance' || detectedType === 'trial_balance' ? 'point_in_time' : 'range')
        });

        // En Excel el saldo original prevalece sobre cualquier número inferido por la IA.
        const codes = mappedData.map(account => String(account.originalName).match(/^\s*(\d+)/)?.[1]).filter(Boolean) as string[];
        const correctedData = mappedData.map(account => {
          const accountName = normalizeAccountName(account.originalName);
          const source = sourceBalances.find(row => {
            const sourceName = normalizeAccountName(row.name);
            return sourceName === accountName || sourceName.includes(accountName) || accountName.includes(sourceName);
          });
          const code = String(account.originalName).match(/^\s*(\d+)/)?.[1] || '';
          const isSummary = Boolean(code && codes.some(other => other !== code && other.startsWith(code)));
          return source ? { ...account, originalBalance: source.balance, isSummary } : { ...account, isSummary };
        });

        const comparisonRows = periodSources.length >= 2
          ? periodSources.map(periodSource => {
            const periodData = mappedData.map(account => {
              const value = periodSource.kind === 'sheet'
                ? getPeriodBalance(periodSource.rows, account.originalName)
                : (() => {
                  const sourceRow = periodSource.rows.find((row: any[]) => row.some((cell: any) => typeof cell === 'string' && normalizeAccountName(cell).includes(normalizeAccountName(account.originalName))));
                  return sourceRow ? parseSourceNumber(sourceRow[periodSource.index]) : null;
                })();
              const code = String(account.originalName).match(/^\s*(\d+)/)?.[1] || '';
              const isSummary = Boolean(code && codes.some(other => other !== code && other.startsWith(code)));
              return { ...account, originalBalance: value === null ? account.originalBalance : value, isSummary };
            });
            const periodValidation = validateFinancialData(periodData, detectedType);
            const review = {
              company: response.empresa || '', year: periodSource.year, month: detectedMonth, type: detectedType,
              currency: response.moneda || 'USD', periodConfirmed: false,
              periodStart: response.periodo_inicio || '', periodEnd: response.periodo_fin || '',
              periodNature: response.naturaleza_periodo || 'point_in_time'
            };
            return {
              data: periodData, status: periodValidation.ai_status, diff: periodValidation.ai_diff,
              totals: periodValidation.calculated_totals, statementType: detectedType,
              detectedCompany: response.empresa || '', detectedCurrency: response.moneda || 'USD',
              metadata: { company: response.empresa || '', currency: response.moneda || 'USD' }, review
            };
          })
          : [];

        setComparativePeriods(comparisonRows);
        setActiveComparativeIndex(0);

        // Validación matemática LOCAL (100% determinista) según el tipo detectado.
        const validation = validateFinancialData(correctedData, detectedType);

        setPendingMappingData({
          data: correctedData,
          status: validation.ai_status,
          diff: validation.ai_diff,
          totals: validation.calculated_totals,
          statementType: detectedType,
          detectedCompany: response.empresa || '',
          detectedCurrency: response.moneda || 'USD',
          metadata: {
            company: response.empresa || '',
            periodStart: response.periodo_inicio || '',
            periodEnd: response.periodo_fin || '',
            periodNature: response.naturaleza_periodo || '',
            currency: response.moneda || 'USD'
          }
        });

        if (comparisonRows.length > 0) {
          setPendingMappingData(comparisonRows[0]);
          setDocumentReview(comparisonRows[0].review);
        }

      } else {
        alert("Error de IA: " + response.error);
      }
    } catch (error: any) {
      console.error(error);
      if (simInterval) clearInterval(simInterval);
      alert('Error procesando el archivo: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ percent: 0, text: '' });
    }
  };

  const handleConfirmMapping = async (finalize = true) => {
    if (!activeClient || !pendingMappingData || !documentReview) return;
    if (!documentReview.periodConfirmed) {
      alert('Confirma primero el año y período del documento.');
      return;
    }
    if (finalize && comparativePeriods.length > 1 && comparativePeriods.some(period => !period.review?.periodConfirmed)) {
      alert('Confirma el período en cada pestaña comparativa antes de aprobar el documento.');
      return;
    }
    const finalValidation = validateFinancialData(pendingMappingData.data, documentReview.type);

    if (!documentReview.company.trim()) {
      alert('No se pudo identificar la empresa del documento. Corrige el nombre antes de guardar.');
      return;
    }

    const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clientName = normalizeName(activeClient.name);
    const documentName = normalizeName(documentReview.company);
    const companyMismatch = !clientName.includes(documentName) && !documentName.includes(clientName);
    if (companyMismatch && !window.confirm(`La empresa detectada es "${documentReview.company}" y el cliente activo es "${activeClient.name}". ¿Deseas continuar de todos modos?`)) {
      return;
    }
    
    // Guardar en la base de datos local (SQLite)
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const periodsToSave = comparativePeriods.length > 1 ? comparativePeriods : [{ ...pendingMappingData, review: documentReview }];
      for (const period of periodsToSave) {
        const review = period.review;
        const result = await ipcRenderer.invoke('save-financial-data', {
          clientId: activeClient.id,
          periodYear: review.year,
          periodMonth: review.month,
          mappedData: period.data,
          statementType: review.type,
          metadata: {
            ...period.metadata,
            company: review.company,
            periodYear: review.year,
            periodMonth: review.month,
            periodStart: review.periodStart,
            periodEnd: review.periodEnd,
            periodNature: review.periodNature,
            currency: review.currency
          }
        });
        if (!result?.success) {
          throw new Error(result?.error || 'La base de datos rechazó la información.');
        }
      }
    } catch (error: any) {
      console.error('Failed to save to SQLite', error);
      alert('No fue posible guardar la información en la base de datos: ' + (error.message || error));
      return;
    }

    // Actualizar Memoria Global (Incluyendo el array detallado de cuentas)
    if (finalValidation.calculated_totals) {
      setClientDataLoaded(activeClient.id, finalValidation.calculated_totals, pendingMappingData.data);
    } else {
      setClientDataLoaded(activeClient.id, undefined, pendingMappingData?.data);
    }

    setActivePeriod({ year: documentReview.year, month: documentReview.month });
    await loadRegisteredAccounts(documentReview.year, documentReview.month);

    if (!finalize) {
      alert(`Borrador guardado en el período ${documentReview.month}/${documentReview.year}. Puedes seguir editando.`);
      return;
    }

    setPendingMappingData(null);
    setDocumentReview(null);
    setComparativePeriods([]);

    alert(`Datos aprobados y guardados en el período ${documentReview.month}/${documentReview.year}. Cargando Auditoría Pre-Hacienda...`);
    navigate('/auditoria');
  };

  if (!activeClient) {
    return (
      <div className="carga-datos-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Building2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
          <h2>Ningún cliente seleccionado</h2>
          <p>Por favor, ve al Panel Principal y activa un cliente para comenzar a procesar sus datos.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isProcessing && (
        <div className="global-processing-overlay animate-fade-in">
          <div className="processing-card">
            <Loader2 size={48} className="spin" color="var(--accent-primary)" style={{ margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Procesando con IA...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Por favor, no cambies de pestaña ni cierres la ventana.</p>
            
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress.percent}%` }}></div>
            </div>
            <div className="progress-text">
              {progress.text} ({progress.percent}%)
            </div>
          </div>
        </div>
      )}

      <div className="carga-datos-container animate-fade-in">
        <div className="page-header header-with-action" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Carga de Datos y Mapeo NIIF (Motor IA)</h1>
            <p>Sube tus balances (Excel). Prisma extraerá el texto y Gemini estructurará y validará los montos.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Período Fiscal:</span>
            <select 
              value={activePeriod.month} 
              onChange={(e) => setActivePeriod({ ...activePeriod, month: parseInt(e.target.value) })}
              style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value={1}>Enero</option>
              <option value={2}>Febrero</option>
              <option value={3}>Marzo</option>
              <option value={4}>Abril</option>
              <option value={5}>Mayo</option>
              <option value={6}>Junio</option>
              <option value={7}>Julio</option>
              <option value={8}>Agosto</option>
              <option value={9}>Septiembre</option>
              <option value={10}>Octubre</option>
              <option value={11}>Noviembre</option>
              <option value={12}>Diciembre</option>
            </select>
            <input 
              type="number" 
              value={activePeriod.year} 
              onChange={(e) => setActivePeriod({ ...activePeriod, year: parseInt(e.target.value) })}
              style={{ width: '80px', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
            <select
              value={statementType}
              onChange={(e) => setStatementType(e.target.value)}
              style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            >
              <option value="auto">Detectar tipo automáticamente</option>
              <option value="balance">Balance general</option>
              <option value="trial_balance">Balance de comprobación</option>
              <option value="results">Estado de resultados</option>
              <option value="equity_changes">Cambios en el patrimonio</option>
              <option value="cash_flow">Flujos de efectivo</option>
            </select>
            {activeClient?.hasData && (
              <button className="btn-primary" style={{ background: 'var(--accent-primary)' }} onClick={() => navigate('/auditoria')}>
                <ArrowRight size={16} /> Ir a Auditoría
              </button>
            )}
          </div>
        </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
         accept=".xlsx, .xls, .csv, .pdf" 
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={ivaInputRef}
        style={{ display: 'none' }}
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await processIvaFile(file);
          if (ivaInputRef.current) ivaInputRef.current.value = '';
        }}
      />
      <input
        type="file"
        ref={bankInputRef}
        style={{ display: 'none' }}
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await processBankFile(file);
          if (bankInputRef.current) bankInputRef.current.value = '';
        }}
      />

      <div className="upload-grid">
        {/* Tarjeta 1: Balances y E.R. */}
        <div className="upload-card">
          <div className="upload-icon-wrapper">
            <FileText size={32} />
          </div>
          <h3>Estados Financieros</h3>
          <p>Sube tu archivo real (.xlsx, .csv)</p>
          
          <div 
            id="financials"
            className={`dropzone ${activeUpload === 'financials' ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClickUpload}
          >
            {isProcessing ? (
               <Loader2 size={24} className="spin" color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            ) : (
               <UploadCloud size={24} color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem auto' }} />
            )}
            
            <div className="dropzone-text">{isProcessing ? 'Procesando con Gemini IA...' : 'Haz clic o arrastra tu Excel real aquí'}</div>
            <div className="dropzone-subtext">Lee archivos locales</div>
          </div>
        </div>

        {/* Tarjeta 2: Libros y anexos IVA */}
        <div className="upload-card">
          <div className="upload-icon-wrapper" style={{ background: 'rgba(39, 174, 96, 0.1)', color: 'var(--success)' }}>
            <FileSpreadsheet size={32} />
          </div>
          <h3>Declaraciones y anexos IVA</h3>
          <p>Procesamiento con LlamaParse + Gemini</p>
          <select
            value={ivaType}
            onChange={(e) => setIvaType(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', marginBottom: '0.75rem', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
          >
            <option value="iva_return">Declaración IVA F-07</option>
            <option value="sales_taxpayer">Ventas a contribuyentes</option>
            <option value="sales_consumer">Ventas a consumidor final</option>
            <option value="purchases">Libro de compras</option>
            <option value="payment_on_account">Pago a cuenta / PAC</option>
            <option value="income_tax">Declaración de renta</option>
          </select>
          <div className="dropzone" onClick={() => ivaInputRef.current?.click()}>
            <UploadCloud size={24} color="var(--success)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">Haz clic para cargar PDF o Excel</div>
          </div>
        </div>

        {/* Tarjeta 3: Estados Bancarios */}
        <div className="upload-card">
          <div className="upload-icon-wrapper" style={{ background: 'rgba(242, 153, 74, 0.1)', color: 'var(--warning)' }}>
            <FileJson size={32} />
          </div>
          <h3>Estados de cuenta bancarios</h3>
          <p>Procesamiento con LlamaParse + Gemini</p>
          <div className="dropzone" onClick={() => bankInputRef.current?.click()}>
            <UploadCloud size={24} color="var(--warning)" style={{ margin: '0 auto 0.5rem auto' }} />
            <div className="dropzone-text">Haz clic para cargar PDF, Excel o CSV</div>
          </div>
        </div>
      </div>

      {registeredAccounts.length > 0 && (
        <div className="mapping-section animate-fade-in" style={{ marginTop: '1.5rem' }}>
          <div className="mapping-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Cuentas registradas del cliente</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Catálogo acumulado desde los documentos confirmados.
              </p>
            </div>
            <strong>{registeredAccounts.length} cuentas</strong>
          </div>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem' }}>Cuenta original</th>
                  <th style={{ padding: '0.65rem' }}>NIIF</th>
                  <th style={{ padding: '0.65rem' }}>Saldo del período</th>
                  <th style={{ padding: '0.65rem' }}>Confianza</th>
                </tr>
              </thead>
              <tbody>
                {registeredAccounts.map(account => (
                  <tr key={account.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 500 }}>{account.original_name}</td>
                    <td style={{ padding: '0.65rem' }}>{account.niif_code || 'Sin mapear'}{account.niif_name ? ` - ${account.niif_name}` : ''}</td>
                    <td style={{ padding: '0.65rem' }}>{account.balance === null ? 'Sin saldo en este período' : `$${Number(account.balance).toLocaleString('es-SV')}`}</td>
                    <td style={{ padding: '0.65rem', color: account.confidence === 'low' ? 'var(--warning)' : 'var(--success)' }}>{account.confidence === 'low' ? 'Revisar' : 'Alta'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {documentReview && pendingMappingData && (
        <div className="mapping-section animate-fade-in" style={{ marginTop: '1.5rem', border: '2px solid var(--accent-primary)' }}>
          <div className="mapping-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Revisión del documento detectado</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Gemini propone estos datos. Corrígelos antes de confirmar el mapeo.
              </p>
            </div>
            <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Pendiente de confirmación</span>
          </div>
          {comparativePeriods.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              {comparativePeriods.map((period, index) => (
                <button key={period.review.year} className={index === activeComparativeIndex ? 'btn-primary' : 'btn-secondary'} onClick={() => selectComparativePeriod(index)}>
                  {period.review.year} {period.review.periodConfirmed ? '✓' : ''}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
              Empresa detectada
              <input value={documentReview.company} onChange={e => setDocumentReview({ ...documentReview, company: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
              Año
              <input type="number" value={documentReview.year} onChange={e => setDocumentReview({ ...documentReview, year: Number(e.target.value), periodConfirmed: false })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
              Mes
              <select value={documentReview.month} onChange={e => setDocumentReview({ ...documentReview, month: Number(e.target.value), periodConfirmed: false })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
              Tipo
              <select value={documentReview.type} onChange={e => setDocumentReview({ ...documentReview, type: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                <option value="balance">Balance general</option>
                <option value="trial_balance">Balance de comprobación</option>
                <option value="results">Estado de resultados</option>
                <option value="equity_changes">Cambios en patrimonio</option>
                <option value="cash_flow">Flujos de efectivo</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <span>Moneda detectada: <strong>{documentReview.currency}</strong></span>
            <span>Cliente activo: <strong>{activeClient.name}</strong></span>
            {documentReview.company && !activeClient.name.toLowerCase().includes(documentReview.company.toLowerCase().split(' ')[0]) && (
              <span style={{ color: 'var(--warning)' }}>Revisar coincidencia de empresa</span>
            )}
            <button
              className="btn-primary"
              style={{ marginLeft: 'auto', background: documentReview.periodConfirmed ? 'var(--success)' : 'var(--accent-primary)' }}
              onClick={() => {
                const updatedReview = { ...documentReview, periodConfirmed: true };
                setDocumentReview(updatedReview);
                if (comparativePeriods.length > 1) {
                  setComparativePeriods(periods => periods.map((period, index) => index === activeComparativeIndex ? { ...period, review: updatedReview } : period));
                  if (pendingMappingData) setPendingMappingData({ ...pendingMappingData, review: updatedReview } as any);
                }
              }}
            >
              {documentReview.periodConfirmed ? 'Período confirmado' : 'Confirmar período'}
            </button>
          </div>
        </div>
      )}

      {ivaReview && ivaResult && (
        <div className="mapping-section animate-fade-in" style={{ marginTop: '1.5rem', border: '2px solid var(--success)' }}>
          <div className="mapping-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Revisión de documento IVA</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>El documento aún no se ha guardado.</p>
            </div>
            <button className="btn-primary" onClick={handleConfirmIva}>Confirmar período y guardar IVA</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Empresa<input value={ivaReview.company} onChange={e => setIvaReview({ ...ivaReview, company: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Año<input type="number" value={ivaReview.year} onChange={e => setIvaReview({ ...ivaReview, year: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Mes<input type="number" min="1" max="12" value={ivaReview.month} onChange={e => setIvaReview({ ...ivaReview, month: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Tipo<select value={ivaReview.type} onChange={e => setIvaReview({ ...ivaReview, type: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}><option value="iva_return">Declaración IVA F-07</option><option value="sales_taxpayer">Ventas a contribuyentes</option><option value="sales_consumer">Ventas a consumidor final</option><option value="purchases">Libro de compras</option><option value="payment_on_account">Pago a cuenta / PAC</option><option value="income_tax">Declaración de renta</option></select></label>
          </div>
        </div>
      )}

      {bankReview && bankResult && (
        <div className="mapping-section animate-fade-in" style={{ marginTop: '1.5rem', border: '2px solid var(--warning)' }}>
          <div className="mapping-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Revisión de estado bancario</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{bankResult.sourceFilename} · {bankResult.document.movimientos.length} movimientos detectados</p>
            </div>
            <button className="btn-primary" onClick={handleConfirmBank}>Confirmar y guardar banco</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Empresa<input value={bankReview.company} onChange={e => setBankReview({ ...bankReview, company: e.target.value })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Año<input type="number" value={bankReview.year} onChange={e => setBankReview({ ...bankReview, year: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>Mes<input type="number" min="1" max="12" value={bankReview.month} onChange={e => setBankReview({ ...bankReview, month: Number(e.target.value) })} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} /></label>
            <div style={{ paddingTop: '1.5rem', fontSize: '0.875rem' }}>Moneda: <strong>{bankReview.currency}</strong><br />Banco: <strong>{bankResult.document.banco || 'No identificado'}</strong></div>
          </div>
        </div>
      )}

      {ivaResult && (
        <div className="mapping-section animate-fade-in" style={{ marginTop: '1.5rem' }}>
          <div className="mapping-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Documento IVA procesado</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ivaResult.sourceFilename}</p>
            </div>
            <button className="btn-secondary" onClick={() => setIvaResult(null)}>Ocultar resultado</button>
          </div>
          <div className="kpi-grid" style={{ marginTop: '1rem' }}>
            <div className="kpi-card glass"><p className="kpi-label">Ventas</p><h3 className="kpi-value">${Number(ivaResult.document.ventas).toLocaleString('es-SV')}</h3></div>
            <div className="kpi-card glass"><p className="kpi-label">Compras</p><h3 className="kpi-value">${Number(ivaResult.document.compras).toLocaleString('es-SV')}</h3></div>
            <div className="kpi-card glass"><p className="kpi-label">Débito fiscal</p><h3 className="kpi-value">${Number(ivaResult.document.debito_fiscal).toLocaleString('es-SV')}</h3></div>
            <div className="kpi-card glass"><p className="kpi-label">Crédito fiscal</p><h3 className="kpi-value">${Number(ivaResult.document.credito_fiscal).toLocaleString('es-SV')}</h3></div>
          </div>
          {ivaResult.document.observaciones.length > 0 && (
            <p style={{ marginTop: '1rem', color: 'var(--warning)' }}>
              Observaciones: {ivaResult.document.observaciones.join(' ')}</p>
          )}
        </div>
      )}

      {ivaReconciliation && ivaReconciliation.documentsCount > 0 && (
        <div className="mapping-section animate-fade-in" style={{ marginTop: '1.5rem' }}>
          <div className="mapping-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Conciliación IVA vs contabilidad</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Comparación del período {activePeriod.month}/{activePeriod.year}
              </p>
            </div>
            <strong style={{ color: ivaReconciliation.status === 'OK' ? 'var(--success)' : 'var(--danger)' }}>
              {ivaReconciliation.status === 'OK' ? 'Sin diferencias materiales' : ivaReconciliation.status}
            </strong>
          </div>
          <div className="kpi-grid" style={{ marginTop: '1rem' }}>
            <div className="kpi-card glass">
              <p className="kpi-label">Ventas IVA</p>
              <h3 className="kpi-value">${Number(ivaReconciliation.iva.sales).toLocaleString('es-SV')}</h3>
              <small>Contabilidad: ${Number(ivaReconciliation.accounting.sales).toLocaleString('es-SV')}</small>
            </div>
            <div className="kpi-card glass">
              <p className="kpi-label">Diferencia ventas</p>
              <h3 className="kpi-value">${Number(ivaReconciliation.differences.sales).toLocaleString('es-SV')}</h3>
            </div>
            <div className="kpi-card glass">
              <p className="kpi-label">Compras IVA</p>
              <h3 className="kpi-value">${Number(ivaReconciliation.iva.purchases).toLocaleString('es-SV')}</h3>
              <small>Contabilidad: ${Number(ivaReconciliation.accounting.expenses).toLocaleString('es-SV')}</small>
            </div>
            <div className="kpi-card glass">
              <p className="kpi-label">Diferencia compras</p>
              <h3 className="kpi-value">{ivaReconciliation.differences.purchases === null ? 'N/D' : `$${Number(ivaReconciliation.differences.purchases).toLocaleString('es-SV')}`}</h3>
            </div>
          </div>
        </div>
      )}

       {/* Hoja de revisión de extracción: datos crudos editables; la auditoría ocurre en Auditoría Pre-Hacienda. */}
       <div className="mapping-section" style={{ opacity: pendingMappingData ? 1 : 0.5, pointerEvents: pendingMappingData ? 'auto' : 'none', transition: 'all 0.3s' }}>
         <div className="mapping-header" style={{ background: pendingMappingData ? 'var(--bg-tertiary)' : undefined, padding: pendingMappingData ? '0.75rem 1rem' : undefined, borderRadius: pendingMappingData ? 'var(--radius-sm)' : undefined }}>
           <div>
             <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem', fontWeight: 600 }}>
               {pendingMappingData && documentReview
                 ? `Revisión de Datos Crudos — ${documentReview.type === 'trial_balance' ? 'Balance de Comprobación' : documentReview.type === 'results' ? 'Estado de Resultados' : documentReview.type === 'equity_changes' ? 'Cambios en el Patrimonio' : documentReview.type === 'cash_flow' ? 'Flujo de Efectivo' : 'Balance General'} ${documentReview.year} — ${documentReview.company || activeClient.name}`
                 : 'Hoja de extracción y clasificación'}
             </h3>
             <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
               Datos puros extraídos del documento. Corrige saldos, nombres o clasificaciones; los cálculos y anomalías se ejecutan en Auditoría.
             </p>
           </div>
           <div style={{ display: 'flex', gap: '0.75rem' }}>
             <button
               className="btn-secondary"
               disabled={!pendingMappingData}
               onClick={() => handleConfirmMapping(false)}
               title="Guarda los datos actuales sin enviarlos a auditoría"
             >
               Guardar Borrador
             </button>
             <button
               className="btn-secondary"
               style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
               disabled={!pendingMappingData}
               onClick={() => { setPendingMappingData(null); setComparativePeriods([]); }}
             >
               Descartar
             </button>
             <button
               className="btn-primary"
               style={{ background: 'var(--success)', borderColor: 'var(--success)', color: 'white', fontWeight: 700, padding: '0.5rem 1.25rem' }}
               disabled={!pendingMappingData || !documentReview?.periodConfirmed}
              onClick={() => handleConfirmMapping(true)}
             >
               <CheckCircle size={18} /> Aprobar y Enviar a Auditoría
             </button>
           </div>
         </div>

         {comparativePeriods.length > 1 && (
           <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
             {comparativePeriods.map((period, index) => (
               <button key={period.review.year} className={index === activeComparativeIndex ? 'btn-primary' : 'btn-secondary'} onClick={() => selectComparativePeriod(index)}>
                 {period.review.year} {period.review.periodConfirmed ? '✓' : ''}
               </button>
             ))}
           </div>
         )}

        {!pendingMappingData ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Sube un documento financiero para revisar sus datos crudos...
          </div>
        ) : (
          <div>
             <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
               <strong>Extracción lista para revisión.</strong> La información todavía no representa un dictamen ni un hallazgo de auditoría.
             </div>

            <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 1 }}>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem' }}>Código</th>
                    <th style={{ padding: '0.6rem' }}>Nombre de Cuenta</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Saldo Deudor</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Saldo Acreedor</th>
                    <th style={{ padding: '0.6rem' }}>Clasificación Estándar</th>
                    <th style={{ padding: '0.6rem' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMappingData.data.map((row: any, idx: number) => {
                    const nameMatch = String(row.originalName || '').match(/^\s*(\d+)\s+(.+)$/);
                    const accountCode = nameMatch ? nameMatch[1] : '';
                    const accountName = nameMatch ? nameMatch[2] : String(row.originalName || '');
                    const isDebitNature = /^[156]/.test(row.niifCode || '') || !/^[234]/.test(row.niifCode || '');
                    const balance = Number(row.originalBalance) || 0;
                    const debitValue = balance >= 0 ? (isDebitNature ? balance : '') : (!isDebitNature ? Math.abs(balance) : '');
                    const creditValue = balance >= 0 ? (!isDebitNature ? balance : '') : (isDebitNature ? Math.abs(balance) : '');
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: row.isSummary ? 'rgba(100,116,139,0.06)' : undefined }}>
                        <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{accountCode}</td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          <input
                            type="text"
                            value={accountName}
                            onChange={(e) => handleNameChange(idx, accountCode ? `${accountCode} ${e.target.value}` : e.target.value)}
                            style={{ width: '100%', minWidth: '220px', padding: '0.35rem', border: '1px solid transparent', borderRadius: '4px', background: 'transparent', color: 'var(--text-primary)' }}
                          />
                          {row.isSummary && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>(resumen, no se suma)</span>}
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                          <input
                            type="number" step="0.01" value={debitValue === '' ? '' : debitValue}
                            placeholder="0.00"
                            onChange={(e) => handleBalanceChange(idx, e.target.value)}
                            style={{ width: '130px', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>
                          <input
                            type="number" step="0.01" value={creditValue === '' ? '' : creditValue}
                            placeholder="0.00"
                            onChange={(e) => handleBalanceChange(idx, e.target.value)}
                            style={{ width: '130px', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>
                          <select
                            value={row.niifCode}
                            onChange={(e) => handleMappingChange(idx, e.target.value)}
                            style={{ minWidth: '240px', padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
                          >
                            <option value="Unmapped">-- Sin Mapear --</option>
                            {row.niifCode && row.niifCode !== 'Unmapped' && !niifCatalog.some(item => item.code === row.niifCode) && (
                              <option value={row.niifCode}>{row.niifCode} - {row.niifName}</option>
                            )}
                            {niifCatalog.map(item => (
                              <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>
                          {row.niifCode === 'Unmapped' && !row.isSummary ? (
                            <span style={{ color: 'var(--warning)' }} title="Clasificación dudosa"><AlertCircle size={14}/></span>
                          ) : row.isSummary ? null : (
                            <span style={{ color: 'var(--success)' }} title="Clasificado"><CheckCircle size={14}/></span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
