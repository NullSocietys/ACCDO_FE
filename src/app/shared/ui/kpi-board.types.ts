import { IconName } from '../icons/icon-paths';

export type KpiTone = 'ink' | 'ok' | 'warn' | 'gold' | 'info';

export interface KpiItem {
  label: string;
  value: string | number;
  hint?: string;
  icon?: IconName | string;
  tone?: KpiTone;
  /** Slightly smaller type for currency / long values */
  money?: boolean;
}
