(function () {
  const CHANNEL = 'eduhub:game-bridge';
  const listeners = new Set();

  function post(type, payload) {
    if (window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        channel: CHANNEL,
        type,
        timestamp: new Date().toISOString(),
        payload: payload || {},
      },
      '*',
    );
  }

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || data.channel !== CHANNEL || typeof data.type !== 'string') {
      return;
    }

    listeners.forEach(function (listener) {
      try {
        listener(data.type, data.payload || {});
      } catch (error) {
        post('game:error', {
          status: 'error',
          reason: 'bridge-listener-failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  });

  window.addEventListener('error', function (event) {
    post('game:error', {
      status: 'error',
      reason: 'iframe-runtime-error',
      message: event.message || 'Unknown iframe runtime error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    post('game:error', {
      status: 'error',
      reason: 'iframe-unhandled-rejection',
      message: reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection'),
    });
  });

  window.EduHubGameBridge = {
    ready: function (payload) {
      post('game:ready', payload);
    },
    state: function (payload) {
      post('game:state', payload);
    },
    progress: function (payload) {
      post('game:progress', payload);
    },
    questionTrigger: function (payload) {
      post('game:question-trigger', payload);
    },
    complete: function (payload) {
      post('game:complete', payload);
    },
    error: function (payload) {
      post('game:error', payload);
    },
    onHostMessage: function (listener) {
      listeners.add(listener);
      return function () {
        listeners.delete(listener);
      };
    },
  };
})();
