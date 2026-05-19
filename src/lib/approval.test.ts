import { describe, expect, it } from 'vitest';

import { suggestNextAgreementNumber } from './approval';
import type { ComponentLog } from '../types';

describe('approval helpers', () => {
  it('deve sugerir proximo numero de ATA com formato anual', () => {
    const logs: ComponentLog[] = [
      {
        id: '1',
        type: 'approval',
        agreementNumber: 'ATA-2026-001',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        type: 'approval',
        agreementNumber: 'ATA-2026-009',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    expect(suggestNextAgreementNumber(logs, '2026-10-10')).toBe('ATA-2026-010');
  });

  it('deve reiniciar sequencia ao mudar ano de referencia', () => {
    const logs: ComponentLog[] = [
      {
        id: '1',
        type: 'approval',
        agreementNumber: 'ATA-2026-010',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    expect(suggestNextAgreementNumber(logs, '2027-01-15')).toBe('ATA-2027-001');
  });
});
