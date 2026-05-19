import type { ComponentLog } from '../types';

const normalizeToDate = (value?: string) => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const suggestNextAgreementNumber = (approvalLogs: ComponentLog[], agreementDate?: string) => {
  const effectiveDate = normalizeToDate(agreementDate);
  const year = String(effectiveDate.getFullYear());
  const pattern = new RegExp(`^ATA-${year}-(\\d{3,})$`, 'i');

  const maxSequence = approvalLogs
    .filter((log) => log.type === 'approval')
    .map((log) => String(log.agreementNumber || '').trim())
    .map((value) => value.match(pattern)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((max, current) => Math.max(max, current), 0);

  const nextSequence = String(maxSequence + 1).padStart(3, '0');
  return `ATA-${year}-${nextSequence}`;
};
