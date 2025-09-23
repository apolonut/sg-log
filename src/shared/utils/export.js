// Универсално сваляне на файл от текст
export function downloadTextFile(filename, mime, content) {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// CSV (Excel го отваря без проблем)
// rows = масив от обекти, columns = [{key, title}]
export function toCSV(rows, columns, delimiter = ",") {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    // ако има запетаи/каванички/нов ред → ограждаме в кавички
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map(c => esc(c.title)).join(delimiter);
  const body = rows.map(r => columns.map(c => esc(r[c.key])).join(delimiter)).join("\n");
  return header + "\n" + body;
}

// Excel 2003 XML Spreadsheet (.xls) — без зависимости, отваря се в Excel
export function toExcelXML(rows, columns, sheetName = "Sheet1") {
  const xmlHeader = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="${sheetName}">
      <Table>
        <Row>
          ${columns.map(c => `<Cell><Data ss:Type="String">${escapeXml(c.title)}</Data></Cell>`).join("")}
        </Row>
        ${rows.map(r => `<Row>${
          columns.map(c => {
            const v = r[c.key] == null ? "" : String(r[c.key]);
            const type = isNumberLike(v) ? "Number" : "String";
            const val  = type === "Number" ? v.replace(",", ".") : escapeXml(v);
            return `<Cell><Data ss:Type="${type}">${val}</Data></Cell>`;
          }).join("")
        }</Row>`).join("")}
      </Table>
    </Worksheet>
  </Workbook>`.trim();
  return xmlHeader;
}

function isNumberLike(s) {
  return /^-?\d+(\.\d+)?$/.test(String(s).trim());
}
function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Удобна функция за експорт на ГРАФИК (schedules)
export function exportSchedules(schedules) {
  const rows = (schedules || []).map((s, i) => ({
    idx: i + 1,
    driver: s.driver || "",
    company: s.company || s.driverCompany || "",
    relation: s.relation || s.route || s.title || "",
    start: s.startDate || s.date || "",
    end: s.endDate || s.unloadDate || "",
    status: s.status || "",
    komandirovka: s.komandirovka || "",
    notes: s.notes || "",
  }));

  const columns = [
    { key: "idx", title: "#" },
    { key: "driver", title: "Шофьор" },
    { key: "company", title: "Фирма" },
    { key: "relation", title: "Релация" },
    { key: "start", title: "От дата" },
    { key: "end", title: "До дата" },
    { key: "status", title: "Статус" },
    { key: "komandirovka", title: "Командировъчен №" },
    { key: "notes", title: "Бележки" },
  ];

  // .xls (Excel XML)
  const xml = toExcelXML(rows, columns, "График");
  downloadTextFile(`grafik_${dateStamp()}.xls`, "application/vnd.ms-excel", xml);

  // backup .csv
  const csv = toCSV(rows, columns, ",");
  downloadTextFile(`grafik_${dateStamp()}.csv`, "text/csv", csv);
}

function dateStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
