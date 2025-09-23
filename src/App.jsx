import React, { useEffect, useMemo, useState } from "react";

/* ========================= Helpers ========================= */

const parseBGDate = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split("/");
  if (parts.length !== 3) return null;
  const date = new Date(parts[2], parts[1] - 1, parts[0]);
  return isNaN(date.getTime()) ? null : date;
};
const toInputDate = (bg) => {
  if (!bg) return "";
  const p = bg.split("/");
  if (p.length !== 3) return "";
  return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
};
const fromInputDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
};

// срокове: "D/M/YYYY"
const checkExpiry = (dateString) => {
  if (!dateString) return { status: "N/A", days: Infinity };
  const dt = parseBGDate(dateString);
  if (!dt) return { status: "N/A", days: Infinity };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dt - today) / (1000 * 3600 * 24));
  if (diffDays < 0) return { status: "expired", days: diffDays };
  if (diffDays <= 30) return { status: "expiring-soon", days: diffDays };
  return { status: "valid", days: diffDays };
};

const getEventColor = (status) => {
  if (status === "Планирано") return "bg-blue-500 border-blue-600";
  if (status === "В процес") return "bg-orange-500 border-orange-600";
  if (status === "Изпълнено") return "bg-green-500 border-green-600";
  return "bg-slate-500 border-slate-600";
};

const StatusDot = ({ status }) => {
  if (status === "expired") return <span title="Изтекъл">🔴</span>;
  if (status === "expiring-soon") return <span title="Изтича скоро">🟡</span>;
  return <span title="Валиден">🟢</span>;
};

const DriverDisplay = ({ name, company }) => (
  <>
    {name}
    {company && <span className="text-slate-500 font-normal ml-1">/{company}/</span>}
  </>
);

/* ========================= Seed data ========================= */

const seedDrivers = [
  { id: "d1", name: "Борислав Георгиев", tractor: "А 50 22 MP", tanker: "A 08 36 ЕМ", contact: "7305300468", driverCardExpiry: "30/6/2025", adrExpiry: "2/3/2027", company: "" },
  { id: "d2", name: "Валери Върбанов",   tractor: "А 70 58 HT", tanker: "A 29 99 EM", contact: "5606164785", driverCardExpiry: "", adrExpiry: "", company: "" },
  { id: "d3", name: "Иван Ангелов",      tractor: "A 84 29 PB", tanker: "A 37 67 EM", contact: "6204280443", driverCardExpiry: "12/8/2025", adrExpiry: "20/8/2025", company: "" },
  { id: "d4", name: "Милен Иванов",      tractor: "А 78 09 НB", tanker: "A 41 17 EM", contact: "7810245147", driverCardExpiry: "4/1/2026", adrExpiry: "", company: "" },
  { id: "d5", name: "Моньо Монев",       tractor: "А 68 17 НТ", tanker: "A 39 23 EM", contact: "6212039049", driverCardExpiry: "4/4/2028", adrExpiry: "", company: "" },
  { id: "d6", name: "Панайот Кокалджиев",tractor: "А 64 29 PM", tanker: "A 58 34 EM", contact: "9709140480", driverCardExpiry: "", adrExpiry: "", company: "" },
  { id: "d7", name: "Станимир Инджов",   tractor: "А 74 29 PM", tanker: "A 37 87 EM", contact: "8209070607", driverCardExpiry: "3/1/2028", adrExpiry: "12/8/2026", company: "" },
  { id: "d8", name: "Стоян Кокалджиев",  tractor: "А 01 74 PB", tanker: "A 40 75 EM", contact: "7007300743", driverCardExpiry: "23/2/2026", adrExpiry: "26/5/2027", company: "" },
  { id: "d9", name: "Тодор Йовчев",      tractor: "А 49 54 HP", tanker: "A 28 44 EK", contact: "8503050522", driverCardExpiry: "19/4/2026", adrExpiry: "10/11/2026", company: "" },
  { id: "d10", name: "Георги Петров",    tractor: "СВ 1234 АР", tanker: "СВ 5678 ВВ", contact: "8001011234", driverCardExpiry: "15/10/2027", adrExpiry: "20/11/2028", company: "Транс ЕООД" }
];

const seedSchedules = [
  { id: "s1", komandirovka: "K-123", notes: "ПО: 12345", route: "София - Варна", driver: "Иван Ангелов", tractor: "A 84 29 PB", tanker: "A 37 67 EM", company: "Транс ЕООД", status: "В процес",  date: "30/8/2025", unloadDate: "31/8/2025" },
  { id: "s2", komandirovka: "",      notes: "ПО: 67890", route: "Бургас - София", driver: "Борислав Георгиев", tractor: "А 50 22 MP", tanker: "A 08 36 ЕМ", company: "Логистик АД", status: "Планирано", date: "5/9/2025",  unloadDate: "6/9/2025" },
];

const seedTrucks = [
  { id: "t1", number: "А 50 22 MP", type: "Влекач",   insuranceExpiry: "15/12/2025" },
  { id: "t2", number: "A 08 36 ЕМ", type: "Цистерна", insuranceExpiry: "15/12/2025" },
  { id: "t3", number: "A 70 58 HT", type: "Влекач",   insuranceExpiry: "20/11/2025" },
  { id: "t4", number: "A 84 29 PB", type: "Влекач",   insuranceExpiry: "5/10/2026" },
];

