export const StatusDot = ({ status }) => {
  if (status === "expired") return <span title="Изтекъл">🔴</span>;
  if (status === "expiring-soon") return <span title="Изтича скоро">🟡</span>;
  if (status === "valid") return <span title="Валиден">🟢</span>;
  return <span title="Няма данни">⚪</span>;
};

export const eventColor = (status) => {
  if (status === "Планирано") return "bg-blue-500";
  if (status === "В процес") return "bg-orange-500";
  if (status === "Изпълнено") return "bg-green-500";
  return "bg-slate-500";
};
