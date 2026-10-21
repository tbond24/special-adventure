// Separate prospective development experiment. Existing analytics stay intact.
(() => {
  const events = new Set(['vacancy_smoke_completed']);
  let consent = false, client = null, pending = null, generation = 0;
  const permitted = () => consent && navigator.doNotTrack !== '1' &&
    navigator.globalPrivacyControl !== true && !/^#(?:admin|auth|reset-password|forgot-password)(?:$|[/?])/.test(location.hash) &&
    location.pathname !== '/__admin-preview';

  async function enable() {
    if (!permitted()) return false;
    if (client) return true;
    if (pending) return pending;
    const ticket = generation;
    const job = (async () => {
      try {
        const response = await fetch('/api/posthog-config', {cache:'no-store', signal:AbortSignal.timeout(3000)});
        if (!response.ok) return false;
        const config = await response.json();
        if (!config.enabled || !/^phc_[A-Za-z0-9_-]{10,200}$/.test(config.token) ||
            !['https://us.i.posthog.com','https://eu.i.posthog.com'].includes(config.host) ||
            ticket !== generation || !permitted()) return false;
        if (!window.posthog) await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/vendor/posthog/posthog.js'; script.async = true;
          script.onload = resolve; script.onerror = reject; document.head.append(script);
        });
        if (ticket !== generation || !permitted() || !window.posthog) return false;
        client = window.posthog.init(config.token, {
          api_host:config.host,
          autocapture:false, capture_pageview:false, capture_pageleave:false,
          capture_dead_clicks:false, rageclick:false, capture_exceptions:false,
          capture_heatmaps:false, capture_performance:false,
          disable_session_recording:true, disable_surveys:true,
          advanced_disable_feature_flags:true, advanced_disable_flags:true,
          advanced_disable_decide:true, disable_external_dependency_loading:true,
          person_profiles:'never', persistence:'memory', disable_persistence:true,
          ip:false, respect_dnt:true, save_referrer:false, save_campaign_params:false,
          request_batching:false, disable_compression:true,
          before_send:event => {
            if (!permitted() || !events.has(event.event)) return null;
            // Replace SDK enrichment: URLs, referrers, form contents and account IDs
            // must never escape through automatically added event properties.
            return {event:event.event, uuid:event.uuid, timestamp:event.timestamp, properties:{
              token:config.token, distinct_id:client?.get_distinct_id(),
              $process_person_profile:false, $geoip_disable:true,
              environment:'development', source:'manual_smoke'
            }};
          }
        });
        client?.opt_in_capturing({captureEventName:false});
        return Boolean(client);
      } catch { return false; }
    })();
    pending = job;
    try { return await job; } finally { if (pending === job) pending = null; }
  }

  window.VACANCY_POSTHOG = Object.freeze({
    // This dedicated choice is in memory, never inferred from existing consent.
    async setConsent(accepted) {
      const next = accepted === true;
      if (next !== consent) generation++;
      consent = next;
      if (!consent) {
        pending = null;
        try { client?.reset(); client?.opt_out_capturing(); } catch {}
        client = null; return false;
      }
      return enable();
    },
    capture(name) {
      if (!client || !permitted() || !events.has(name)) return false;
      try { return Boolean(client.capture(name)); } catch { return false; }
    }
  });
})();
