export const CLINIC_MAP_URL = 'https://share.google/UNp8yFP502cNh6NNA';
export const APPOINTMENT_PICKER_TOKEN = '[[RANDEVU_SECICI]]';

export type QuickActionKey =
  | 'appointment'
  | 'location'
  | 'hours'
  | 'about'
  | 'therapist'
  | 'videos'
  | 'summary';

export function hasAppointmentPicker(content: string) {
  return content.includes(APPOINTMENT_PICKER_TOKEN);
}

export function stripAppointmentPicker(content: string) {
  return content.split(APPOINTMENT_PICKER_TOKEN).join('').replace(/\n{3,}/g, '\n\n').trim();
}

/** "tel:+905406502727" → "0540 650 27 27" */
export function formatTelHref(href: string) {
  const d = href.replace(/\D/g, '').replace(/^90/, '');
  return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : href.replace(/^tel:/, '');
}
