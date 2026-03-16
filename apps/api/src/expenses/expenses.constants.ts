export const expenseCategories = [
  'fuel',
  'tolls',
  'parking',
  'equipment',
  'maintenance',
  'transport',
  'other',
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];
