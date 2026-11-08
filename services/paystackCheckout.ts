export function paystackResumeHtml(accessCode: string) {
  const encodedAccessCode = JSON.stringify(accessCode);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></head><body style="margin:0;background:#fff"><script src="https://js.paystack.co/v2/inline.js"></script><script>
    (function(){
      var started = false;
      function send(event, data){ window.ReactNativeWebView.postMessage(JSON.stringify({event:event,data:data || null})); }
      function start(){
        if (started) return;
        if (!window.PaystackPop) { setTimeout(start, 100); return; }
        started = true;
        try {
          var paystack = new PaystackPop();
          paystack.resumeTransaction(${encodedAccessCode}, {
            onLoad: function(data){ send('load', data); },
            onSuccess: function(data){ send('success', data); },
            onCancel: function(){ send('cancel'); },
            onError: function(error){ send('error', {message: error && error.message ? error.message : 'Paystack checkout could not load.'}); }
          });
        } catch(error) { send('error', {message: error && error.message ? error.message : 'Paystack checkout could not start.'}); }
      }
      start();
    })();
  </script></body></html>`;
}
