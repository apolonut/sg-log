import React from "react";
export default function Tabs({ active, onChange, items }) {
  return (
    <div className="flex justify-center mb-8 gap-2 flex-wrap">
      {items.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-2 rounded-md font-semibold ${
            active === t.key ? "bg-white shadow" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
