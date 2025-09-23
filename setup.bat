@echo off
REM Създаване на папки
mkdir src\app
mkdir src\features\dashboard
mkdir src\features\drivers
mkdir src\features\schedule
mkdir src\features\tehnika
mkdir src\features\settings
mkdir src\shared\components
mkdir src\shared\hooks
mkdir src\shared\utils
mkdir src\styles

REM Създаване на файлове
type nul > src\app\App.jsx
type nul > src\app\routes.jsx

type nul > src\features\dashboard\DashboardTab.jsx

type nul > src\features\drivers\DriversTab.jsx
type nul > src\features\drivers\DriverCard.jsx
type nul > src\features\drivers\EditDriverModal.jsx
type nul > src\features\drivers\seed.js
type nul > src\features\drivers\drivers.store.js

type nul > src\features\schedule\ScheduleTab.jsx
type nul > src\features\schedule\ScheduleListView.jsx
type nul > src\features\schedule\TimelineView.jsx
type nul > src\features\schedule\EditScheduleModal.jsx
type nul > src\features\schedule\schedule.store.js

type nul > src\features\tehnika\TehnikaTab.jsx
type nul > src\features\tehnika\EditTruckModal.jsx
type nul > src\features\tehnika\tehnika.store.js

type nul > src\features\settings\SettingsTab.jsx
type nul > src\features\settings\CompanyModal.jsx
type nul > src\features\settings\RouteModal.jsx
type nul > src\features\settings\settings.store.js

type nul > src\shared\components\Header.jsx
type nul > src\shared\components\Tabs.jsx
type nul > src\shared\components\Modal.jsx

type nul > src\shared\hooks\useLocalStorage.js

type nul > src\shared\utils\dates.js
type nul > src\shared\utils\status.js

type nul > src\styles\index.css

type nul > src\main.jsx
type nul > src\index.html

echo Структурата е създадена успешно!
pause
