import { parseAiResponse } from './response-parser';

describe('ResponseParser', () => {
  it('detects TRANSFER_TO_HUMAN action', () => {
    const result = parseAiResponse(
      'Claro, vou transferir você. [TRANSFER_TO_HUMAN]',
    );

    expect(result.actions).toEqual([{ type: 'TRANSFER_TO_HUMAN' }]);
    expect(result.text).toBe('Claro, vou transferir você.');
  });

  it('detects UPDATE_CUSTOMER action', () => {
    const result = parseAiResponse(
      'Prazer! [UPDATE_CUSTOMER:name:João da Silva]',
    );

    expect(result.actions).toEqual([
      { type: 'UPDATE_CUSTOMER', field: 'name', value: 'João da Silva' },
    ]);
    expect(result.text).toBe('Prazer!');
  });
});
