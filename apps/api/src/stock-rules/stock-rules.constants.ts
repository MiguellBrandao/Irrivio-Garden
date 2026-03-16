export const STOCK_RULE_OPERATORS = [
  'lt',
  'lte',
  'eq',
  'gt',
  'gte',
] as const;

export type StockRuleOperator = (typeof STOCK_RULE_OPERATORS)[number];
