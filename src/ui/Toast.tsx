'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';

type ToastOpts = { undo?: () => void };
type ToastFn = (msg: string, opts?: ToastOpts) => void;
const Ctx = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string; undo?: () => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<ToastFn>((msg, opts) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, undo: opts?.undo });
    timer.current = setTimeout(() => setToast(null), opts?.undo ? 5000 : 3200);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite">
        {toast && (
          <div className="toast" role="status" key={toast.id}>
            <span className="ok"><Icon name="check" /></span>
            <span>{toast.msg}</span>
            {toast.undo ? (
              <button
                type="button"
                onClick={() => {
                  const u = toast.undo;
                  setToast(null);
                  u?.();
                }}
              >
                Desfazer
              </button>
            ) : (
              <span style={{ width: 8 }} />
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
