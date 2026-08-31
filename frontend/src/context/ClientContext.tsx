import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface AccountMapping {
  originalName: string;
  originalBalance: number;
  niifCode: string;
  niifName: string;
}

export interface Client {
  id: number;
  name: string;
  alias?: string;
  razonSocial?: string;
  nrc?: string;
  nit?: string;
  giro?: string;
  score: number;
  income: number;
  expenses: number;
  assets: number;
  liabilities: number;
  equity: number;
  margin: number;
  status: string;
  hasData: boolean;
  accounts: AccountMapping[];
}

export type NewClientInput = Omit<Client, 'id' | 'status' | 'score' | 'income' | 'expenses' | 'assets' | 'liabilities' | 'equity' | 'margin' | 'hasData' | 'accounts'>;

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  setActiveClient: (client: Client | null) => void;
  addClient: (client: NewClientInput) => Promise<void>;
  resetClientData: (clientId: number) => void;
  setClientDataLoaded: (clientId: number, calculatedData?: { income: number; expenses: number; assets: number; liabilities: number; equity: number; margin: number; score: number }, mappedAccounts?: AccountMapping[]) => void;
  pendingMappingData: { data: AccountMapping[], status: string | null, diff: number, totals: any, statementType?: string, detectedCompany?: string, detectedCurrency?: string, metadata?: any } | null;
  setPendingMappingData: (data: { data: AccountMapping[], status: string | null, diff: number, totals: any, statementType?: string, detectedCompany?: string, detectedCurrency?: string, metadata?: any } | null) => void;
  reportDraft: any | null;
  setReportDraft: (draft: any | null) => void;
  activePeriod: { year: number, month: number };
  setActivePeriod: (period: { year: number, month: number }) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [activePeriod, setActivePeriod] = useState<{ year: number, month: number }>({ year: 2026, month: 7 }); // Default for now
  
  // Draft states to survive tab switching
  const [pendingMappingData, setPendingMappingData] = useState<{ data: AccountMapping[], status: string | null, diff: number, totals: any, statementType?: string, detectedCompany?: string, detectedCurrency?: string, metadata?: any } | null>(null);
  const [reportDraft, setReportDraft] = useState<any | null>(null);

  // La memoria de React se reconstruye en cada arranque; SQLite es la fuente de verdad.
  useEffect(() => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.invoke('get-clients').then(async (rows: any[]) => {
        // Verificar en SQLite si cada cliente tiene documentos cargados (hasData real).
        const loadedClients: Client[] = [];
        for (const row of rows) {
          let hasData = false;
          try {
            const status = await ipcRenderer.invoke('get-client-has-data', row.id);
            hasData = Boolean(status?.hasData);
          } catch (e) {
            hasData = false;
          }
          loadedClients.push({
            id: row.id,
            name: row.name,
            nrc: row.nrc,
            nit: row.nit,
            giro: row.sector,
            status: row.status === 'active' ? 'Activo' : row.status,
            score: 0,
            income: 0,
            expenses: 0,
            assets: 0,
            liabilities: 0,
            equity: 0,
            margin: 0,
            hasData,
            accounts: []
          });
        }
        setClients(loadedClients);
        if (loadedClients.length && !activeClient) {
          setActiveClient(loadedClients[0]);
        }
      });
    } catch (e) {
      console.warn('Electron IPC no disponible, iniciando con clientes en memoria');
    }
  }, []);

  // Sync reportDraft with SQLite
  useEffect(() => {
    if (activeClient && activePeriod) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('get-report-draft', {
          clientId: activeClient.id,
          periodYear: activePeriod.year,
          periodMonth: activePeriod.month
        }).then((res: any) => {
          if (res.success && res.draft) {
            setReportDraft(res.draft);
          } else {
            setReportDraft(null);
          }
        });
      } catch (e) {
        console.warn('Electron IPC not available, using local memory');
      }
    }
  }, [activeClient, activePeriod]);

  // Wrapped setReportDraft that also saves to SQLite
  const setAndSaveReportDraft = (draft: any) => {
    setReportDraft(draft);
    if (activeClient && activePeriod) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('save-report-draft', {
          clientId: activeClient.id,
          periodYear: activePeriod.year,
          periodMonth: activePeriod.month,
          draftContent: draft
        });
      } catch (e) {
        // Ignore in browser
      }
    }
  };

  const addClient = async (input: NewClientInput) => {
    let id = Date.now();
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const saved = await ipcRenderer.invoke('create-client', {
        name: input.name,
        nit: input.nit,
        nrc: input.nrc,
        sector: input.giro
      });
      id = saved.id;
    } catch (e) {
      console.warn('Cliente creado solo en memoria porque SQLite no está disponible');
    }

    const newClient: Client = {
      ...input, id, score: 0, income: 0, expenses: 0, assets: 0,
      liabilities: 0, equity: 0, margin: 0, status: 'Recién Creado',
      hasData: false, accounts: []
    };

    setClients(prev => [...prev, newClient]);
    setActiveClient(newClient);
  };

  const resetClientData = (clientId: number) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const resetData = { ...c, hasData: false, score: 0, income: 0, expenses: 0, assets: 0, liabilities: 0, equity: 0, margin: 0, status: 'Datos Reseteados', accounts: [] };
        if (activeClient?.id === clientId) {
          setActiveClient(resetData);
        }
        return resetData;
      }
      return c;
    }));
  };

  const setClientDataLoaded = (clientId: number, calculatedData?: { income: number; expenses: number; assets: number; liabilities: number; equity: number; margin: number; score: number }, mappedAccounts?: AccountMapping[]) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const updatedData = { 
          ...c, 
          hasData: true, 
          status: 'Datos Cargados',
          ...(mappedAccounts && { accounts: mappedAccounts }),
          ...(calculatedData && {
            income: calculatedData.income,
            expenses: calculatedData.expenses,
            assets: calculatedData.assets,
            liabilities: calculatedData.liabilities,
            equity: calculatedData.equity,
            margin: calculatedData.margin,
            score: calculatedData.score
          })
        };
        if (activeClient?.id === clientId) {
          setActiveClient(updatedData);
        }
        return updatedData;
      }
      return c;
    }));
  };

  return (
    <ClientContext.Provider value={{ 
      clients, activeClient, setActiveClient, addClient, resetClientData, setClientDataLoaded,
      pendingMappingData, setPendingMappingData,
      reportDraft, setReportDraft: setAndSaveReportDraft,
      activePeriod, setActivePeriod
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
