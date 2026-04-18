import axios from 'axios';
import { describe, expect, it } from 'vitest';

import { getApiErrorMessage } from '@/core/utils/apiError';

describe('getApiErrorMessage', () => {
  it('reads message from JSON body', () => {
    const err = new axios.AxiosError('fail', 'ERR', {} as never, {}, {
      status: 400,
      data: { message: 'Bad input' },
    } as never);
    expect(getApiErrorMessage(err)).toBe('Bad input');
  });

  it('reads error string from JSON body', () => {
    const err = new axios.AxiosError('fail', 'ERR', {} as never, {}, {
      status: 500,
      data: { error: 'Server exploded' },
    } as never);
    expect(getApiErrorMessage(err)).toBe('Server exploded');
  });

  it('uses fallback for unknown errors', () => {
    expect(getApiErrorMessage(new Error('x'), 'fallback')).toBe('x');
    expect(getApiErrorMessage('weird', 'fallback')).toBe('fallback');
  });
});
