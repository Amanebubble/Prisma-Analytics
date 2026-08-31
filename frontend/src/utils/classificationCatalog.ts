export interface Classification {
  id: string;
  label: string;
  niifCode: string;
  sign: 'sum' | 'sub';
  group: string;
}

export const TYPES = ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'] as const;
export type TypeKey = typeof TYPES[number];

export const CLASSIFICATIONS: Record<TypeKey, Classification[]> = {
  activo: [
    { id: 'efectivo', label: 'Efectivo y Equivalentes', niifCode: '11', sign: 'sum', group: 'Corriente' },
    { id: 'bancos', label: 'Bancos', niifCode: '11', sign: 'sum', group: 'Corriente' },
    { id: 'cxc', label: 'Cuentas por Cobrar', niifCode: '12', sign: 'sum', group: 'Corriente' },
    { id: 'deudores', label: 'Deudores Diversos', niifCode: '12', sign: 'sum', group: 'Corriente' },
    { id: 'documentos-cxc', label: 'Documentos por Cobrar', niifCode: '12', sign: 'sum', group: 'Corriente' },
    { id: 'inventarios', label: 'Inventarios', niifCode: '13', sign: 'sum', group: 'Corriente' },
    { id: 'inversiones-cp', label: 'Inversiones a Corto Plazo', niifCode: '14', sign: 'sum', group: 'Corriente' },
    { id: 'anticipos', label: 'Anticipos y Pagos Anticipados', niifCode: '18', sign: 'sum', group: 'Corriente' },
    { id: 'iva-credito', label: 'IVA Crédito Fiscal', niifCode: '17', sign: 'sum', group: 'Corriente' },
    { id: 'inversiones-lp', label: 'Inversiones a Largo Plazo', niifCode: '12', sign: 'sum', group: 'No corriente' },
    { id: 'ppe', label: 'Propiedad, Planta y Equipo', niifCode: '15', sign: 'sum', group: 'No corriente' },
    { id: 'depreciacion', label: 'Depreciación Acumulada', niifCode: '15', sign: 'sub', group: 'No corriente' },
    { id: 'intangibles', label: 'Activos Intangibles', niifCode: '16', sign: 'sum', group: 'No corriente' },
    { id: 'amortizacion', label: 'Amortización Acumulada', niifCode: '16', sign: 'sub', group: 'No corriente' },
    { id: 'otros-activos', label: 'Otros Activos no Corrientes', niifCode: '18', sign: 'sum', group: 'No corriente' }
  ],
  pasivo: [
    { id: 'proveedores', label: 'Proveedores', niifCode: '21', sign: 'sum', group: 'Corriente' },
    { id: 'documentos-cxp', label: 'Documentos por Pagar', niifCode: '21', sign: 'sum', group: 'Corriente' },
    { id: 'cuentas-por-pagar', label: 'Cuentas por Pagar Comerciales', niifCode: '21', sign: 'sum', group: 'Corriente' },
    { id: 'impuestos-por-pagar', label: 'Impuestos por Pagar', niifCode: '24', sign: 'sum', group: 'Corriente' },
    { id: 'retenciones', label: 'Retenciones por Pagar', niifCode: '24', sign: 'sum', group: 'Corriente' },
    { id: 'obligaciones-laborales', label: 'Obligaciones Laborales', niifCode: '25', sign: 'sum', group: 'Corriente' },
    { id: 'prestamos-cp', label: 'Préstamos a Corto Plazo', niifCode: '22', sign: 'sum', group: 'Corriente' },
    { id: 'provisiones', label: 'Provisiones', niifCode: '26', sign: 'sum', group: 'Corriente' },
    { id: 'prestamos-lp', label: 'Préstamos a Largo Plazo', niifCode: '22', sign: 'sum', group: 'No corriente' },
    { id: 'pasivos-diferidos', label: 'Pasivos Diferidos', niifCode: '27', sign: 'sum', group: 'No corriente' },
    { id: 'otros-pasivos', label: 'Otros Pasivos', niifCode: '28', sign: 'sum', group: 'No corriente' }
  ],
  patrimonio: [
    { id: 'capital', label: 'Capital Social', niifCode: '31', sign: 'sum', group: 'Capital' },
    { id: 'aportaciones', label: 'Aportaciones de Socios', niifCode: '31', sign: 'sum', group: 'Capital' },
    { id: 'reserva-legal', label: 'Reserva Legal', niifCode: '32', sign: 'sum', group: 'Reservas' },
    { id: 'reservas', label: 'Reservas', niifCode: '32', sign: 'sum', group: 'Reservas' },
    { id: 'resultados-acum', label: 'Resultados Acumulados', niifCode: '33', sign: 'sum', group: 'Resultados' },
    { id: 'utilidades', label: 'Utilidades Acumuladas', niifCode: '33', sign: 'sum', group: 'Resultados' },
    { id: 'perdidas', label: 'Pérdidas Acumuladas', niifCode: '33', sign: 'sub', group: 'Resultados' },
    { id: 'resultado-ejercicio', label: 'Resultado del Ejercicio', niifCode: '33', sign: 'sum', group: 'Resultados' }
  ],
  ingreso: [
    { id: 'ventas', label: 'Ventas de Bienes', niifCode: '41', sign: 'sum', group: 'Operativos' },
    { id: 'servicios', label: 'Prestación de Servicios', niifCode: '41', sign: 'sum', group: 'Operativos' },
    { id: 'otros-ingresos', label: 'Otros Ingresos', niifCode: '45', sign: 'sum', group: 'No operativos' },
    { id: 'ingresos-financieros', label: 'Ingresos Financieros', niifCode: '45', sign: 'sum', group: 'No operativos' }
  ],
  gasto: [
    { id: 'costo-venta', label: 'Costo de Ventas', niifCode: '51', sign: 'sum', group: 'Costo' },
    { id: 'gastos-admin', label: 'Gastos de Administración', niifCode: '52', sign: 'sum', group: 'Operativos' },
    { id: 'gastos-venta', label: 'Gastos de Venta', niifCode: '53', sign: 'sum', group: 'Operativos' },
    { id: 'gastos-financieros', label: 'Gastos Financieros', niifCode: '54', sign: 'sum', group: 'No operativos' },
    { id: 'otros-gastos', label: 'Otros Gastos', niifCode: '55', sign: 'sum', group: 'No operativos' }
  ]
};

// Tipos de cuenta permitidos según el estado financiero.
export const STATE_TYPES: Record<string, TypeKey[]> = {
  balance: ['activo', 'pasivo', 'patrimonio'],
  trial_balance: ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto'],
  results: ['ingreso', 'gasto'],
  equity_changes: ['patrimonio'],
  cash_flow: ['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto']
};

export const STATE_LABELS: Record<string, string> = {
  balance: 'Balance General',
  trial_balance: 'Balance de Comprobación',
  results: 'Estado de Resultados',
  equity_changes: 'Estado de Cambios en el Patrimonio',
  cash_flow: 'Flujo de Efectivo'
};

// Naturaleza del período según el estado (NIIF Pymes).
export const PERIOD_NATURE: Record<string, 'point_in_time' | 'range'> = {
  balance: 'point_in_time',
  trial_balance: 'range',
  results: 'range',
  equity_changes: 'range',
  cash_flow: 'range'
};
