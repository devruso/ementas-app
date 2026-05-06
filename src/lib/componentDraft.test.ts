import { describe, expect, it } from 'vitest';

import {
  buildReferenceChecklist,
  buildBibliographyPayload,
  extractReferenceSections,
  formatAbntReferenceBlock,
  hasNonWebReferenceWithoutYear,
} from './componentDraft';

describe('componentDraft reference parser', () => {
  it('deve extrair referências básicas e complementares de bibliography estruturada', () => {
    const bibliography = [
      'REFERENCIAS BASICAS:\nLivro A\nLivro B',
      'REFERENCIAS COMPLEMENTARES:\nLivro C',
    ].join('\n\n');

    const sections = extractReferenceSections(bibliography);

    expect(sections.basic).toContain('Livro A');
    expect(sections.basic).toContain('Livro B');
    expect(sections.complementary).toContain('Livro C');
  });

  it('deve montar payload de bibliography com duas seções', () => {
    const payload = buildBibliographyPayload('Livro Base', 'Livro Extra');

    expect(payload).toContain('REFERENCIAS BASICAS');
    expect(payload).toContain('Livro Base');
    expect(payload).toContain('REFERENCIAS COMPLEMENTARES');
    expect(payload).toContain('Livro Extra');
  });

  it('deve incluir data e horario de acesso para referencia web sem acesso preenchido', () => {
    const formatted = formatAbntReferenceBlock('Portal CAPES https://www-periodicos-capes-gov-br.ezl.periodicos.capes.gov.br');

    expect(formatted).toContain('Disponivel em: https://www-periodicos-capes-gov-br.ezl.periodicos.capes.gov.br');
    expect(formatted).toContain('Acesso em:');
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}/);
  });

  it('deve identificar referencia nao web sem ano', () => {
    expect(hasNonWebReferenceWithoutYear('SILVA, Joao. Compiladores modernos.')).toBe(true);
    expect(hasNonWebReferenceWithoutYear('SILVA, Joao. Compiladores modernos. 2021.')).toBe(false);
  });

  it('deve montar checklist ABNT linha a linha', () => {
    const checklist = buildReferenceChecklist([
      'SILVA, Joao. Compiladores modernos.',
      'Portal CAPES https://www-periodicos-capes-gov-br.ezl.periodicos.capes.gov.br',
    ].join('\n'));

    expect(checklist).toHaveLength(2);
    expect(checklist[0].status).toBe('warning');
    expect(checklist[0].message).toContain('sem ano');
    expect(checklist[1].status).toBe('warning');
    expect(checklist[1].message).toContain('sem acesso completo');
  });
});
