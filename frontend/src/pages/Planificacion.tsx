import { useState } from 'react';
import { MessageSquare, ChevronRight, ChevronLeft, Calendar, Filter, Plus, LayoutGrid, CalendarDays } from 'lucide-react';
import { initialTasks, type AuditTask, type TaskStatus } from '../utils/mockTasks';
import './Planificacion.css';

const STATUS_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'Por Hacer' },
  { id: 'in-progress', title: 'En Progreso' },
  { id: 'review', title: 'En Revisión' },
  { id: 'done', title: 'Completado' }
];

export default function Planificacion() {
  const [tasks, setTasks] = useState<AuditTask[]>(initialTasks);
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar'>('kanban');

  // Hardcoded month calendar: August 2025 (Starts on Friday, 31 days)
  const daysInMonth = 31;
  const startDayOfWeek = 5; // 0=Sun, 1=Mon... 5=Fri
  const blankDays = Array.from({ length: startDayOfWeek }, (_, i) => i);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const moveTask = (taskId: string, direction: 'forward' | 'backward') => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const currentIndex = STATUS_COLUMNS.findIndex(col => col.id === task.status);
        let newIndex = currentIndex;
        
        if (direction === 'forward' && currentIndex < STATUS_COLUMNS.length - 1) {
          newIndex = currentIndex + 1;
        } else if (direction === 'backward' && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }

        return { ...task, status: STATUS_COLUMNS[newIndex].id };
      }
      return task;
    }));
  };

  const getPriorityClass = (priority: string) => {
    switch(priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch(priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return '';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'mine') return task.assigneeInitials === 'AL'; // Asumiendo Ana López como usuaria actual
    if (filter === 'high') return task.priority === 'high';
    return true;
  });

  return (
    <div className="planificacion-container fade-in">
      {/* Header */}
      <div className="planificacion-header">
        <div>
          <h1 className="planificacion-title">Planificación y Asignaciones</h1>
          <p className="planificacion-subtitle">Control del equipo de auditoría y fechas de entrega.</p>
        </div>
        
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid size={18} /> Tablero
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays size={18} /> Calendario
          </button>
        </div>

        <div className="header-actions">
          <div className="filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <Filter size={16} /> Todos
            </button>
            <button 
              className={`filter-btn ${filter === 'mine' ? 'active' : ''}`}
              onClick={() => setFilter('mine')}
            >
              Mis Tareas
            </button>
            <button 
              className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
              onClick={() => setFilter('high')}
            >
              Urgentes
            </button>
          </div>
          <button className="primary-action-btn">
            <Plus size={20} /> Nueva Tarea
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="calendar-view glass animate-fade-in">
          <div className="calendar-header-row">
            <h2>Agosto 2025</h2>
            <div className="calendar-legend">
              <span className="legend-item"><span className="dot high"></span> Alta Prioridad</span>
              <span className="legend-item"><span className="dot medium"></span> Media</span>
              <span className="legend-item"><span className="dot low"></span> Baja</span>
            </div>
          </div>
          
          <div className="calendar-grid">
            <div className="weekday-header">Dom</div>
            <div className="weekday-header">Lun</div>
            <div className="weekday-header">Mar</div>
            <div className="weekday-header">Mié</div>
            <div className="weekday-header">Jue</div>
            <div className="weekday-header">Vie</div>
            <div className="weekday-header">Sáb</div>

            {blankDays.map(b => <div key={`blank-${b}`} className="calendar-day empty"></div>)}
            
            {monthDays.map(day => {
              const formattedDate = `2025-08-${day.toString().padStart(2, '0')}`;
              const dayTasks = filteredTasks.filter(t => t.dueDate === formattedDate);
              const isToday = day === 15; // Simulated today

              return (
                <div key={`day-${day}`} className={`calendar-day ${isToday ? 'today' : ''}`}>
                  <div className="day-number">{day}</div>
                  <div className="day-tasks-container">
                    {dayTasks.map(task => (
                      <div key={task.id} className={`calendar-task-pill priority-${task.priority}`} title={`${task.title} - ${task.client}`}>
                        {task.assigneeInitials} | {task.title.substring(0, 15)}...
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="kanban-board animate-fade-in">
          {STATUS_COLUMNS.map((column, colIndex) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
          
          return (
            <div key={column.id} className="kanban-column glass">
              <div className="column-header">
                <h3>{column.title}</h3>
                <span className="task-count">{columnTasks.length}</span>
              </div>
              
              <div className="task-list">
                {columnTasks.map(task => (
                  <div key={task.id} className="task-card fade-in">
                    
                    <div className="task-header">
                      <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className="task-id">{task.id}</span>
                    </div>

                    <h4 className="task-title">{task.title}</h4>
                    <p className="task-client">{task.client}</p>

                    <div className="task-footer">
                      <div className="task-meta">
                        <span className="meta-item" title="Fecha límite">
                          <Calendar size={14} /> {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                        {task.comments > 0 && (
                          <span className="meta-item" title="Comentarios">
                            <MessageSquare size={14} /> {task.comments}
                          </span>
                        )}
                      </div>
                      
                      <div className="avatar" title={task.assignee}>
                        {task.assigneeInitials}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="task-actions">
                      <button 
                        className="action-btn"
                        onClick={() => moveTask(task.id, 'backward')}
                        disabled={colIndex === 0}
                        title="Mover atrás"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => moveTask(task.id, 'forward')}
                        disabled={colIndex === STATUS_COLUMNS.length - 1}
                        title="Avanzar"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="empty-column">
                    No hay tareas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
