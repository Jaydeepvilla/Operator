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

    // Create stylesheet for 2026 dimensional animations & mobile responsiveness
    var style = document.createElement('style');
    style.innerHTML =
      '.operator-widget-container, .nexx-widget-container { position: fixed; z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }' +
      '.operator-widget-launcher, .nexx-widget-launcher { cursor: pointer; border-radius: 9999px; box-shadow: 0 12px 28px -4px rgba(0,0,0,0.28), 0 8px 12px -6px rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); }' +
      '.operator-widget-launcher:hover, .nexx-widget-launcher:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 18px 36px -4px rgba(0,0,0,0.35); }' +
      '.operator-widget-frame-container, .nexx-widget-frame-container { overflow: hidden; opacity: 0; pointer-events: none; transform: translateY(24px) scale(0.96); transform-origin: bottom right; border-radius: 18px; -webkit-mask-image: -webkit-radial-gradient(white, black); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.6); background: #030712; transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease; }' +
      '.operator-widget-frame-container.open, .nexx-widget-frame-container.open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }' +
      '@media (max-width: 480px) {' +
      '  .operator-widget-container { bottom: 0 !important; right: 0 !important; left: 0 !important; }' +
      '  .operator-widget-frame-container { width: 100vw !important; height: 100dvh !important; bottom: 0 !important; border-radius: 0 !important; max-width: 100% !important; max-height: 100dvh !important; }' +
      '}';
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
    iframe.style.borderRadius = '18px';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('allowtransparency', 'true');
    frameContainer.appendChild(iframe);
    container.appendChild(frameContainer);

    // Launcher Design SVG
    var launcherSize = settings.launcher.size === 'small' ? 52 : (settings.launcher.size === 'large' ? 68 : 60);
    var launcher = document.createElement('div');
    launcher.className = 'operator-widget-launcher';
    launcher.style.width = launcherSize + 'px';
    launcher.style.height = launcherSize + 'px';
    launcher.style.backgroundColor = settings.theme.primaryColor || '#7a5af8';
    launcher.style.overflow = 'hidden';

    var defaultBubbleIcon = (settings.branding && settings.branding.logoUrl)
      ? '<img src="' + settings.branding.logoUrl + '" alt="Chat" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>' +
        '<circle cx="9" cy="12" r="1" fill="#ffffff" stroke="none" />' +
        '<circle cx="12" cy="12" r="1" fill="#ffffff" stroke="none" />' +
        '<circle cx="15" cy="12" r="1" fill="#ffffff" stroke="none" />' +
        '</svg>';

    launcher.innerHTML = defaultBubbleIcon;
    container.appendChild(launcher);

    // Toggle Handler
    function toggleWidget(forceState) {
      isOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
      if (isOpen) {
        frameContainer.className = 'operator-widget-frame-container open';
        launcher.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"></line>' +
          '<line x1="6" y1="6" x2="18" y2="18"></line>' +
          '</svg>';
        // Track widget open event
        postEvent('widget_open');
      } else {
        frameContainer.className = 'operator-widget-frame-container';
        launcher.innerHTML = defaultBubbleIcon;
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
