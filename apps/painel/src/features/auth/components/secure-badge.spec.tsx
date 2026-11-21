import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SecureBadge } from './secure-badge';

afterEach(() => vi.unstubAllGlobals());

describe('SecureBadge', () => {
  it('em https mostra Conexão segura', () => {
    vi.stubGlobal('location', { protocol: 'https:' });
    render(<SecureBadge />);
    expect(screen.getByText('Conexão segura')).toBeInTheDocument();
  });

  it('em http não promete o que não tem', () => {
    vi.stubGlobal('location', { protocol: 'http:' });
    const { container } = render(<SecureBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});