const seedCompanies = [
  { id: "c1", name: "Транс ЕООД", eik: "123456789", address: "София, ул. Примерна 1", mol: "Иван Иванов" },
  { id: "c2", name: "Логистик АД", eik: "987654321", address: "Пловдив, бул. България 2", mol: "Петър Петров" },
];

const seedRoutes = [
  { id: "r1", name: "София - Варна", duration: 1 },
  { id: "r2", name: "Бургас - София", duration: 1 },
  { id: "r3", name: "Катуница - Киато", duration: 2 },
  { id: "r4", name: "Русе - Плевен", duration: 1 },
  { id: "r5", name: "Благоевград - Атина", duration: 3 },
];

/* ========================= Basic UI Bits ========================= */

const Header = () => (
  <div className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white p-10 rounded-b-2xl">
    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">SG Logistics — Дашборд</h1>
    <p className="text-white/90 text-lg">Шофьори, курсове, техника и настройки — без вход и без база, с локално запазване.</p>
  </div>
);

const Tabs = ({ active, setActive }) => {
  const items = [
    { key: "dashboard", label: "Дашборд" },
    { key: "drivers",   label: "Шофьори" },
    { key: "schedule",  label: "График" },
    { key: "tehnika",   label: "Техника" },
    { key: "settings",  label: "Настройки" },
  ];
  return (
    <div className="flex justify-center mb-8 gap-2 flex-wrap">
      {items.map(t => (
        <button
          key={t.key}
          onClick={() => setActive(t.key)}
          className={`px-5 py-3 rounded-lg font-semibold text-sm md:text-base transition
            ${active === t.key ? "bg-white text-indigo-700 shadow border-b-4 border-indigo-600"
                               : "bg-white/80 hover:bg-white text-slate-700"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

const Modal = ({ open, onClose, className = "", children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className={`bg-white rounded-xl p-6 w-[92%] max-w-[720px] relative shadow-2xl ${className}`} onClick={(e)=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-4 text-2xl text-slate-500 hover:text-slate-700" aria-label="Затвори">×</button>
        {children}
      </div>
    </div>
  );
};

/* ========================= Modals ========================= */

const EditDriverModal = ({ open, onClose, driver, onSave, companies }) => (
  <Modal open={open} onClose={onClose}>
    <h2 className="text-2xl font-bold mb-4">{driver ? "Редакция на шофьор" : "Нов шофьор"}</h2>
    <form onSubmit={(e)=>{e.preventDefault();
      const f=e.target;
      const data={
        name:f.name.value.trim(),
        company:f.company.value,
        tractor:f.tractor.value.trim(),
        tanker:f.tanker.value.trim(),
        contact:f.contact.value.trim(),
        driverCardExpiry:f.driverCardExpiry.value?fromInputDate(f.driverCardExpiry.value):"",
        adrExpiry:f.adrExpiry.value?fromInputDate(f.adrExpiry.value):"",
      };
      onSave(data);
    }} className="space-y-3">
      <input name="name" className="input" placeholder="Име" defaultValue={driver?.name||""} required />
      <select name="company" className="input" defaultValue={driver?.company||""}>
        <option value="">Шофьор на SG</option>
        {companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input name="tractor" className="input" placeholder="Влекач" defaultValue={driver?.tractor||""}/>
        <input name="tanker"  className="input" placeholder="Цистерна" defaultValue={driver?.tanker||""}/>
      </div>
      <input name="contact" className="input" placeholder="Контакт (ЕГН)" defaultValue={driver?.contact||""}/>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="lbl">Ш.К. валидност</label><input type="date" name="driverCardExpiry" className="input" defaultValue={toInputDate(driver?.driverCardExpiry||"")}/></div>
        <div><label className="lbl">ADR валидност</label><input type="date" name="adrExpiry" className="input" defaultValue={toInputDate(driver?.adrExpiry||"")}/></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn cancel-btn">Отказ</button>
        <button type="submit" className="btn save-btn">Запази</button>
      </div>
    </form>
  </Modal>
);

const EditTruckModal = ({ open, onClose, truck, onSave }) => (
  <Modal open={open} onClose={onClose}>
    <h2 className="text-2xl font-bold mb-4">{truck ? "Редакция на ПС" : "Ново ПС"}</h2>
    <form onSubmit={(e)=>{e.preventDefault();
      const f=e.target;
      onSave({
        number:f.number.value.trim(),
        type:f.type.value,
        insuranceExpiry:f.insuranceExpiry.value?fromInputDate(f.insuranceExpiry.value):""
      });
    }} className="space-y-3">
      <input name="number" className="input" placeholder="Регистрационен номер" defaultValue={truck?.number||""} required/>
      <select name="type" className="input" defaultValue={truck?.type||"Влекач"}>
        <option>Влекач</option><option>Цистерна</option><option>Друго</option>
      </select>
      <div><label className="lbl">Застраховка</label><input type="date" name="insuranceExpiry" className="input" defaultValue={toInputDate(truck?.insuranceExpiry||"")}/></div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="btn cancel-btn">Отказ</button>
        <button type="submit" className="btn save-btn">Запази</button>
      </div>
    </form>
  </Modal>
);

const EditScheduleModal = ({ open, onClose, schedule, drivers, companies, routes, onSave, onDelete }) => {
  const [routeInput, setRouteInput] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  useEffect(()=>{ setRouteInput(schedule?.route||""); },[schedule]);

  const filteredRoutes = routeInput
    ? routes.filter(r=>r.name.toLowerCase().includes(routeInput.toLowerCase()))
    : [];

  const recalcUnload = (routeName, loadIso) => {
    const r = routes.find(x=>x.name===routeName);
    if (!r || !loadIso) return "";
    const d = new Date(loadIso);
    d.setDate(d.getDate()+r.duration);
    return d.toISOString().slice(0,10);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">{schedule?"Редакция на задача":"Нова задача"}</h2>
      <form onSubmit={(e)=>{e.preventDefault();
        const f=e.target;
        onSave({
          komandirovka:f.komandirovka.value.trim(),
          notes:f.notes.value.trim(),
          route:f.route.value.trim(),
          company:f.company.value,
          driver:f.driver.value,
          tractor:f.tractor.value.trim(),
          tanker:f.tanker.value.trim(),
          date:f.date.value?fromInputDate(f.date.value):"",
          unloadDate:f.unloadDate.value?fromInputDate(f.unloadDate.value):"",
          status:f.status.value
        });
      }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="komandirovka" className="input" placeholder="Командировъчен №" defaultValue={schedule?.komandirovka||""}/>
          <input name="notes" className="input" placeholder="Бележки (ПО и др.)" defaultValue={schedule?.notes||""}/>
        </div>
        <div className="relative">
          <input name="route" value={routeInput} onChange={(e)=>{setRouteInput(e.target.value); setShowSuggest(true);}} onFocus={()=>setShowSuggest(true)} onBlur={()=>setTimeout(()=>setShowSuggest(false),150)} className="input" placeholder="Релация" autoComplete="off"/>
          {showSuggest && filteredRoutes.length>0 && (
            <ul className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
              {filteredRoutes.map(r=>(
                <li key={r.id} onMouseDown={()=>{setRouteInput(r.name); setShowSuggest(false); const di=document.getElementById("date"); const ui=document.getElementById("unloadDate"); if(di&&ui){ui.value=recalcUnload(r.name,di.value);} }} className="p-2 hover:bg-slate-50 cursor-pointer">{r.name}</li>
              ))}
            </ul>
          )}
        </div>
        <select name="company" className="input" defaultValue={schedule?.company||""}>
          <option value="">Избери компания</option>
          {companies.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select name="driver" className="input" defaultValue={schedule?.driver||""}
          onChange={(e)=>{const d=drivers.find(x=>x.name===e.target.value); const tr=document.getElementById("tractor"); const tk=document.getElementById("tanker"); if(tr) tr.value=d?.tractor||""; if(tk) tk.value=d?.tanker||"";}}>
          <option value="">Изберете шофьор</option>
          {drivers.map(d=><option key={d.id} value={d.name}>{d.name}{d.company?` /${d.company}/`:""}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input id="tractor" name="tractor" className="input" placeholder="Влекач" defaultValue={schedule?.tractor||""}/>
          <input id="tanker"  name="tanker"  className="input" placeholder="Цистерна" defaultValue={schedule?.tanker||""}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="lbl">Дата на товарене</label>
            <input id="date" type="date" name="date" className="input" defaultValue={toInputDate(schedule?.date||"")}
              onChange={(e)=>{const ui=document.getElementById("unloadDate"); if(ui) ui.value=recalcUnload(routeInput,e.target.value);}}/>
          </div>
          <div><label className="lbl">Дата на разтоварване</label>
            <input id="unloadDate" type="date" name="unloadDate" className="input" defaultValue={toInputDate(schedule?.unloadDate||"")}/>
          </div>
        </div>
        <select name="status" className="input" defaultValue={schedule?.status||"Планирано"}>
          <option>Планирано</option><option>В процес</option><option>Изпълнено</option>
        </select>
        <div className="flex justify-between pt-2">
          {schedule ? <button type="button" onClick={()=>onDelete()} className="btn delete-btn">Изтрий</button> : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn cancel-btn">Отказ</button>
            <button type="submit" className="btn save-btn">Запази</button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

/* ========================= Tabs ========================= */

const DashboardTab = ({ drivers, trucks, schedules, getDriverStatus }) => {
  const [showPast, setShowPast] = useState(false);
  const [pastDaysFilter, setPastDaysFilter] = useState(14);
  const [upcomingDaysFilter, setUpcomingDaysFilter] = useState(7);

  const today = new Date(); today.setHours(0,0,0,0);
  const upcomingLimit = new Date(today); upcomingLimit.setDate(today.getDate()+upcomingDaysFilter);
  const pastLimit = new Date(today);     pastLimit.setDate(today.getDate()-pastDaysFilter);

  const expiring = [];
  drivers.forEach(d=>{
    const card = checkExpiry(d.driverCardExpiry); if(card.status!=="valid"&&card.status!=="N/A") expiring.push({type:"Ш.К.", name:d.name, date:d.driverCardExpiry, days:card.days, status:card.status});
    const adr  = checkExpiry(d.adrExpiry);        if(adr.status!=="valid"&&adr.status!=="N/A")   expiring.push({type:"ADR",  name:d.name, date:d.adrExpiry,        days:adr.days,  status:adr.status});
  });
  trucks.forEach(t=>{
    const ins = checkExpiry(t.insuranceExpiry); if(ins.status!=="valid"&&ins.status!=="N/A") expiring.push({type:"Застраховка", name:t.number, date:t.insuranceExpiry, days:ins.days, status:ins.status});
  });
  expiring.sort((a,b)=>a.days-b.days);

  const activeTrips = schedules.filter(s=>s.status==="В процес");
  const upcoming = schedules.filter(s=>{
    const sd=parseBGDate(s.date);
    return s.status==="Планирано" && sd && sd>=today && sd<=upcomingLimit;
  }).sort((a,b)=>parseBGDate(a.date)-parseBGDate(b.date));

  const past = schedules.filter(s=>{
    const ed=parseBGDate(s.unloadDate);
    return s.status==="Изпълнено" && ed && ed<today && ed>=pastLimit;
  }).sort((a,b)=>parseBGDate(b.unloadDate)-parseBGDate(a.unloadDate));

  const busyDrivers = drivers.filter(d=>getDriverStatus(d.name)==="busy").length;
  const freeDrivers = drivers.length - busyDrivers;

  const TripsTable = ({trips}) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead><tr className="border-b border-slate-200">
          <th className="p-3 font-semibold text-slate-600">Шофьор</th>
          <th className="p-3 font-semibold text-slate-600">Релация</th>
          <th className="p-3 font-semibold text-slate-600">Дати</th>
        </tr></thead>
        <tbody>
        {trips.map((t,i)=>{
          const drv=drivers.find(d=>d.name===t.driver);
          return (
            <tr key={i} className="border-b hover:bg-slate-50 text-sm">
              <td className="p-3 font-medium text-slate-800"><DriverDisplay name={t.driver} company={drv?.company}/></td>
              <td className="p-3 text-slate-600">{t.route}</td>
              <td className="p-3 text-slate-600">{t.date} – {t.unloadDate}</td>
            </tr>
          );
        })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Изтичащи документи</h3>
          {expiring.length?(
            <ul className="space-y-3">
              {expiring.map((x,i)=>(
                <li key={i} className={`p-4 rounded-lg flex justify-between items-center ${x.status==="expired"?"bg-red-50":"bg-yellow-50"}`}>
                  <div className="flex items-center gap-3">
                    <StatusDot status={x.status}/>
                    <div>
                      <p className="font-semibold text-slate-800">{x.type} — {x.name}</p>
                      <p className="text-sm text-slate-600">Изтича на: {x.date}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${x.status==="expired"?"text-red-600":"text-yellow-600"}`}>
                    {x.status==="expired"?`Изтекло преди ${Math.abs(x.days)} дни`:`Остават ${x.days} дни`}
                  </span>
                </li>
              ))}
            </ul>
          ):<p className="text-slate-500">Няма изтичащи документи в следващите 30 дни.</p>}
        </div>

        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={()=>setShowPast(!showPast)}>
              <h3 className="dashboard-card-title mb-0">История</h3>
              <span className={`transition-transform ${showPast?"rotate-180":""}`}>▾</span>
            </div>
            <select value={pastDaysFilter} onChange={(e)=>setPastDaysFilter(Number(e.target.value))} className="select">
              <option value={7}>7 дни назад</option><option value={14}>14 дни назад</option><option value={30}>Месец назад</option>
            </select>
          </div>
          {showPast ? (past.length?<TripsTable trips={past}/> : <p className="text-slate-500">Няма изпълнени курсове за периода.</p>) : null}
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Активни курсове ({activeTrips.length})</h3>
          {activeTrips.length?<TripsTable trips={activeTrips}/> : <p className="text-slate-500">Няма активни курсове.</p>}
        </div>

        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="dashboard-card-title mb-0">Предстоящи ({upcoming.length})</h3>
            <select value={upcomingDaysFilter} onChange={(e)=>setUpcomingDaysFilter(Number(e.target.value))} className="select">
              <option value={7}>7 дни напред</option><option value={14}>14 дни напред</option><option value={30}>Месец напред</option>
            </select>
          </div>
          {upcoming.length?<TripsTable trips={upcoming}/> : <p className="text-slate-500">Няма планирани курсове.</p>}
        </div>
      </div>

      <div className="space-y-8">
        <div className="dashboard-card">
          <h3 className="dashboard-card-title">Статус на шофьорите</h3>
          <div className="flex justify-around items-center text-center p-4">
            <div><p className="text-4xl font-bold text-green-600">{freeDrivers}</p><p className="text-slate-600">Свободни</p></div>
            <div><p className="text-4xl font-bold text-orange-500">{busyDrivers}</p><p className="text-slate-600">Заети</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DriversTab = ({ drivers, companies, onAdd, onEdit, getDriverStatus }) => {
  const [filter, setFilter] = useState("SG");
  const subcontractors = useMemo(()=>[...new Set(drivers.map(d=>d.company).filter(Boolean))],[drivers]);

  const filtered = useMemo(()=>{
    if(filter==="SG") return drivers.filter(d=>!d.company);
    if(filter==="all") return drivers;
    return drivers.filter(d=>d.company===filter);
  },[drivers, filter]);

  return (
    <>
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div className="flex-1 flex justify-center">
          <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
            <button className={`seg ${filter==="SG"?"seg-active":""}`} onClick={()=>setFilter("SG")}>Шофьори SG</button>
            {subcontractors.map(c=><button key={c} className={`seg ${filter===c?"seg-active":""}`} onClick={()=>setFilter(c)}>{c}</button>)}
            <button className={`seg ${filter==="all"?"seg-active":""}`} onClick={()=>setFilter("all")}>Всички</button>
          </div>
        </div>
        <button className="btn save-btn" onClick={()=>onAdd()}>Добави шофьор</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length?filtered.map(d=>{
          const dc=checkExpiry(d.driverCardExpiry).status;
          const adr=checkExpiry(d.adrExpiry).status;
          const busy=getDriverStatus(d.name)==="busy";
          const flagClass = (s)=> s==="expired"?"bg-red-50 border-l-4 border-red-500": s==="expiring-soon"?"bg-yellow-50 border-l-4 border-yellow-500":"";
          return (
            <div key={d.id} className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition cursor-pointer" onClick={()=>onEdit(d)}>
              <div className="flex items-start gap-3">
                <span className={`w-3 h-3 rounded-full mt-2 ${busy?"bg-orange-500":"bg-green-500"}`}/>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800"><DriverDisplay name={d.name} company={d.company}/></h3>
                  <p className="text-sm text-slate-500">{d.contact}</p>
                </div>
                <div className="flex gap-2 text-xl"><StatusDot status={dc}/><StatusDot status={adr}/></div>
              </div>
              <div className="mt-3 text-sm text-slate-700 space-y-1">
                <div><b>Влекач:</b> {d.tractor||"N/A"}</div>
                <div><b>Цистерна:</b> {d.tanker||"N/A"}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className={`p-3 rounded-md ${flagClass(dc)}`}><div className="text-slate-500 text-xs">Ш.К.</div><div className="font-medium">{d.driverCardExpiry||"N/A"}</div></div>
                <div className={`p-3 rounded-md ${flagClass(adr)}`}><div className="text-slate-500 text-xs">ADR</div><div className="font-medium">{d.adrExpiry||"N/A"}</div></div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full text-center p-8 text-slate-400 border-2 border-dashed rounded-lg">Няма шофьори.</div>
        )}
      </div>
    </>
  );
};

const ScheduleListView = ({ schedules, onOpen, drivers }) => (
  <div className="dashboard-card overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="border-b bg-slate-50">
          <th className="p-3 font-semibold text-slate-600">Статус</th>
          <th className="p-3 font-semibold text-slate-600">Дати</th>
          <th className="p-3 font-semibold text-slate-600">Шофьор</th>
          <th className="p-3 font-semibold text-slate-600">Композиция</th>
          <th className="p-3 font-semibold text-slate-600">Релация</th>
          <th className="p-3 font-semibold text-slate-600">Командировка</th>
          <th className="p-3 font-semibold text-slate-600">Компания</th>
        </tr>
      </thead>
      <tbody>
        {schedules.sort((a,b)=>parseBGDate(a.date)-parseBGDate(b.date)).map(s=>{
          const drv=drivers.find(d=>d.name===s.driver);
          return (
            <tr key={s.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={()=>onOpen(s)}>
              <td className="p-3"><span className={`inline-block w-3 h-3 rounded-full mr-2 ${getEventColor(s.status)}`}></span>{s.status}</td>
              <td className="p-3 whitespace-nowrap">{s.date} – {s.unloadDate}</td>
              <td className="p-3 font-semibold text-slate-800"><DriverDisplay name={s.driver} company={drv?.company}/></td>
              <td className="p-3 text-slate-600">{s.tractor||"—"} / {s.tanker||"—"}</td>
              <td className="p-3 text-slate-600">{s.route}</td>
              <td className="p-3 text-slate-600">{s.komandirovka}</td>
              <td className="p-3 text-slate-600">{s.company}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const TimelineView = ({ items, schedules, onOpen, itemType, onDropUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const m=currentDate.getMonth(), y=currentDate.getFullYear();
  const daysInMonth = new Date(y, m+1, 0).getDate();

  const handleDragStart = (e, s) => e.dataTransfer.setData("schedule", JSON.stringify(s));

  const handleDrop = (e, newItemName) => {
    e.preventDefault();
    const s = JSON.parse(e.dataTransfer.getData("schedule")||"null");
    if(!s) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const dayW = rect.width / daysInMonth;
    const newDay = Math.max(1, Math.min(daysInMonth, Math.floor(x/dayW)+1));

    const start=parseBGDate(s.date), end=parseBGDate(s.unloadDate);
    if(!start||!end) return;
    const dur = Math.round((end-start)/(1000*3600*24));
    const ns = new Date(y, m, newDay);
    const ne = new Date(ns); ne.setDate(ne.getDate()+dur);

    const updated = {
      ...s,
      date: `${ns.getDate()}/${ns.getMonth()+1}/${ns.getFullYear()}`,
      unloadDate: `${ne.getDate()}/${ne.getMonth()+1}/${ne.getFullYear()}`,
      ...(itemType==="driver"?{driver:newItemName}:{})
    };
    onDropUpdate(updated);
  };

  const label = currentDate.toLocaleString("bg-BG",{month:"long",year:"numeric"});
  const cap = label.charAt(0).toUpperCase()+label.slice(1);

  return (
    <div className="dashboard-card overflow-x-auto">
      <div className="flex justify-between items-center mb-3 p-1">
        <button className="navbtn" onClick={()=>setCurrentDate(new Date(y,m-1,1))}>‹</button>
        <h3 className="text-xl font-bold">{cap}</h3>
        <button className="navbtn" onClick={()=>setCurrentDate(new Date(y,m+1,1))}>›</button>
      </div>
      <div className="inline-block min-w-full">
        <div className="grid" style={{gridTemplateColumns:`180px repeat(${daysInMonth}, minmax(38px,1fr))`}}>
          <div className="sticky left-0 bg-white z-10 font-semibold border-b border-slate-200 border-r p-2">{itemType==="driver"?"Шофьор":"Техника"}</div>
          {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=><div key={d} className="text-center font-semibold border-b border-slate-200 p-2 text-sm">{d}</div>)}

          {items.map(it=>(
            <React.Fragment key={it.id}>
              <div className="sticky left-0 bg-white z-10 font-semibold border-r border-slate-200 p-2 truncate text-sm">
                {itemType==="driver"?<DriverDisplay name={it.name} company={it.company}/>:it.number}
              </div>
              <div className="col-span-full relative h-10 border-b border-slate-200"
                   onDragOver={(e)=>e.preventDefault()}
                   onDrop={(e)=>handleDrop(e, itemType==="driver"?it.name:it.number)}>
                {schedules.filter(s=>{
                  return itemType==="driver" ? s.driver===it.name : (s.tractor===it.number || s.tanker===it.number);
                }).map(s=>{
                  const st=parseBGDate(s.date), en=parseBGDate(s.unloadDate);
                  if(!st||!en) return null;
                  if(en.getFullYear()<y || st.getFullYear()>y) return null;
                  if(en.getMonth()<m || st.getMonth()>m) return null;
                  const startDay = (st.getMonth()===m?st.getDate():1);
                  const endDay = (en.getMonth()===m?en.getDate():daysInMonth);
                  const span = endDay - startDay + 1;
                  return (
                    <div key={s.id}
                      draggable={itemType==="driver"}
                      onDragStart={(e)=>handleDragStart(e,s)}
                      onClick={()=>onOpen(s)}
                      className={`absolute h-8 top-1 p-1 text-xs text-white rounded cursor-grab flex items-center justify-center ${getEventColor(s.status)}`}
                      style={{left:`calc(${(startDay-1)*100/daysInMonth}% + 2px)`, width:`calc(${span*100/daysInMonth}% - 4px)`}}
                      title={`Шофьор: ${s.driver||""}\nРелация: ${s.route||""}\nКомпозиция: ${s.tractor||""}/${s.tanker||""}`}>
                      <span className="truncate">{itemType==="driver"?(s.tractor||"")+(s.tanker?` / ${s.tanker}`:""): (s.driver||s.route||"")}</span>
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScheduleTab = ({ drivers, schedules, companies, routes, onAdd, onEdit, onDropUpdate }) => {
  const [view, setView] = useState("list");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");

  const subcontractors = useMemo(()=>[...new Set(drivers.map(d=>d.company).filter(Boolean))],[drivers]);

  const filtered = useMemo(()=>{
    return schedules.filter(s=>{
      const drv=drivers.find(d=>d.name===s.driver);
      let groupMatch=true;
      if(group==="SG") groupMatch = drv && !drv.company;
      else if(group!=="all") groupMatch = drv && drv.company===group;
      const search = [s.driver,s.route,s.tractor,s.tanker,s.notes,s.company,s.komandirovka].some(f=>f && f.toLowerCase().includes(q.toLowerCase()));
      return groupMatch && (q?search:true);
    });
  },[schedules,drivers,q,group]);

  return (
    <>
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input className="input w-52" placeholder="Търсене..." value={q} onChange={(e)=>setQ(e.target.value)}/>
          <select className="input w-44" value={group} onChange={(e)=>setGroup(e.target.value)}>
            <option value="all">Всички шофьори</option>
            <option value="SG">Шофьори SG</option>
            {subcontractors.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
          <button className={`seg ${view==="list"?"seg-active":""}`} onClick={()=>setView("list")}>Списък</button>
          <button className={`seg ${view==="timeline"?"seg-active":""}`} onClick={()=>setView("timeline")}>График</button>
        </div>
        <button className="btn save-btn" onClick={()=>onAdd()}>Добави нова задача</button>
      </div>

      {view==="list" ? (
        <ScheduleListView schedules={filtered} drivers={drivers} onOpen={onEdit}/>
      ) : (
        <TimelineView items={drivers} schedules={filtered} onOpen={onEdit} itemType="driver" onDropUpdate={onDropUpdate}/>
      )}
    </>
  );
};

const TehnikaTab = ({ trucks, schedules, onOpen, onAdd, onDropUpdate }) => (
  <>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">График на техниката</h2>
      <button className="btn save-btn" onClick={()=>onAdd()}>Добави ПС</button>
    </div>
    <TimelineView items={trucks} schedules={schedules} onOpen={onOpen} itemType="truck" onDropUpdate={onDropUpdate}/>
  </>
);

const SettingsTab = ({ companies, routes, onAddCompany, onEditCompany, onAddRoute, onEditRoute }) => {
  const [tab,setTab]=useState("companies");
  return (
    <div className="dashboard-card p-6">
      <div className="flex justify-center mb-6 gap-1 bg-slate-200 p-1 rounded-lg">
        <button className={`seg ${tab==="companies"?"seg-active":""}`} onClick={()=>setTab("companies")}>Фирми</button>
        <button className={`seg ${tab==="routes"?"seg-active":""}`} onClick={()=>setTab("routes")}>Релации</button>
      </div>

      {tab==="companies" ? (
        <>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-bold">Управление на фирми</h3>
            <button className="btn save-btn" onClick={()=>onAddCompany()}>Добави фирма</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b"><th className="p-3">Име</th><th className="p-3">ЕИК</th><th className="p-3">Адрес</th><th className="p-3">МОЛ</th></tr></thead>
              <tbody>
                {companies.map(c=>(
                  <tr key={c.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={()=>onEditCompany(c)}>
                    <td className="p-3">{c.name}</td><td className="p-3">{c.eik}</td><td className="p-3">{c.address}</td><td className="p-3">{c.mol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-bold">Управление на релации</h3>
            <button className="btn save-btn" onClick={()=>onAddRoute()}>Добави релация</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b"><th className="p-3">Име</th><th className="p-3">Продължителност (дни)</th></tr></thead>
              <tbody>
                {routes.map(r=>(
                  <tr key={r.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={()=>onEditRoute(r)}>
                    <td className="p-3">{r.name}</td><td className="p-3">{r.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

/* ========================= Main App ========================= */

export default function App() {
  const [active, setActive] = useState("dashboard");

  // State + localStorage
  const [drivers, setDrivers] = useState(()=>JSON.parse(localStorage.getItem("drivers")||"null")||seedDrivers);
  const [schedules, setSchedules] = useState(()=>JSON.parse(localStorage.getItem("schedules")||"null")||seedSchedules);
  const [trucks, setTrucks] = useState(()=>JSON.parse(localStorage.getItem("trucks")||"null")||seedTrucks);
  const [companies, setCompanies] = useState(()=>JSON.parse(localStorage.getItem("companies")||"null")||seedCompanies);
  const [routes, setRoutes] = useState(()=>JSON.parse(localStorage.getItem("routes")||"null")||seedRoutes);

  useEffect(()=>localStorage.setItem("drivers", JSON.stringify(drivers)),[drivers]);
  useEffect(()=>localStorage.setItem("schedules", JSON.stringify(schedules)),[schedules]);
  useEffect(()=>localStorage.setItem("trucks", JSON.stringify(trucks)),[trucks]);
  useEffect(()=>localStorage.setItem("companies", JSON.stringify(companies)),[companies]);
  useEffect(()=>localStorage.setItem("routes", JSON.stringify(routes)),[routes]);

  // Busy/free status by schedule
  const getDriverStatus = (driverName) => {
    const today = new Date(); today.setHours(0,0,0,0);
    return schedules.some(s=>{
      if(s.driver!==driverName) return false;
      const st=parseBGDate(s.date), en=parseBGDate(s.unloadDate);
      return st && en && today>=st && today<=en;
    }) ? "busy":"free";
  };

  /* ----- Driver CRUD ----- */
  const [driverModal, setDriverModal] = useState({open:false, driver:null});
  const addDriver = ()=> setDriverModal({open:true, driver:null});
  const editDriver = (d)=> setDriverModal({open:true, driver:d});
  const saveDriver = (data)=>{
    if(driverModal.driver){
      setDrivers(prev=>prev.map(d=>d.id===driverModal.driver.id?{...driverModal.driver, ...data}:d));
    }else{
      setDrivers(prev=>[{id:`d${Date.now()}`,...data}, ...prev]);
    }
    setDriverModal({open:false, driver:null});
  };

  /* ----- Truck CRUD ----- */
  const [truckModal, setTruckModal] = useState({open:false, truck:null});
  const addTruck = ()=> setTruckModal({open:true, truck:null});
  const editTruck = (t)=> setTruckModal({open:true, truck:t});
  const saveTruck = (data)=>{
    if(truckModal.truck){
      setTrucks(prev=>prev.map(t=>t.id===truckModal.truck.id?{...truckModal.truck,...data}:t));
    }else{
      setTrucks(prev=>[{id:`t${Date.now()}`,...data}, ...prev]);
    }
    setTruckModal({open:false, truck:null});
  };

  /* ----- Schedule CRUD ----- */
  const [scheduleModal, setScheduleModal] = useState({open:false, schedule:null});
  const addSchedule = ()=> setScheduleModal({open:true, schedule:null});
  const editSchedule = (s)=> setScheduleModal({open:true, schedule:s});
  const saveSchedule = (data)=>{
    if(scheduleModal.schedule){
      setSchedules(prev=>prev.map(s=>s.id===scheduleModal.schedule.id?{...scheduleModal.schedule,...data}:s));
    }else{
      setSchedules(prev=>[{id:`s${Date.now()}`,...data}, ...prev]);
    }
    setScheduleModal({open:false, schedule:null});
  };
  const deleteSchedule = ()=>{
    if(!scheduleModal.schedule) return;
    setSchedules(prev=>prev.filter(s=>s.id!==scheduleModal.schedule.id));
    setScheduleModal({open:false, schedule:null});
  };
  const updateScheduleFromTimeline = (updated)=>{
    setSchedules(prev=>prev.map(s=>s.id===updated.id?updated:s));
  };

  /* ----- Companies / Routes ----- */
  const [companyModal, setCompanyModal] = useState({open:false, item:null});
  const [routeModal, setRouteModal] = useState({open:false, item:null});

  const saveCompany = (data)=>{
    if(companyModal.item){
      setCompanies(prev=>prev.map(c=>c.id===companyModal.item.id?{...companyModal.item,...data}:c));
    }else{
      setCompanies(prev=>[{id:`c${Date.now()}`,...data}, ...prev]);
    }
    setCompanyModal({open:false,item:null});
  };
  const saveRoute = (data)=>{
    data.duration = Number(data.duration)||1;
    if(routeModal.item){
      setRoutes(prev=>prev.map(r=>r.id===routeModal.item.id?{...routeModal.item,...data}:r));
    }else{
      setRoutes(prev=>[{id:`r${Date.now()}`,...data}, ...prev]);
    }
    setRouteModal({open:false,item:null});
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans antialiased">
      {/* inline styles for convenience */}
      <style>{`
        .dashboard-card{background:#fff;border-radius:16px;box-shadow:0 6px 18px rgba(0,0,0,.08);padding:20px}
        .dashboard-card-title{font-weight:800;color:#0f172a;margin-bottom:10px}
        .input{width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:10px}
        .lbl{display:block;font-size:12px;color:#6b7280;margin-bottom:6px}
        .btn{border-radius:10px;padding:10px 14px;font-weight:700}
        .save-btn{background:#4f46e5;color:#fff}.save-btn:hover{background:#4338ca}
        .cancel-btn{background:#e5e7eb}.cancel-btn:hover{background:#d1d5db}
        .delete-btn{background:#ef4444;color:#fff}.delete-btn:hover{background:#dc2626}
        .seg{padding:8px 12px;border-radius:8px;font-weight:600;color:#475569}
        .seg-active{background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);color:#0f172a}
        .select{background:#f1f5f9;border:1px solid transparent;border-radius:8px;padding:6px 8px}
        .navbtn{width:36px;height:36px;border-radius:9999px}
        .navbtn:hover{background:#f1f5f9}
      `}</style>

      <Header />
      <main className="container mx-auto px-4 py-8 -mt-16">
        <Tabs active={active} setActive={setActive} />

        {active==="dashboard" && (
          <DashboardTab drivers={drivers} trucks={trucks} schedules={schedules} getDriverStatus={getDriverStatus}/>
        )}

        {active==="drivers" && (
          <DriversTab
            drivers={drivers}
            companies={companies}
            onAdd={()=>addDriver()}
            onEdit={(d)=>editDriver(d)}
            getDriverStatus={getDriverStatus}
          />
        )}

        {active==="schedule" && (
          <ScheduleTab
            drivers={drivers}
            schedules={schedules}
            companies={companies}
            routes={routes}
            onAdd={()=>addSchedule()}
            onEdit={(s)=>editSchedule(s)}
            onDropUpdate={updateScheduleFromTimeline}
          />
        )}

        {active==="tehnika" && (
          <TehnikaTab
            trucks={trucks}
            schedules={schedules}
            onOpen={(s)=>editSchedule(s)}
            onAdd={()=>addTruck()}
            onDropUpdate={updateScheduleFromTimeline}
          />
        )}

        {active==="settings" && (
          <SettingsTab
            companies={companies}
            routes={routes}
            onAddCompany={()=>setCompanyModal({open:true,item:null})}
            onEditCompany={(c)=>setCompanyModal({open:true,item:c})}
            onAddRoute={()=>setRouteModal({open:true,item:null})}
            onEditRoute={(r)=>setRouteModal({open:true,item:r})}
          />
        )}
      </main>

      {/* Modals */}
      <EditDriverModal
        open={driverModal.open}
        onClose={()=>setDriverModal({open:false,driver:null})}
        driver={driverModal.driver}
        onSave={saveDriver}
        companies={companies}
      />

      <EditTruckModal
        open={truckModal.open}
        onClose={()=>setTruckModal({open:false,truck:null})}
        truck={truckModal.truck}
        onSave={saveTruck}
      />

      <EditScheduleModal
        open={scheduleModal.open}
        onClose={()=>setScheduleModal({open:false,schedule:null})}
        schedule={scheduleModal.schedule}
        drivers={drivers}
        companies={companies}
        routes={routes}
        onSave={saveSchedule}
        onDelete={deleteSchedule}
      />

      <Modal open={companyModal.open} onClose={()=>setCompanyModal({open:false,item:null})}>
        <h2 className="text-2xl font-bold mb-4">{companyModal.item?"Редакция на фирма":"Нова фирма"}</h2>
        <form onSubmit={(e)=>{e.preventDefault(); const f=e.target; saveCompany({
          name:f.name.value.trim(), eik:f.eik.value.trim(), address:f.address.value.trim(), mol:f.mol.value.trim()
        });}} className="space-y-3">
          <input name="name" className="input" placeholder="Име" defaultValue={companyModal.item?.name||""} required/>
          <input name="eik" className="input" placeholder="ЕИК" defaultValue={companyModal.item?.eik||""}/>
          <input name="address" className="input" placeholder="Адрес" defaultValue={companyModal.item?.address||""}/>
          <input name="mol" className="input" placeholder="МОЛ" defaultValue={companyModal.item?.mol||""}/>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn cancel-btn" onClick={()=>setCompanyModal({open:false,item:null})}>Отказ</button>
            <button type="submit" className="btn save-btn">Запази</button>
          </div>
        </form>
      </Modal>

      <Modal open={routeModal.open} onClose={()=>setRouteModal({open:false,item:null})}>
        <h2 className="text-2xl font-bold mb-4">{routeModal.item?"Редакция на релация":"Нова релация"}</h2>
        <form onSubmit={(e)=>{e.preventDefault(); const f=e.target; saveRoute({
          name:f.name.value.trim(), duration:f.duration.value
        });}} className="space-y-3">
          <input name="name" className="input" placeholder="Име (напр. София - Варна)" defaultValue={routeModal.item?.name||""} required/>
          <input name="duration" type="number" min="1" className="input" placeholder="Продължителност (дни)" defaultValue={routeModal.item?.duration||1} required/>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn cancel-btn" onClick={()=>setRouteModal({open:false,item:null})}>Отказ</button>
            <button type="submit" className="btn save-btn">Запази</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
