import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('uses the official shared logo asset with accessible text', () => {
    render(<BrandMark className="brand-size" />);

    const logo = screen.getByRole('img', { name: 'Instituto de Computacao da UFBA' });

    expect(logo).toHaveAttribute('src', '/ic-logo-mark.svg');
    expect(logo).toHaveClass('brand-size');
    expect(logo).toHaveAttribute('width', '46');
    expect(logo).toHaveAttribute('height', '58');
  });
});
