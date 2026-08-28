"use client";

/**
 * Shared modal shell: dimmed backdrop (fades in), centered rounded-2xl panel
 * (scales in), sticky header/footer so a tall form body scrolls in between.
 */
export function ModalBackdrop({
  onClose,
  children,
}: {
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {children}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

export function ModalPanel({
  children,
  maxWidth = "max-w-3xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className={`my-auto w-full ${maxWidth} rounded-2xl bg-white shadow-2xl animate-[modalIn_180ms_ease-out]`}
    >
      {children}
    </div>
  );
}

export function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
      <h2 className="text-lg font-medium">{title}</h2>
      <button
        onClick={onClose}
        className="rounded-lg p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black"
        aria-label="Đóng"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-black/10 px-6 py-4">
      {children}
    </div>
  );
}
