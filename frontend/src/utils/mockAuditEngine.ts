export interface AuditFinding {
  id: string;
  type: 'Cruce Bancario' | 'Secuencia' | 'Cuadre IVA' | 'Auditoría Terceros';
  title: string;
  description: string;
  impact: 'Crítico' | 'Medio' | 'Informativo';
  status: 'Pendiente' | 'Justificado' | 'Observado';
}

export const generateMockFindings = (): AuditFinding[] => [
  {
    id: 'H-01',
    type: 'Cruce Bancario',
    title: 'Venta no bancarizada',
    description: 'Factura de venta #1042 ($4,800.00) a favor de "Cliente A" no tiene abono bancario coincidente en el mes.',
    impact: 'Alto', // Will map to Crítico/Alto in UI
    status: 'Pendiente'
  } as any,
  {
    id: 'H-02',
    type: 'Secuencia',
    title: 'Salto en correlativo',
    description: 'Falta documento #0892 en el Libro de Ventas a Consumidor Final (posible anulación no registrada).',
    impact: 'Medio',
    status: 'Pendiente'
  },
  {
    id: 'H-03',
    type: 'Cuadre IVA',
    title: 'Diferencia en Crédito Fiscal',
    description: 'Crédito Fiscal en Compras ($1,230.00) difiere de la Cuenta Contable 2101-IVA ($1,180.00). Diferencia de $50.00.',
    impact: 'Crítico',
    status: 'Pendiente'
  },
  {
    id: 'H-04',
    type: 'Auditoría Terceros',
    title: 'Concentración de Riesgo',
    description: 'El proveedor "Servicios Tech S.A." representa el 35% del total de las compras mensuales ($15,400.00).',
    impact: 'Informativo',
    status: 'Pendiente'
  },
  {
    id: 'H-05',
    type: 'Cruce Bancario',
    title: 'Transacción Huérfana',
    description: 'Cargo en banco Agrícola por $450.00 el 15/07 sin registro en Libro de Compras ni retención aplicada.',
    impact: 'Medio',
    status: 'Pendiente'
  }
];
