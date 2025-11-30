import React from 'react';
import { createPortal } from 'react-dom';

export interface FloatingMenuItem {
  id: string;
  label: string | React.ReactNode;
  onSelect: () => void | Promise<void>;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface FloatingMenuProps {
  trigger: (props: { open: boolean; toggle: (e: React.MouseEvent | React.KeyboardEvent) => void; ref: React.Ref<any>; }) => React.ReactNode;
  items: FloatingMenuItem[];
  align?: 'start' | 'end';
  sideOffset?: number; // vertical gap in px
  menuWidth?: number; // px width, fallback to 160
  onOpenChange?: (open: boolean) => void;
  closeOnSelect?: boolean;
  zIndex?: number;
  className?: string; // extra class for menu container
}

// Reusable floating contextual menu rendered via portal, with simple positioning logic.
export const FloatingMenu: React.FC<FloatingMenuProps> = ({
  trigger,
  items,
  align = 'end',
  sideOffset = 8,
  menuWidth = 160,
  onOpenChange,
  closeOnSelect = true,
  zIndex = 50,
  className = '',
}) => {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const instanceIdRef = React.useRef(`floating-menu-${Math.random().toString(36).slice(2)}`);
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

  const toggle = React.useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setOpen(prev => {
      const next = !prev;
      if (next) {
        const el = btnRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const x = align === 'end' ? rect.right - menuWidth : rect.left;
          const y = rect.bottom + sideOffset;
          setPos({ x, y });
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('floating-menu-open', { detail: instanceIdRef.current }));
        }
      } else {
        setPos(null);
      }
      onOpenChange?.(next);
      return next;
    });
  }, [align, menuWidth, onOpenChange, sideOffset]);

  // Close on outside click / escape
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false); setPos(null); onOpenChange?.(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false); setPos(null); onOpenChange?.(false);
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onOpenChange]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail === instanceIdRef.current) {
        return;
      }
      setOpen(false);
      setPos(null);
      onOpenChange?.(false);
    };
    window.addEventListener('floating-menu-open', handleOpen as EventListener);
    return () => {
      window.removeEventListener('floating-menu-open', handleOpen as EventListener);
    };
  }, [onOpenChange]);

  useIsomorphicLayoutEffect(() => {
    if (!open || !pos) {
      return;
    }
    const menuEl = menuRef.current;
    const triggerEl = btnRef.current;
    if (!menuEl || !triggerEl) {
      return;
    }

    const menuRect = menuEl.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let nextX = pos.x;
    let nextY = pos.y;
    let changed = false;

    const horizontalPadding = 8;
    if (menuRect.right > viewportWidth - horizontalPadding) {
      nextX = Math.max(horizontalPadding, viewportWidth - menuRect.width - horizontalPadding);
      changed = true;
    }
    if (menuRect.left < horizontalPadding) {
      nextX = horizontalPadding;
      changed = true;
    }

    const verticalPadding = 8;
    if (menuRect.bottom > viewportHeight - verticalPadding) {
      const candidateTop = triggerRect.top - menuRect.height - sideOffset;
      if (candidateTop >= verticalPadding) {
        nextY = candidateTop;
        changed = true;
      } else {
        nextY = Math.max(verticalPadding, viewportHeight - menuRect.height - verticalPadding);
        changed = true;
      }
    }
    if (menuRect.top < verticalPadding) {
      const candidateBottom = triggerRect.bottom + sideOffset;
      nextY = Math.max(verticalPadding, Math.min(candidateBottom, viewportHeight - menuRect.height - verticalPadding));
      changed = true;
    }

    if (changed && (Math.round(nextX) !== Math.round(pos.x) || Math.round(nextY) !== Math.round(pos.y))) {
      setPos({ x: nextX, y: nextY });
    }
  }, [open, pos, sideOffset, items.length]);

  const handleSelect = async (item: FloatingMenuItem) => {
    if (item.disabled) return;
    await item.onSelect();
    if (closeOnSelect) {
      setOpen(false); setPos(null); onOpenChange?.(false);
    }
  };

  return (
    <>
      {trigger({ open, toggle, ref: btnRef })}
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className={`fixed rounded-lg border border-slate-200 bg-white shadow-lg focus:outline-none ${className}`}
          style={{ left: pos.x, top: pos.y, width: menuWidth, zIndex }}
          role="menu"
        >
          <ul className="py-1">
            {items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={() => void handleSelect(item)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 hover:bg-slate-50 ${item.className ?? ''}`}
                  role="menuitem"
                >
                  {item.icon && <span className="shrink-0" aria-hidden>{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
};

export default FloatingMenu;
