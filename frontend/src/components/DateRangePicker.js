import React, { useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';

const PRESET_RANGES = [
  { label: 'Hoy', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Ayer', getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: 'Esta semana', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'La semana pasada', getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) },
  { label: 'Este mes', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mes pasado', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Últimos 7 días', getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'Últimos 30 días', getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
];

export default function DateRangePicker({ dateRange, onDateRangeChange }) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState(dateRange);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const handlePresetClick = (preset) => {
    const range = preset.getValue();
    setTempRange(range);
    setSelectedPreset(preset.label);
  };

  const handleApply = () => {
    if (tempRange?.from) {
      onDateRangeChange(tempRange);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setTempRange(dateRange);
    setSelectedPreset(null);
    setOpen(false);
  };

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      setTempRange(dateRange);
      setSelectedPreset(null);
    }
    setOpen(isOpen);
  };

  const formatDisplayDate = () => {
    if (!dateRange?.from) return 'Seleccionar fecha';
    const fromStr = format(dateRange.from, "d 'de' MMMM, yyyy", { locale: es });
    const toStr = dateRange.to ? format(dateRange.to, "d 'de' MMMM, yyyy", { locale: es }) : '';
    if (fromStr === toStr || !dateRange.to) return fromStr;
    return `${fromStr} - ${toStr}`;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 font-medium"
          data-testid="date-range-picker-trigger"
        >
          <CalendarIcon size={16} className="text-slate-400" />
          <span className="text-sm">{formatDisplayDate()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex" data-testid="date-range-picker-popover">
          {/* Calendar Section */}
          <div className="border-r">
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={(range) => {
                setTempRange(range);
                setSelectedPreset(null);
              }}
              numberOfMonths={1}
              locale={es}
              defaultMonth={tempRange?.from}
              classNames={{
                day_selected: "bg-green-600 text-white hover:bg-green-700 hover:text-white focus:bg-green-700 focus:text-white",
                day_range_middle: "bg-green-100 text-green-900",
                day_today: "ring-2 ring-red-500 ring-offset-1",
              }}
            />
            <div className="px-4 pb-3 text-xs text-slate-500 border-t pt-2">
              <div className="flex justify-between">
                <span>Fecha de inicio:</span>
                <span className="font-medium">{tempRange?.from ? format(tempRange.from, 'dd/MM/yyyy') : '-'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Fecha de fin:</span>
                <span className="font-medium">{tempRange?.to ? format(tempRange.to, 'dd/MM/yyyy') : '-'}</span>
              </div>
            </div>
          </div>
          
          {/* Preset Options */}
          <div className="p-3 min-w-[160px]">
            <div className="space-y-1">
              {PRESET_RANGES.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    selectedPreset === preset.label
                      ? 'bg-green-100 text-green-700 font-medium'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  data-testid={`preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-slate-50">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            CANCELAR
          </Button>
          <Button 
            size="sm" 
            onClick={handleApply}
            className="bg-green-600 hover:bg-green-700"
            data-testid="date-range-apply-btn"
          >
            HECHO
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
