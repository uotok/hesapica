(function(){
  'use strict';

  const STORAGE_KEY = 'hesapica_cookie_preferences_v2';
  const LEGACY_STORAGE_KEY = 'hesapica_cookie_preferences_v1';
  const STORAGE_VERSION = 2;

  const GA_MEASUREMENT_ID = 'G-6BNBXVN9EW';
  const ADSENSE_CLIENT = 'ca-pub-4334681065822132';


  function isLiveHost(){
    try {
      const host = String(window.location && window.location.hostname || '').toLowerCase();
      return host === 'hesapica.com' || host === 'www.hesapica.com';
    } catch(err){
      return false;
    }
  }

  const defaultPrefs = Object.freeze({
    version: STORAGE_VERSION,
    necessary: true,
    analytics: false,
    marketing: false,
    decided: false,
    updatedAt: null
  });

  let currentPrefs = { ...defaultPrefs };
  let lastFocusedElement = null;
  let previousBodyOverflow = '';
  let analyticsInitializedByConsent = false;
  let adsenseFrameworkInitialized = false;

  function safeRemoveStorage(key){
    try { localStorage.removeItem(key); } catch(err) {}
  }

  function isPlainObject(value){
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizePrefs(value, allowLegacy){
    if(!isPlainObject(value)) return null;

    if(!allowLegacy && value.version !== STORAGE_VERSION) return null;
    if(typeof value.analytics !== 'boolean') return null;
    if(typeof value.marketing !== 'boolean') return null;
    if(typeof value.decided !== 'boolean') return null;

    let updatedAt = null;
    if(typeof value.updatedAt === 'string'){
      const parsedDate = Date.parse(value.updatedAt);
      if(Number.isFinite(parsedDate)) updatedAt = new Date(parsedDate).toISOString();
    }

    const decided = value.decided === true;

    return {
      version: STORAGE_VERSION,
      necessary: true,
      analytics: decided ? value.analytics : false,
      marketing: decided ? value.marketing : false,
      decided: decided,
      updatedAt: decided ? updatedAt : null
    };
  }

  function persistPrefs(prefs){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      safeRemoveStorage(LEGACY_STORAGE_KEY);
      return true;
    } catch(err){
      return false;
    }
  }

  function readPrefs(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const normalized = normalizePrefs(JSON.parse(raw), false);
        if(normalized) return normalized;
        safeRemoveStorage(STORAGE_KEY);
      }
    } catch(err){
      safeRemoveStorage(STORAGE_KEY);
    }

    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if(legacyRaw){
        const normalizedLegacy = normalizePrefs(JSON.parse(legacyRaw), true);
        if(normalizedLegacy){
          persistPrefs(normalizedLegacy);
          return normalizedLegacy;
        }
        safeRemoveStorage(LEGACY_STORAGE_KEY);
      }
    } catch(err){
      safeRemoveStorage(LEGACY_STORAGE_KEY);
    }

    return { ...defaultPrefs };
  }

  function ensureGtagQueue(){
    window.dataLayer = window.dataLayer || [];
    if(typeof window.gtag !== 'function'){
      window.gtag = function(){ window.dataLayer.push(arguments); };
    }
  }

  function consentPayload(prefs){
    return {
      analytics_storage: prefs.analytics ? 'granted' : 'denied',
      ad_storage: prefs.marketing ? 'granted' : 'denied',
      ad_user_data: prefs.marketing ? 'granted' : 'denied',
      ad_personalization: prefs.marketing ? 'granted' : 'denied'
    };
  }

  function initializeGoogleConsent(){
    // Google-certified TCF CMP kullanıldığında Google tag'in TCF sinyallerini okuyabilmesini sağlar.
    // TCF API yoksa bu bayrak mevcut özel tercih akışını değiştirmez.
    window.gtag_enable_tcf_support = true;
    ensureGtagQueue();

    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  function updateGoogleConsent(prefs){
    ensureGtagQueue();
    window.gtag('consent', 'update', consentPayload(prefs));
  }

  function findScriptBySrcPart(part){
    return Array.from(document.scripts || []).find(function(script){
      return typeof script.src === 'string' && script.src.indexOf(part) !== -1;
    }) || null;
  }

  function loadAnalytics(){
    if(!currentPrefs.analytics || !isLiveHost()) return;

    window['ga-disable-' + GA_MEASUREMENT_ID] = false;
    ensureGtagQueue();

    const existing = findScriptBySrcPart('googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID);
    if(existing){
      analyticsInitializedByConsent = true;
      return;
    }

    if(analyticsInitializedByConsent) return;
    analyticsInitializedByConsent = true;

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    script.id = 'hesapica-ga4-loader';
    script.dataset.consentManaged = 'analytics';
    script.addEventListener('error', function(){
      analyticsInitializedByConsent = false;
      try { script.remove(); } catch(err) {}
    }, { once: true });
    document.head.appendChild(script);
  }

  function syncAdsenseRequestPause(){
    // AdSense'in resmi async tag kontrolü: script CMP/TCF için yüklü kalabilir,
    // ancak Hesapica marketing izni yokken hiçbir publisher ad request gönderilmez.
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.pauseAdRequests = currentPrefs.marketing ? 0 : 1;
  }

  function loadAdsenseFramework(){
    if(!isLiveHost()) return;

    syncAdsenseRequestPause();

    const existing = findScriptBySrcPart('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    if(existing){
      adsenseFrameworkInitialized = true;
      return;
    }

    if(adsenseFrameworkInitialized) return;
    adsenseFrameworkInitialized = true;

    // AdSense altyapı etiketi, Consent Mode varsayılanları DENIED kurulduktan sonra yüklenir.
    // Bu erken yükleme Google'ın sertifikalı CMP / TCF mesajının uygun bölgelerde çalışabilmesini sağlar.
    // Reklam birimleri ise ads-slot-manager.js tarafından ayrıca marketing iznine bağlı tutulur.
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
    script.id = 'hesapica-adsense-loader';
    script.dataset.consentManaged = 'marketing-framework';
    script.addEventListener('error', function(){
      adsenseFrameworkInitialized = false;
      try { script.remove(); } catch(err) {}
    }, { once: true });
    document.head.appendChild(script);
  }

  function hasUnmanagedGoogleScripts(){
    return Array.from(document.scripts || []).some(function(script){
      const src = typeof script.src === 'string' ? script.src : '';
      const isGoogleMeasurement = src.indexOf('googletagmanager.com/gtag/js') !== -1;
      const isAdsense = src.indexOf('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js') !== -1;
      const consentManaged = !!(script.dataset && script.dataset.consentManaged);
      return (isGoogleMeasurement || isAdsense) && !consentManaged;
    });
  }

  function applyServiceState(previousPrefs){
    window['ga-disable-' + GA_MEASUREMENT_ID] = !currentPrefs.analytics;
    updateGoogleConsent(currentPrefs);

    if(currentPrefs.analytics) loadAnalytics();
    // Google CMP/TCF mesajının ilk ziyarette çalışabilmesi için altyapı etiketi canlı hostta
    // consent varsayılanları kurulduktan sonra yüklenir. pauseAdRequests marketing tercihine göre
    // 1/0 durumuna çekildiği için izin yokken publisher ad request çıkmaz.
    loadAdsenseFramework();

    const analyticsRevoked = !!(previousPrefs && previousPrefs.analytics && !currentPrefs.analytics);
    const marketingRevoked = !!(previousPrefs && previousPrefs.marketing && !currentPrefs.marketing);

    if(analyticsRevoked || marketingRevoked){
      if(!hasUnmanagedGoogleScripts() && window.location && typeof window.location.reload === 'function'){
        window.setTimeout(function(){ window.location.reload(); }, 80);
      } else {
        document.documentElement.dataset.cookieReloadRecommended = 'yes';
      }
    } else {
      delete document.documentElement.dataset.cookieReloadRecommended;
    }
  }

  function publicPrefs(){
    return {
      necessary: true,
      analytics: currentPrefs.analytics,
      marketing: currentPrefs.marketing,
      decided: currentPrefs.decided,
      updatedAt: currentPrefs.updatedAt
    };
  }

  function applyPrefs(prefs){
    currentPrefs = { ...prefs, necessary: true };

    document.documentElement.dataset.cookieAnalytics = currentPrefs.analytics ? 'granted' : 'denied';
    document.documentElement.dataset.cookieMarketing = currentPrefs.marketing ? 'granted' : 'denied';
    document.documentElement.dataset.cookieConsentReady = currentPrefs.decided ? 'yes' : 'no';
    document.documentElement.dataset.hcEnvironment = isLiveHost() ? 'live' : 'preview';

    window.HesapicaCookieConsent = {
      getPreferences: function(){ return { ...publicPrefs() }; },
      canRun: function(category){
        if(category === 'necessary') return true;
        if(category === 'analytics') return currentPrefs.analytics;
        if(category === 'marketing') return currentPrefs.marketing;
        return false;
      },
      openPreferences: openModal,
      acceptAll: acceptAll,
      rejectOptional: rejectOptional
    };
  }

  function dispatchConsentChanged(){
    try {
      window.dispatchEvent(new CustomEvent('hesapica:cookie-consent-changed', {
        detail: { ...publicPrefs() }
      }));
    } catch(err) {}
  }

  function writePrefs(prefs){
    const next = normalizePrefs({
      version: STORAGE_VERSION,
      analytics: prefs.analytics === true,
      marketing: prefs.marketing === true,
      decided: true,
      updatedAt: new Date().toISOString()
    }, false);

    if(!next) return { ...publicPrefs() };

    const previous = { ...currentPrefs };
    persistPrefs(next);
    applyPrefs(next);
    applyServiceState(previous);
    dispatchConsentChanged();

    return { ...publicPrefs() };
  }

  function uiLang(){
    try { return String(document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'tr'; }
    catch(err){ return 'tr'; }
  }

  function uiCopy(){
    if(uiLang() === 'en') return {
      badge:'Hesapica · Cookie preferences', title:'You control your cookie preferences.',
      intro:'Hesapica uses necessary storage technologies for core site functions. Analytics and advertising/marketing technologies are managed according to your choices. See the Privacy and Cookie Policies for details.',
      accept:'Accept all', reject:'Necessary only', manage:'Manage preferences', privacy:'Privacy Policy', cookies:'Cookie Policy', details:'Open detailed settings',
      modalTitle:'Edit cookie preferences', modalDesc:'Necessary storage is required for core site functions and remembering your privacy choice. Analytics covers usage measurement; advertising/marketing covers ad-related technologies.', close:'Close cookie preferences',
      necessary:'Necessary', necessaryAria:'Necessary storage is always enabled', necessaryText:'Used for essential site functions and to remember your privacy choice; it cannot be disabled.',
      analytics:'Analytics', analyticsAria:'Allow analytics technologies', analyticsText:'Controls measurement technologies that help us understand which calculators and pages are used.',
      marketing:'Advertising and marketing', marketingAria:'Allow advertising and marketing technologies', marketingText:'Controls ad requests and advertising/marketing use. A certified Google CMP/TCF message may also appear in regions where it is required.',
      save:'Save preferences', status:'You can update your choice at any time from the “Cookie preferences” control on the page.', preference:'Cookie preferences', privacyHref:'/en/privacy-policy', cookieHref:'/en/cookie-policy'
    };
    return {
      badge:'Hesapica · Çerez tercihleri', title:'Çerez tercihlerini sen yönet.',
      intro:'Hesapica, zorunlu site işlevleri için gerekli depolama teknolojilerini kullanır. Analitik ile reklam/pazarlama teknolojileri ise tercihlerine göre yönetilir. Ayrıntılar için Gizlilik ve Çerez Politikalarını inceleyebilirsin.',
      accept:'Tümünü kabul et', reject:'Sadece zorunlu', manage:'Tercihleri yönet', privacy:'Gizlilik Politikası', cookies:'Çerez Politikası', details:'Detaylı ayarları aç',
      modalTitle:'Çerez tercihlerini düzenle', modalDesc:'Zorunlu depolama site işlevleri ve gizlilik tercihini hatırlamak için gereklidir. Analitik, kullanım istatistiklerine; reklam/pazarlama ise reklam sunumuna ilişkin tercihini ifade eder.', close:'Çerez tercihlerini kapat',
      necessary:'Zorunlu', necessaryAria:'Zorunlu depolama her zaman açık', necessaryText:'Temel site işlevlerinin ve seçtiğin gizlilik tercihinin hatırlanması için kullanılır; kapatılamaz.',
      analytics:'Analitik', analyticsAria:'Analitik teknolojilere izin ver', analyticsText:'Hangi araçların ve sayfaların kullanıldığını anlamaya yardımcı olan ölçüm teknolojilerini yönetir.',
      marketing:'Reklam ve pazarlama', marketingAria:'Reklam ve pazarlama teknolojilerine izin ver', marketingText:'Reklam alanlarının istenmesini ve reklam/pazarlama kullanımını yönetir. Google’ın sertifikalı CMP/TCF mesajı gereken bölgelerde ayrıca devreye girebilir.',
      save:'Tercihleri kaydet', status:'Tercihini dilediğin zaman sayfadaki “Çerez Tercihleri” erişim noktasından güncelleyebilirsin.', preference:'Çerez Tercihleri', privacyHref:'/gizlilik-politikasi', cookieHref:'/cerez-politikasi'
    };
  }

  function createUI(){
    if(document.getElementById('cookieBanner')) return true;
    if(!document.body) return false;
    const c = uiCopy();
    const banner = document.createElement('section');
    banner.className = 'cookie-banner'; banner.id = 'cookieBanner'; banner.setAttribute('role','region'); banner.setAttribute('aria-labelledby','cookieBannerTitle');
    banner.innerHTML = [
      '<div class="cookie-banner-card">','<span class="cookie-badge">'+c.badge+'</span>','<div class="cookie-banner-top"><div>',
      '<h2 id="cookieBannerTitle">'+c.title+'</h2>','<p>'+c.intro+'</p>','</div></div>',
      '<div class="cookie-actions">','<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-accept-all>'+c.accept+'</button>',
      '<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-reject>'+c.reject+'</button>',
      '<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-open>'+c.manage+'</button>','</div>',
      '<div class="cookie-mini-links">','<a href="'+c.privacyHref+'">'+c.privacy+'</a>','<a href="'+c.cookieHref+'">'+c.cookies+'</a>',
      '<button type="button" data-cookie-open>'+c.details+'</button>','</div></div>'
    ].join('');
    const backdrop=document.createElement('div'); backdrop.className='cookie-modal-backdrop';backdrop.id='cookieModalBackdrop';backdrop.setAttribute('aria-hidden','true');
    backdrop.innerHTML=[
      '<div class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookieModalTitle" aria-describedby="cookieModalDescription">',
      '<div class="cookie-modal-head"><div><h3 id="cookieModalTitle">'+c.modalTitle+'</h3><p id="cookieModalDescription">'+c.modalDesc+'</p></div>',
      '<button type="button" class="cookie-close" aria-label="'+c.close+'" data-cookie-close>×</button></div>',
      '<div class="cookie-options">',
      '<div class="cookie-option"><div class="cookie-option-head"><div><strong>'+c.necessary+'</strong></div><label class="cookie-switch"><input type="checkbox" checked disabled aria-label="'+c.necessaryAria+'"><span class="cookie-slider"></span></label></div><p>'+c.necessaryText+'</p></div>',
      '<div class="cookie-option"><div class="cookie-option-head"><div><strong>'+c.analytics+'</strong></div><label class="cookie-switch"><input type="checkbox" id="cookieAnalytics" aria-label="'+c.analyticsAria+'"><span class="cookie-slider"></span></label></div><p>'+c.analyticsText+'</p></div>',
      '<div class="cookie-option"><div class="cookie-option-head"><div><strong>'+c.marketing+'</strong></div><label class="cookie-switch"><input type="checkbox" id="cookieMarketing" aria-label="'+c.marketingAria+'"><span class="cookie-slider"></span></label></div><p>'+c.marketingText+'</p></div>',
      '</div><div class="cookie-modal-actions">','<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-save>'+c.save+'</button>',
      '<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-accept-all>'+c.accept+'</button>','<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-reject>'+c.reject+'</button>',
      '</div><div class="cookie-status" id="cookieStatusText" aria-live="polite">'+c.status+'</div></div>'
    ].join('');
    document.body.appendChild(banner); document.body.appendChild(backdrop); ensurePreferenceEntry();
    banner.querySelectorAll('[data-cookie-open]').forEach(function(btn){ btn.addEventListener('click', openModal); });
    banner.querySelectorAll('[data-cookie-accept-all]').forEach(function(btn){ btn.addEventListener('click', acceptAll); });
    banner.querySelectorAll('[data-cookie-reject]').forEach(function(btn){ btn.addEventListener('click', rejectOptional); });
    backdrop.querySelectorAll('[data-cookie-close]').forEach(function(btn){ btn.addEventListener('click', closeModal); });
    backdrop.querySelectorAll('[data-cookie-accept-all]').forEach(function(btn){ btn.addEventListener('click', acceptAll); });
    backdrop.querySelectorAll('[data-cookie-reject]').forEach(function(btn){ btn.addEventListener('click', rejectOptional); });
    const saveButton=backdrop.querySelector('[data-cookie-save]'); if(saveButton) saveButton.addEventListener('click',saveFromModal);
    backdrop.addEventListener('click',function(event){if(event.target===backdrop)closeModal();});
    document.addEventListener('keydown',handleModalKeydown);
    document.addEventListener('click',function(event){const target=event.target instanceof Element?event.target.closest('[data-open-cookie-preferences]'):null;if(!target)return;event.preventDefault();openModal();});
    return true;
  }

  function ensurePreferenceEntry(){
    let entry=document.getElementById('cookiePreferenceEntry'); if(entry)return entry;
    if(document.querySelector('[data-open-cookie-preferences]'))return null; if(!document.body)return null;
    const c=uiCopy(); entry=document.createElement('div');entry.className='cookie-preference-entry';entry.id='cookiePreferenceEntry';entry.hidden=true;
    entry.innerHTML=['<button type="button" class="cookie-preference-entry-btn" data-open-cookie-preferences>','<span aria-hidden="true">⚙</span>','<span>'+c.preference+'</span>','</button>','<a href="'+c.cookieHref+'">'+c.cookies+'</a>'].join('');
    document.body.appendChild(entry); return entry;
  }

  function syncPreferenceEntry(){
    const entry = ensurePreferenceEntry();
    if(!entry) return;
    entry.hidden = !currentPrefs.decided;
  }

  function syncModal(){
    const analytics = document.getElementById('cookieAnalytics');
    const marketing = document.getElementById('cookieMarketing');
    if(analytics) analytics.checked = !!currentPrefs.analytics;
    if(marketing) marketing.checked = !!currentPrefs.marketing;
  }

  function getFocusableElements(container){
    if(!container) return [];
    return Array.from(container.querySelectorAll([
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(','))).filter(function(el){
      return !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  function handleModalKeydown(event){
    const backdrop = document.getElementById('cookieModalBackdrop');
    if(!backdrop || !backdrop.classList.contains('is-visible')) return;

    if(event.key === 'Escape'){
      event.preventDefault();
      closeModal();
      return;
    }

    if(event.key !== 'Tab') return;

    const dialog = backdrop.querySelector('[role="dialog"]');
    const focusable = getFocusableElements(dialog);
    if(focusable.length === 0){
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if(event.shiftKey && document.activeElement === first){
      event.preventDefault();
      last.focus();
    } else if(!event.shiftKey && document.activeElement === last){
      event.preventDefault();
      first.focus();
    }
  }

  function openModal(){
    if(!createUI()) return;

    syncModal();
    const backdrop = document.getElementById('cookieModalBackdrop');
    if(!backdrop) return;

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;

    backdrop.classList.add('is-visible');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const focusTarget = document.getElementById('cookieAnalytics') || backdrop.querySelector('[data-cookie-close]');
    if(focusTarget && typeof focusTarget.focus === 'function'){
      window.setTimeout(function(){ focusTarget.focus(); }, 0);
    }
  }

  function closeModal(){
    const backdrop = document.getElementById('cookieModalBackdrop');
    if(backdrop){
      backdrop.classList.remove('is-visible');
      backdrop.setAttribute('aria-hidden', 'true');
    }

    if(document.body) document.body.style.overflow = previousBodyOverflow;

    if(lastFocusedElement && lastFocusedElement.isConnected && typeof lastFocusedElement.focus === 'function'){
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function hideBanner(){
    const el = document.getElementById('cookieBanner');
    if(el) el.classList.remove('is-visible');
    syncPreferenceEntry();
  }

  function showBanner(){
    const el = document.getElementById('cookieBanner');
    if(el) el.classList.add('is-visible');
    const entry = document.getElementById('cookiePreferenceEntry');
    if(entry) entry.hidden = true;
  }

  function acceptAll(){
    writePrefs({ analytics: true, marketing: true });
    hideBanner();
    closeModal();
  }

  function rejectOptional(){
    writePrefs({ analytics: false, marketing: false });
    hideBanner();
    closeModal();
  }

  function saveFromModal(){
    const analytics = document.getElementById('cookieAnalytics');
    const marketing = document.getElementById('cookieMarketing');

    writePrefs({
      analytics: !!(analytics && analytics.checked),
      marketing: !!(marketing && marketing.checked)
    });

    hideBanner();
    closeModal();
  }

  function initUI(){
    if(!createUI()) return;
    syncModal();
    syncPreferenceEntry();
    if(!currentPrefs.decided){
      window.setTimeout(showBanner, 250);
    } else {
      hideBanner();
    }
  }

  function handleStorageChange(event){
    if(!event || (event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY)) return;

    try {
      if(event.storageArea && event.storageArea !== window.localStorage) return;
    } catch(err) {
      return;
    }

    const previous = { ...currentPrefs };
    const fresh = readPrefs();
    applyPrefs(fresh);
    applyServiceState(previous);
    syncModal();
    syncPreferenceEntry();
    dispatchConsentChanged();

    if(currentPrefs.decided) hideBanner();
    else showBanner();
  }

  currentPrefs = readPrefs();
  initializeGoogleConsent();
  applyPrefs(currentPrefs);
  applyServiceState(null);

  window.addEventListener('storage', handleStorageChange);

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initUI, { once: true });
  } else {
    initUI();
  }
})();
