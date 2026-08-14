export const mockFinancialData = {
  empresa: "BENGALA AUDIOVISUAL, S.A. DE C.V.",
  periodos: [
    {
      year: 2024,
      balance_general: {
        total_activos: 105655.67,
        activos_corrientes: 84655.67,
        desglose_activos: [
          { cuenta: 'Efectivo y Equivalentes', monto: 15655.67 },
          { cuenta: 'Cuentas por Cobrar Comerciales', monto: 45000.00 },
          { cuenta: 'Inventarios', monto: 24000.00 },
          { cuenta: 'Propiedad, Planta y Equipo', monto: 21000.00 }
        ],
        activos_no_corrientes: 21000.00,
        total_pasivos: 85681.15,
        pasivos_corrientes: 76681.15,
        desglose_pasivos: [
          { cuenta: 'Préstamos Bancarios a Corto Plazo', monto: 35000.00 },
          { cuenta: 'Cuentas por Pagar Proveedores', monto: 41681.15 },
          { cuenta: 'Obligaciones a Largo Plazo', monto: 9000.00 }
        ],
        pasivos_no_corrientes: 9000.00,
        total_patrimonio: 19974.52,
        desglose_patrimonio: [
          { cuenta: 'Capital Social', monto: 10000.00 },
          { cuenta: 'Utilidades Acumuladas', monto: 9974.52 }
        ]
      },
      estado_resultados: {
        ingresos_ventas: 350400.00,
        costo_ventas: 185000.00,
        utilidad_bruta: 165400.00,
        gastos_operativos: 140000.00,
        utilidad_operativa: 25400.00,
        intereses_impuestos: 8000.00,
        utilidad_neta: 17400.00
      }
    },
    {
      year: 2025,
      balance_general: {
        total_activos: 125500.00,
        activos_corrientes: 95500.00,
        desglose_activos: [
          { cuenta: 'Efectivo y Equivalentes', monto: 25500.00 },
          { cuenta: 'Cuentas por Cobrar Comerciales', monto: 42000.00 },
          { cuenta: 'Inventarios', monto: 28000.00 },
          { cuenta: 'Propiedad, Planta y Equipo', monto: 30000.00 }
        ],
        activos_no_corrientes: 30000.00,
        total_pasivos: 92000.00,
        pasivos_corrientes: 80000.00,
        desglose_pasivos: [
          { cuenta: 'Préstamos Bancarios a Corto Plazo', monto: 25000.00 },
          { cuenta: 'Cuentas por Pagar Proveedores', monto: 55000.00 },
          { cuenta: 'Obligaciones a Largo Plazo', monto: 12000.00 }
        ],
        pasivos_no_corrientes: 12000.00,
        total_patrimonio: 33500.00,
        desglose_patrimonio: [
          { cuenta: 'Capital Social', monto: 10000.00 },
          { cuenta: 'Utilidades Acumuladas', monto: 23500.00 }
        ]
      },
      estado_resultados: {
        ingresos_ventas: 410000.00,
        costo_ventas: 210000.00,
        utilidad_bruta: 200000.00,
        gastos_operativos: 155000.00,
        utilidad_operativa: 45000.00,
        intereses_impuestos: 11000.00,
        utilidad_neta: 34000.00
      }
    }
  ]
};

// Utilidades para calcular Ratios
export function getKPIs(yearData: any) {
  const bg = yearData.balance_general;
  const er = yearData.estado_resultados;

  const liquidez = bg.activos_corrientes / bg.pasivos_corrientes;
  const roe = (er.utilidad_neta / bg.total_patrimonio) * 100;
  const roa = (er.utilidad_neta / bg.total_activos) * 100;
  const endeudamiento = (bg.total_pasivos / bg.total_activos) * 100;

  return {
    liquidez: liquidez.toFixed(2),
    roe: roe.toFixed(2) + "%",
    roa: roa.toFixed(2) + "%",
    endeudamiento: endeudamiento.toFixed(2) + "%"
  };
}

// Utilidades para calcular Capital de Trabajo y CCC
export function getWorkingCapitalMetrics(yearData: any) {
  const bg = yearData.balance_general;
  const er = yearData.estado_resultados;

  const getAccount = (list: any[], name: string) => list.find((i: any) => i.cuenta === name)?.monto || 0;

  const cxc = getAccount(bg.desglose_activos, 'Cuentas por Cobrar Comerciales');
  const inventario = getAccount(bg.desglose_activos, 'Inventarios');
  const cxp = getAccount(bg.desglose_pasivos, 'Cuentas por Pagar Proveedores');
  
  const ventas = er.ingresos_ventas;
  const costoVentas = er.costo_ventas;

  // DSO = (CxC / Ventas) * 365
  const dso = Math.round((cxc / ventas) * 365);
  
  // DIO = (Inventario / Costo Ventas) * 365
  const dio = Math.round((inventario / costoVentas) * 365);
  
  // DPO = (CxP / Costo Ventas) * 365
  const dpo = Math.round((cxp / costoVentas) * 365);
  
  // CCC = DIO + DSO - DPO
  const ccc = dio + dso - dpo;

  return { dso, dio, dpo, ccc, cxc, inventario, cxp, ventas, costoVentas };
}
