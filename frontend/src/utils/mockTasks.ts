export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface AuditTask {
  id: string;
  title: string;
  client: string;
  assignee: string;
  assigneeInitials: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  comments: number;
}

export const initialTasks: AuditTask[] = [
  {
    id: "TSK-001",
    title: "Revisión Libro de Compras (Anexo F-07)",
    client: "Bengala Audiovisual S.A.",
    assignee: "Ana López",
    assigneeInitials: "AL",
    priority: "high",
    status: "todo",
    dueDate: "2025-08-20",
    comments: 2
  },
  {
    id: "TSK-002",
    title: "Cálculo de Depreciación (NIIF 16)",
    client: "Industrias Galaxy",
    assignee: "Carlos Méndez",
    assigneeInitials: "CM",
    priority: "medium",
    status: "todo",
    dueDate: "2025-08-22",
    comments: 0
  },
  {
    id: "TSK-003",
    title: "Conciliación Bancaria (Cta. Agrícola)",
    client: "Bengala Audiovisual S.A.",
    assignee: "Juan Pérez",
    assigneeInitials: "JP",
    priority: "high",
    status: "in-progress",
    dueDate: "2025-08-18",
    comments: 4
  },
  {
    id: "TSK-004",
    title: "Muestreo Aleatorio de Facturas",
    client: "Tech Solutions",
    assignee: "Ana López",
    assigneeInitials: "AL",
    priority: "low",
    status: "in-progress",
    dueDate: "2025-08-25",
    comments: 1
  },
  {
    id: "TSK-005",
    title: "Validación de Nómina vs ISSS",
    client: "Constructora del Sol",
    assignee: "Carlos Méndez",
    assigneeInitials: "CM",
    priority: "medium",
    status: "review",
    dueDate: "2025-08-15",
    comments: 3
  },
  {
    id: "TSK-006",
    title: "Bancarización de Proveedores",
    client: "Bengala Audiovisual S.A.",
    assignee: "Juan Pérez",
    assigneeInitials: "JP",
    priority: "high",
    status: "review",
    dueDate: "2025-08-16",
    comments: 5
  },
  {
    id: "TSK-007",
    title: "Cierre de Cuentas por Pagar",
    client: "Farmacias Centrales",
    assignee: "Ana López",
    assigneeInitials: "AL",
    priority: "low",
    status: "done",
    dueDate: "2025-08-10",
    comments: 0
  },
  {
    id: "TSK-008",
    title: "Revisión Declaración Renta Anual",
    client: "Grupo Maderero",
    assignee: "Juan Pérez",
    assigneeInitials: "JP",
    priority: "high",
    status: "done",
    dueDate: "2025-08-12",
    comments: 8
  }
];
