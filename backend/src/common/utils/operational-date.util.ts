import dayjs from 'dayjs';

/**
 * Calcula la "fecha operativa" de un momento dado, en función de la hora de
 * cierre operativo configurada por sucursal.
 *
 * Ejemplo: si operationalCloseHour = "04:00" y son las 02:30 del día 10,
 * el día operativo sigue siendo el 9 (porque el cierre del día 9 ocurre
 * hasta las 04:00 del día 10).
 *
 * Si operationalCloseHour = "00:00" (default), el día operativo coincide
 * con el día calendario.
 */
export function computeOperationalDate(date: Date, operationalCloseHour: string): Date {
  const [hourStr, minuteStr] = operationalCloseHour.split(':');
  const hour = Number(hourStr) || 0;
  const minute = Number(minuteStr) || 0;

  const d = dayjs(date);

  // Si la hora de cierre es 00:00, no hay corrimiento: el día operativo es el día calendario.
  if (hour === 0 && minute === 0) {
    return d.startOf('day').toDate();
  }

  // Si la hora actual es anterior a la hora de cierre, todavía pertenece al
  // día operativo ANTERIOR.
  const closeMoment = d.hour(hour).minute(minute).second(0).millisecond(0);
  if (d.isBefore(closeMoment)) {
    return d.subtract(1, 'day').startOf('day').toDate();
  }
  return d.startOf('day').toDate();
}

/** Formatea una fecha operativa (Date) como "YYYY-MM-DD" para respuestas de API. */
export function formatOperationalDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}
