export type AiActionType = 'TRANSFER_TO_HUMAN' | 'UPDATE_CUSTOMER';

export interface TransferToHumanAction {
  type: 'TRANSFER_TO_HUMAN';
}

export interface UpdateCustomerAction {
  type: 'UPDATE_CUSTOMER';
  field: string;
  value: string;
}

export type AiAction = TransferToHumanAction | UpdateCustomerAction;

export interface ParsedAiResponse {
  text: string;
  actions: AiAction[];
}

export function parseAiResponse(text: string): ParsedAiResponse {
  const actions: AiAction[] = [];
  let cleanText = text;

  if (text.includes('[TRANSFER_TO_HUMAN]')) {
    actions.push({ type: 'TRANSFER_TO_HUMAN' });
    cleanText = cleanText.replace('[TRANSFER_TO_HUMAN]', '').trim();
  }

  const updateRegex = /\[UPDATE_CUSTOMER:(\w+):(.+?)\]/g;
  let match: RegExpExecArray | null;
  while ((match = updateRegex.exec(text)) !== null) {
    actions.push({
      type: 'UPDATE_CUSTOMER',
      field: match[1],
      value: match[2],
    });
    cleanText = cleanText.replace(match[0], '').trim();
  }

  return { text: cleanText, actions };
}
