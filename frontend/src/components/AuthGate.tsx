import { useState, useEffect, type ReactNode } from 'react';
import { Lock, KeyRound, ShieldCheck, Eye, EyeOff, Copy, Check, ArrowLeft, RotateCcw, FileUp, Rocket } from 'lucide-react';
import { setSessionPassword } from '../utils/authSession';
import './AuthGate.css';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'loading' | 'welcome' | 'setup' | 'login' | 'recover' | 'restore'>('loading');
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        const res = await ipcRenderer.invoke('auth-status');
        if (res?.disabled) { setUnlocked(true); return; }
        setMode(res?.hasPassword ? 'login' : 'welcome');
      } catch (e) {
        // Sin Electron (navegador): permitir acceso directo.
        setUnlocked(true);
      }
    }
    check();
  }, []);

  const handleRestore = async () => {
    if (!password) { setError('Ingresa la contraseña de tu copia de seguridad.'); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('import-backup', { password });
      if (res?.success) {
        // La aplicación se reinicia sola tras importar (app.relaunch).
        alert('Copia restaurada. La aplicación se reiniciará con tus datos.');
      } else if (!res?.canceled) {
        setError(res?.error || 'No fue posible restaurar la copia. Revisa la contraseña.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al restaurar la copia.');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) { setError('La contraseña debe tener al menos 4 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('auth-setup', password);
      if (res?.success) {
        setGeneratedCode(res.recoveryCode);
        setSessionPassword(password);
      }
    } catch (err: any) {
      setError(err?.message || 'No fue posible configurar la contraseña.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('auth-login', password);
      if (res?.success) {
        setSessionPassword(password);
        setUnlocked(true);
      } else {
        setError(res?.error || 'Contraseña incorrecta.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión.');
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { ipcRenderer } = (window as any).require('electron');
      const res = await ipcRenderer.invoke('auth-recover', { recoveryCode, newPassword });
      if (res?.success) {
        setSessionPassword(newPassword);
        setMode('login');
        setError('');
        setPassword(newPassword);
        alert('Contraseña restablecida. Inicia sesión con tu nueva contraseña.');
      } else {
        setError(res?.error || 'Código de recuperación inválido.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al restablecer.');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <div className="auth-logo">
          <Lock size={22} />
          <span>PRISMA <strong>Analytics</strong></span>
        </div>

        {mode === 'loading' && <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>}

        {mode === 'welcome' && (
          <div>
            <h2>Bienvenido a Prisma Analytics</h2>
            <p className="auth-sub">¿Ya tienes una copia de seguridad? Puedes restaurarla para recuperar tus datos en este equipo, o empezar desde cero.</p>
            <button className="btn-primary auth-submit" onClick={() => { setMode('restore'); setError(''); }}><FileUp size={17} /> Restaurar una copia existente</button>
            <button className="btn-secondary auth-submit" onClick={() => { setMode('setup'); setError(''); }} style={{ marginTop: '0.5rem' }}><Rocket size={17} /> Empezar de cero</button>
          </div>
        )}

        {mode === 'restore' && (
          <form onSubmit={handleRestore}>
            <button className="auth-back" type="button" onClick={() => setMode('welcome')}><ArrowLeft size={16} /> Volver</button>
            <h2>Restaurar copia de seguridad</h2>
            <p className="auth-sub">Selecciona tu archivo <code>.pbackup</code> e ingresa la contraseña con la que lo creaste. Se restaurarán tus datos, configuración y claves.</p>
            <label>Contraseña de la copia</label>
            <div className="auth-input">
              <KeyRound size={17} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña maestra" autoFocus />
              <button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary auth-submit" type="submit"><FileUp size={17} /> Elegir archivo y restaurar</button>
          </form>
        )}

        {mode === 'setup' && !generatedCode && (
          <form onSubmit={handleSetup}>
            <h2>Bienvenido</h2>
            <p className="auth-sub">Configura una contraseña para proteger la información de tus clientes.</p>
            <label>Contraseña maestra</label>
            <div className="auth-input">
              <KeyRound size={17} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Crea tu contraseña" autoFocus />
              <button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            <label>Confirmar contraseña</label>
            <div className="auth-input">
              <KeyRound size={17} />
              <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repite la contraseña" />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary auth-submit" type="submit"><ShieldCheck size={17} /> Crear contraseña</button>
          </form>
        )}

        {mode === 'setup' && generatedCode && (
          <div>
            <h2>Guarda tu código de recuperación</h2>
            <p className="auth-sub">Si olvidas tu contraseña, este código te permitirá restablecerla. Guárdalo en un lugar seguro.</p>
            <div className="auth-code">
              <code>{generatedCode}</code>
              <button onClick={copyCode}>{copied ? <Check size={17} /> : <Copy size={17} />}</button>
            </div>
            <button className="btn-primary auth-submit" onClick={() => { setSessionPassword(password); setUnlocked(true); }}>Entrar a la aplicación</button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <h2>Desbloquear</h2>
            <p className="auth-sub">Ingresa tu contraseña maestra para acceder.</p>
            <label>Contraseña</label>
            <div className="auth-input">
              <Lock size={17} />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña maestra" autoFocus />
              <button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary auth-submit" type="submit">Entrar</button>
            <button className="auth-link" type="button" onClick={() => { setMode('recover'); setError(''); }}>¿Olvidaste tu contraseña?</button>
          </form>
        )}

        {mode === 'recover' && (
          <form onSubmit={handleRecover}>
            <button className="auth-back" type="button" onClick={() => setMode('login')}><ArrowLeft size={16} /> Volver</button>
            <h2>Recuperar contraseña</h2>
            <p className="auth-sub">Ingresa tu código de recuperación y una nueva contraseña.</p>
            <label>Código de recuperación</label>
            <div className="auth-input">
              <RotateCcw size={17} />
              <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} placeholder="PRISMA-XXXX-XXXX" />
            </div>
            <label>Nueva contraseña</label>
            <div className="auth-input">
              <KeyRound size={17} />
              <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nueva contraseña" />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn-primary auth-submit" type="submit">Restablecer</button>
          </form>
        )}
      </div>
      <p className="auth-footer">Los datos se almacenan localmente en este equipo de forma protegida.</p>
    </div>
  );
}
