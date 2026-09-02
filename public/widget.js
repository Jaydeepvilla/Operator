(function () {
  // 1. Resolve host script and attributes
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var orgId = script ? script.getAttribute('data-org-id') : null;
  if (!orgId) {
    console.error('[Operator Widget] Missing data-org-id attribute on host script tag.');
    return;
  }

  // Fetch host address to build links
  var hostUrl = new URL(script.src).origin;
  var configUrl = hostUrl + '/api/widget/config?orgId=' + orgId;

  // 2. Fetch widget settings
  fetch(configUrl)
    .then(function (res) {
      if (!res.ok) {
        throw new Error('Verification failed or domain unauthorized');
      }
      return res.json();
    })
    .then(function (data) {
      if (!data.success || !data.settings || !data.settings.enabled) {
        return;
      }
      initWidget(data.settings);
    })
    .catch(function (err) {
      console.warn('[Operator Widget] Initialization skipped:', err.message);
    });

  function initWidget(settings) {
    var isOpen = false;
    var conversationId =
      localStorage.getItem('operator_widget_conv_id_' + orgId) ||
      localStorage.getItem('nexx_widget_conv_id_' + orgId) ||
      '';

    // Create stylesheet for basic transition animations
    var style = document.createElement('style');
    style.innerHTML =
      '.operator-widget-container, .nexx-widget-container { position: fixed; z-index: 999999; font-family: system-ui, sans-serif; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }' +
      '.operator-widget-launcher, .nexx-widget-launcher { cursor: pointer; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }' +
      '.operator-widget-launcher:hover, .nexx-widget-launcher:hover { transform: scale(1.06); }' +
      '.operator-widget-frame-container, .nexx-widget-frame-container { overflow: hidden; opacity: 0; pointer-events: none; transform: translateY(20px); border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); border: 1px solid ' + settings.theme.borderColor + '; background: ' + settings.theme.backgroundColor + '; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }' +
      '.operator-widget-frame-container.open, .nexx-widget-frame-container.open { opacity: 1; pointer-events: auto; transform: translateY(0); }';
    document.head.appendChild(style);

    // Create Container
    var container = document.createElement('div');
    container.className = 'operator-widget-container';

    // Position Settings
    var isRight = settings.launcher.position !== 'bottom_left';
    container.style.bottom = settings.launcher.spacingY + 'px';
    if (isRight) {
      container.style.right = settings.launcher.spacingX + 'px';
    } else {
      container.style.left = settings.launcher.spacingX + 'px';
    }
    document.body.appendChild(container);

    // Create Frame Container
    var frameContainer = document.createElement('div');
    frameContainer.className = 'operator-widget-frame-container';
    frameContainer.style.width = settings.customization.widgetWidth + 'px';
    frameContainer.style.height = settings.customization.widgetHeight + 'px';
    frameContainer.style.position = 'absolute';
    frameContainer.style.bottom = '80px';
    if (isRight) {
      frameContainer.style.right = '0';
    } else {
      frameContainer.style.left = '0';
    }

    // Embed Sandbox IFrame
    var iframe = document.createElement('iframe');
    var iframeSrc = hostUrl + '/widget-frame?orgId=' + orgId + '&convId=' + conversationId + '&origin=' + encodeURIComponent(window.location.origin);
    iframe.src = iframeSrc;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';
    frameContainer.appendChild(iframe);
    container.appendChild(frameContainer);

    // Launcher Design SVG
    var launcherSize = settings.launcher.size === 'small' ? 50 : (settings.launcher.size === 'large' ? 64 : 56);
    var launcher = document.createElement('div');
    launcher.className = 'operator-widget-launcher';
    launcher.style.width = launcherSize + 'px';
    launcher.style.height = launcherSize + 'px';
    launcher.style.backgroundColor = settings.theme.primaryColor;
    launcher.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + settings.theme.textColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
      '</svg>';
    container.appendChild(launcher);

    // Toggle Handler
    function toggleWidget(forceState) {
      isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
      if (isOpen) {
        frameContainer.className = 'operator-widget-frame-container open';
        launcher.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + settings.theme.textColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"></line>' +
          '<line x1="6" y1="6" x2="18" y2="18"></line>' +
          '</svg>';
        // Track widget open event
        postEvent('widget_open');
      } else {
        frameContainer.className = 'operator-widget-frame-container';
        launcher.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + settings.theme.textColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
          '</svg>';
      }
    }
    launcher.addEventListener('click', toggleWidget);

    // 3. IFrame Messaging Channels (Strict Origin & Source Validation)
    window.addEventListener('message', function (event) {
      // Reject any messages not originating from trusted host URL
      if (event.origin !== hostUrl) return;

      // Reject messages not originating from our embedded iframe
      if (iframe && event.source !== iframe.contentWindow) return;

      var data = event.data;
      if (!data || typeof data !== 'object') return;

      var type = data.type;
      if (!type || typeof type !== 'string') return;

      switch (type) {
        // Canonical Operator event & legacy compatibility
        case 'operator:widget:session_started':
        case 'NEXX_SESSION_STARTED':
          var convId = data.conversationId;
          if (convId && typeof convId === 'string') {
            localStorage.setItem('operator_widget_conv_id_' + orgId, convId);
            postEvent('convo_start');
          }
          break;

        case 'operator:widget:booking_completed':
        case 'NEXX_BOOKING_COMPLETED':
          postEvent('booking_complete', data.details || null);
          break;

        case 'operator:widget:lead_captured':
        case 'NEXX_LEAD_CAPTURED':
          postEvent('lead_capture', data.details || null);
          break;

        case 'operator:widget:toggle':
        case 'NEXX_TOGGLE':
          toggleWidget();
          break;

        case 'operator:widget:open':
          toggleWidget(true);
          break;

        case 'operator:widget:close':
          toggleWidget(false);
          break;
      }
    });

    function postEvent(type, data) {
      var sessionId =
        localStorage.getItem('operator_widget_sess_id_' + orgId) ||
        localStorage.getItem('nexx_widget_sess_id_' + orgId) ||
        '';

      fetch(hostUrl + '/api/widget/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: orgId,
          sessionId: sessionId || null,
          eventType: type,
          eventData: data || null
        })
      }).then(function (res) {
        return res.json();
      }).then(function (resData) {
        if (resData.success && resData.eventId && type === 'convo_start') {
          localStorage.setItem('operator_widget_sess_id_' + orgId, resData.eventId);
        }
      }).catch(function (e) {
        console.warn('[Operator Widget] Analytics event log error:', e);
      });
    }

    // 4. Proactive message trigger rules
    if (settings.customization && settings.customization.proactiveTriggers && settings.customization.proactiveTriggers.active) {
      var timeOnPage = settings.customization.proactiveTriggers.timeOnPage || 10;
      setTimeout(function () {
        if (!isOpen) {
          toggleWidget(true);
        }
      }, timeOnPage * 1000);
    }
  }
})();
