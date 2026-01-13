import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Su', 'Mes', 'Tu', 'Nosotros', 'El', 'Es', 'Sá'];

export default function DateRangePicker({ fechaDesde, fechaHasta, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState(fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null);
  const [tempEnd, setTempEnd] = useState(fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (fechaDesde) setTempStart(new Date(fechaDesde + 'T00:00:00'));
    if (fechaHasta) setTempEnd(new Date(fechaHasta + 'T00:00:00'));
  }, [fechaDesde, fechaHasta]);

  const formatDateDisplay = () => {
    if (!fechaDesde || !fechaHasta) return 'Seleccionar fechas';
    const desde = new Date(fechaDesde + 'T00:00:00');
    const hasta = new Date(fechaHasta + 'T00:00:00');
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return `${desde.toLocaleDateString('es-ES', options)} - ${hasta.toLocaleDateString('es-ES', options)}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Días del mes anterior
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    
    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    
    // Días del mes siguiente
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    
    return days;
  };

  const isInRange = (date) => {
    if (!tempStart || !tempEnd) return false;
    return date >= tempStart && date <= tempEnd;
  };

  const isStartDate = (date) => {
    if (!tempStart) return false;
    return date.toDateString() === tempStart.toDateString();
  };

  const isEndDate = (date) => {
    if (!tempEnd) return false;
    return date.toDateString() === tempEnd.toDateString();
  };

  const handleDayClick = (date) => {
    if (selectingStart) {
      setTempStart(date);
      setTempEnd(null);
      setSelectingStart(false);
    } else {
      if (date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
      setSelectingStart(true);
    }
  };

  const handlePreset = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start, end;

    switch (preset) {
      case 'today':
        start = end = new Date(today);
        break;
      case 'yesterday':
        start = end = new Date(today);
        start.setDate(start.getDate() - 1);
        break;
      case 'thisWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        end = new Date(today);
        break;
      case 'lastWeek':
        start = new Date(today);
        start.setDate(today.getDate() - today.getDay() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last7':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        end = new Date(today);
        break;
      case 'last30':
        start = new Date(today);
        start.setDate(today.getDate() - 29);
        end = new Date(today);
        break;
      default:
        return;
    }

    setTempStart(start);
    setTempEnd(end);
  };

  const handleConfirm = () => {
    if (tempStart && tempEnd) {
      onChange(
        tempStart.toISOString().split('T')[0],
        tempEnd.toISOString().split('T')[0]
      );
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setTempStart(fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null);
    setTempEnd(fechaHasta ? new Date(fechaHasta + 'T00:00:00') : null);
    setIsOpen(false);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
      >
        <Calendar size={16} className="text-slate-400" />
        <span className="text-sm font-medium">{formatDateDisplay()}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border z-50 flex">
          {/* Calendario */}
          <div className="p-4 border-r">
            {/* Header del calendario */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded">
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium">
                {MESES[currentMonth.getMonth()]} de {currentMonth.getFullYear()}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS_SEMANA.map((dia, i) => (
                <div key={i} className="text-center text-xs text-slate-500 py-1">
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((dayObj, i) => {
                const inRange = isInRange(dayObj.date);
                const isStart = isStartDate(dayObj.date);
                const isEnd = isEndDate(dayObj.date);
                
                return (
                  <button
                    key={i}
                    onClick={() => handleDayClick(dayObj.date)}
                    className={`
                      w-8 h-8 text-sm rounded flex items-center justify-center transition-colors
                      ${!dayObj.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                      ${inRange && !isStart && !isEnd ? 'bg-green-100' : ''}
                      ${isStart || isEnd ? 'bg-green-500 text-white' : ''}
                      ${isStart ? 'rounded-l-full' : ''}
                      ${isEnd ? 'rounded-r-full' : ''}
                      ${!inRange && !isStart && !isEnd ? 'hover:bg-slate-100' : ''}
                    `}
                  >
                    {dayObj.day}
                  </button>
                );
              })}
            </div>

            {/* Fechas seleccionadas */}
            <div className="flex gap-4 mt-4 pt-4 border-t">
              <div>
                <div className="text-xs text-slate-500">Fecha de inicio</div>
                <div className="text-sm font-medium">
                  {tempStart ? tempStart.toLocaleDateString('es-ES') : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Fecha de finaliza...</div>
                <div className="text-sm font-medium">
                  {tempEnd ? tempEnd.toLocaleDateString('es-ES') : '-'}
                </div>
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg flex gap-2 text-xs text-slate-600">
              <span className="text-slate-400">ⓘ</span>
              <span>
                Su acceso a los datos de ventas está limitado a los últimos 31 días.{' '}
                <span className="text-green-600 cursor-pointer">
                  Pruebe gratis su historial de ventas ilimitado
                </span>{' '}
                para analizar los datos de cualquier periodo.
              </span>
            </div>
          </div>

          {/* Presets */}
          <div className="p-4 min-w-[160px]">
            <div className="space-y-1">
              {[
                { key: 'today', label: 'Hoy' },
                { key: 'yesterday', label: 'Ayer' },
                { key: 'thisWeek', label: 'Esta semana' },
                { key: 'lastWeek', label: 'La semana pasada' },
                { key: 'thisMonth', label: 'Este mes' },
                { key: 'lastMonth', label: 'Mes pasado' },
                { key: 'last7', label: 'Últimos 7 días' },
                { key: 'last30', label: 'Últimos 30 días' },
              ].map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePreset(preset.key)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer con botones */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-slate-50 border-t flex justify-end gap-4 rounded-b-lg">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              CANCELAR
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700"
              disabled={!tempStart || !tempEnd}
            >
              HECHO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
