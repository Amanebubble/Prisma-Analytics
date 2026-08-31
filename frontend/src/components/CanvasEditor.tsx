import { useEffect, useRef } from 'react';
import Editor from '@hufe921/canvas-editor';
import type { IEditorData } from '@hufe921/canvas-editor';

interface CanvasEditorProps {
  initialContent: IEditorData | IEditorData['main'];
  onInit?: (editor: Editor) => void;
  onChange?: (content: any) => void;
}

export default function CanvasEditor({ initialContent, onInit, onChange }: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  // Refs estables para que no se re-ejecute la limpieza en cada render.
  const onChangeRef = useRef(onChange);
  const onInitRef = useRef(onInit);
  onChangeRef.current = onChange;
  onInitRef.current = onInit;

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      // Delay initialization to ensure DOM is fully laid out (fixes visual rendering bug)
      const initTimer = setTimeout(() => {
        if (!containerRef.current) return;
        
        editorRef.current = new Editor(containerRef.current, initialContent, {
          margins: [100, 120, 100, 120], // Typical A4 margins
          watermark: {
            data: 'PRISMA ANALYTICS',
            size: 100,
            color: 'rgba(200, 200, 200, 0.15)',
          },
          header: [
            {
              value: 'PRISMA ANALYTICS - Auditores y Consultores',
              size: 12,
              color: '#64748b',
            }
          ],
          footer: [
            {
              value: 'Dictamen Financiero Generado Automáticamente',
              size: 10,
              color: '#94a3b8',
            }
          ],
          pageMode: 'paging'
        } as any);

        if (onInitRef.current) {
          onInitRef.current(editorRef.current);
        }

        // Try to bind to content change
        try {
          if ((editorRef.current as any).listener) {
            (editorRef.current as any).listener.contentChange = () => {
              if (onChangeRef.current && editorRef.current) {
                onChangeRef.current((editorRef.current as any).command.getValue());
              }
            };
          }
        } catch (e) {
          console.error("Listener error", e);
        }
      }, 150);

      return () => clearTimeout(initTimer);
    }
  }, []); // Se inicializa una sola vez al montar.

  // Limpieza solo al desmontar el componente, no al cambiar props.
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        if (onChangeRef.current) {
           try {
             onChangeRef.current((editorRef.current as any).command.getValue());
           } catch (e) {}
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        editorRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="canvas-editor-container"
      style={{ 
        width: '100%',
        height: '100%',
        display: 'flex', 
        justifyContent: 'center', 
        backgroundColor: '#e2e8f0', // Canvas editor background for outside the paper
      }} 
    />
  );
}
