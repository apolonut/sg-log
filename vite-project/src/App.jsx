export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white p-8 rounded-b-2xl">
        <h1 className="text-3xl font-bold">Управление на Шофьори и Контейнери</h1>
        <p className="text-white/80">Демо с Tailwind (без Firebase)</p>
      </header>

      <main className="max-w-6xl mx-auto p-6 -mt-10">
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 rounded-lg font-semibold bg-white shadow hover:bg-gray-100">
            Шофьори
          </button>
          <button className="px-6 py-3 rounded-lg font-semibold bg-white shadow hover:bg-gray-100">
            График
          </button>
          <button className="px-6 py-3 rounded-lg font-semibold bg-white shadow hover:bg-gray-100">
            Камиони
          </button>
          <button className="px-6 py-3 rounded-lg font-semibold bg-white shadow hover:bg-gray-100">
            Депо
          </button>
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <p className="text-gray-700">
            Тук ще се показва съдържанието според избрания таб. Пълният код ще върнем след като проверим, че стиловете и билдът работят.
          </p>
        </div>
      </main>
    </div>
  );
}
