import React from "react";

export default function Modal({ open, onClose, children, className = "" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className={`bg-white rounded-xl p-6 w-[92%] max-w-[720px] relative shadow-2xl ${className}`} onClick={(e)=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-4 text-2xl text-slate-500 hover:text-slate-700" aria-label="Затвори">×</button>
        {children}
      </div>
    </div>
  );
}
