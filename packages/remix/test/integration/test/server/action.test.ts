import { assertSentryTransaction, assertSentryEvent, RemixTestEnv } from './utils/helpers';

jest.spyOn(console, 'error').mockImplementation();

// Repeat tests for each adapter
describe.each(['builtin', 'express'])('Remix API Actions with adapter = %s', adapter => {
  it('correctly instruments a parameterized Remix API action', async () => {
    const env = await RemixTestEnv.init(adapter);
    const url = `${env.url}/action-json-response/123123`;
    const envelope = await env.getEnvelopeRequest({ url, method: 'post', envelopeType: 'transaction' });
    const transaction = envelope[2];

    assertSentryTransaction(transaction, {
      transaction: 'routes/action-json-response/$id',
      spans: [
        {
          description: 'routes/action-json-response/$id',
          op: 'function.remix.action',
        },
        {
          description: 'root',
          op: 'function.remix.loader',
        },
        {
          description: 'routes/action-json-response/$id',
          op: 'function.remix.loader',
        },
        {
          description: 'routes/action-json-response/$id',
          op: 'function.remix.document_request',
        },
      ],
      request: {
        method: 'POST',
        url,
      },
    });
  });

  it('reports an error thrown from the action', async () => {
    const env = await RemixTestEnv.init(adapter);
    const url = `${env.url}/action-json-response/-1`;

    const envelopes = await env.getMultipleEnvelopeRequest({
      url,
      count: 2,
      method: 'post',
      envelopeType: ['transaction', 'event'],
    });

    const [transaction] = envelopes.filter(envelope => envelope[1].type === 'transaction');
    const [event] = envelopes.filter(envelope => envelope[1].type === 'event');

    assertSentryTransaction(transaction[2], {
      contexts: {
        trace: {
          status: 'internal_error',
          tags: {
            'http.status_code': '500',
          },
        },
      },
    });

    assertSentryEvent(event[2], {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Unexpected Server Error',
            stacktrace: expect.any(Object),
            mechanism: {
              data: {
                function: 'action',
              },
              handled: true,
              type: 'instrument',
            },
          },
        ],
      },
    });
  });

  it('includes request data in transaction and error events', async () => {
    const env = await RemixTestEnv.init(adapter);
    const url = `${env.url}/action-json-response/-1`;

    const envelopes = await env.getMultipleEnvelopeRequest({
      url,
      count: 2,
      method: 'post',
      envelopeType: ['transaction', 'event'],
    });

    const [transaction] = envelopes.filter(envelope => envelope[1].type === 'transaction');
    const [event] = envelopes.filter(envelope => envelope[1].type === 'event');

    assertSentryTransaction(transaction[2], {
      transaction: 'routes/action-json-response/$id',
      request: {
        method: 'POST',
        url,
      },
    });

    assertSentryEvent(event[2], {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Unexpected Server Error',
          },
        ],
      },
      request: {
        method: 'POST',
        url,
      },
    });
  });

  it('handles a thrown 500 response', async () => {
    const env = await RemixTestEnv.init(adapter);
    const url = `${env.url}/action-json-response/-2`;

    const envelopes = await env.getMultipleEnvelopeRequest({
      url,
      count: 3,
      method: 'post',
      envelopeType: ['transaction', 'event'],
    });

    const [transaction_1, transaction_2] = envelopes.filter(envelope => envelope[1].type === 'transaction');
    const [event] = envelopes.filter(envelope => envelope[1].type === 'event');

    assertSentryTransaction(transaction_1[2], {
      contexts: {
        trace: {
          op: 'http.server',
          status: 'ok',
          tags: {
            method: 'POST',
            'http.status_code': '302',
          },
        },
      },
      tags: {
        transaction: 'routes/action-json-response/$id',
      },
    });

    assertSentryTransaction(transaction_2[2], {
      contexts: {
        trace: {
          op: 'http.server',
          status: 'internal_error',
          tags: {
            method: 'GET',
            'http.status_code': '500',
          },
        },
      },
      tags: {
        transaction: 'routes/action-json-response/$id',
      },
    });

    assertSentryEvent(event[2], {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Unexpected Server Error from Loader',
            stacktrace: expect.any(Object),
            mechanism: {
              data: {
                function: 'loader',
              },
              handled: true,
              type: 'instrument',
            },
          },
        ],
      },
    });
  });
});
