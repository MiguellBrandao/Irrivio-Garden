export const irrigationFrequencies = [
  'daily',
  'every_n_days',
  'weekly',
] as const;

export const irrigationWeekDays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type IrrigationFrequency = (typeof irrigationFrequencies)[number];
export type IrrigationWeekDay = (typeof irrigationWeekDays)[number];
