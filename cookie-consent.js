(function(){
  const STORAGE_KEY = 'hesapica_cookie_preferences_v1';
  const defaultPrefs = {
    necessary: true,
    analytics: false,
    marketing: false,
    decided: false,
    updatedAt: null
  };

  function readPrefs(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { ...defaultPrefs };
      const parsed = JSON.parse(raw);
      return { ...defaultPrefs, ...parsed, necessary: true };
    } catch(err){
      return { ...defaultPrefs };
    }
  }

  function writePrefs(prefs){
    const finalPrefs = { ...defaultPrefs, ...prefs, necessary:true, decided:true, updatedAt:new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs)); } catch(err) {}
    applyPrefs(finalPrefs);
    window.dispatchEvent(new CustomEvent('hesapica:cookie-consent-changed', { detail: finalPrefs }));
    return finalPrefs;
  }

  function applyPrefs(prefs){
    document.documentElement.dataset.cookieAnalytics = prefs.analytics ? 'granted' : 'denied';
    document.documentElement.dataset.cookieMarketing = prefs.marketing ? 'granted' : 'denied';
    document.documentElement.dataset.cookieConsentReady = prefs.decided ? 'yes' : 'no';
    window.HesapicaCookieConsent = {
      getPreferences: function(){ return { ...prefs }; },
      canRun: function(category){ return !!prefs[category]; },
      openPreferences: openModal,
      acceptAll: acceptAll,
      rejectOptional: rejectOptional
    };
  }

  function createUI(){
    if(document.getElementById('cookieBanner')) return;
    const banner = document.createElement('section');
    banner.className = 'cookie-banner';
    banner.id = 'cookieBanner';
    banner.setAttribute('aria-label', 'Çerez bildirimi');
    banner.innerHTML = [
      '<div class="cookie-banner-card">',
        '<span class="cookie-badge">Hesapica · Çerez tercihleri</span>',
        '<div class="cookie-banner-top">',
          '<div>',
            '<h2>Çerez tercihlerini sen yönet.</h2>',
            '<p>Hesapica, sitenin düzgün çalışması için zorunlu çerezler kullanır. Analitik ve reklam/pazarlama çerezleri ise yalnızca sen izin verirsen etkinleşir. Türkiye için bu yaklaşım şeffaflık ve açık rıza akışını güçlendirir; Avrupa trafiği için ise AdSense tarafında ayrıca sertifikalı CMP yapılandırması gerekir.</p>',
          '</div>',
        '</div>',
        '<div class="cookie-actions">',
          '<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-accept-all>Tümünü kabul et</button>',
          '<button type="button" class="cookie-btn cookie-btn-ghost" data-cookie-reject>Sadece zorunlu</button>',
          '<button type="button" class="cookie-btn cookie-btn-primary" data-cookie-open>Tercihleri yönet</button>',
        '</div>',
        '<div class="cookie-mini-links">',
          '<a href="gizlilik-politikasi.html">Gizlilik Politikası</a>',
          '<a href="cerez-politikasi.html">Çerez Politikası</a>',
          '<button type="button" data-cookie-open>Detaylı ayarları aç</button>',
        '</div>',
      '</div>'
    ].join('');

    const backdrop = document.createElement('div');
    backdrop.className = 'cookie-modal-backdrop';
    backdrop.id = 'cookieModalBackdrop';
    backdrop.innerHTML = [
      '<div class="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookieModalTitle">',
        '<div class="cookie-modal-head">',
          '<div>',
            '<h3 id="cookieModalTitle">Çerez tercihlerini düzenle</h3>',
            '<p>Zorunlu çerezler sitenin temel çalışması için gereklidir ve kapatılamaz. Analitik çerezler kullanım istatistikleri üretir. Reklam/pazarlama çerezleri ise reklam gösterimi ve gelir optimizasyonunda kullanılır.</p>',
          '</div>',
          '<button type="button" class="cookie-close" aria-label="Kapat" data-cookie-close>×</button>',
        '</div>',
        '<div class="cookie-options">',
          '<div class="cookie-option">',
            '<div class="cookie-option-head">',
              '<div><strong>Zorunlu çerezler</strong></div>',
              '<label class="cookie-switch"><input type="checkbox" checked disabled><span class="cookie-slider"></span></label>',
            '</div>',
            '<p>Oturumun sürmesi, güvenlik, formların çalışması ve seçtiğin gizlilik tercihinin hatırlanması için kullanılır.</p>',
          '</div>',
          '<div class="cookie-option">',
            '<div class="cookie-option-head">',
              '<div><strong>Analitik çerezler</strong></div>',
              '<label class="cookie-switch"><input type="checkbox" id="cookieAnalytics"><span class="cookie-slider"></span></label>',
            '</div>',
            '<p>Hangi araçların daha çok kullanıldığını, hangi sayfaların iyileştirilmesi gerektiğini anlamaya yardımcı olur.</p>',
          '</div>',
          '<div class="cookie-option">',
            '<div class="cookie-option-head">',
              '<div><strong>Reklam ve pazarlama çerezleri</strong></div>',
              '<label class="cookie-switch"><input type="checkbox" id="cookieMarketing"><span class="cookie-slider"></span></label>',
            '</div>',
            '<p>AdSense veya benzeri reklam çözümleri eklendiğinde reklam sunumu, frekans kontrolü ve gelir optimizasyonu için kullanılabilir.</p>',
          '</div>',
        '</div>',
        '<div class="cookie-modal-actions">',
          '<button type="button" class="cookie-btn cookie-btn-primary" data-cookie-save>Tercihleri kaydet</button>',
          '<button type="button" class="cookie-btn cookie-btn-secondary" data-cookie-accept-all>Tümünü kabul et</button>',
          '<button type="button" class="cookie-btn cookie-btn-ghost" data-cookie-reject>Sadece zorunlu</button>',
        '</div>',
        '<div class="cookie-status" id="cookieStatusText">Tercihini dilediğin zaman footer’daki “Çerez Tercihleri” düğmesinden güncelleyebilirsin.</div>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);
    document.body.appendChild(backdrop);

    banner.querySelectorAll('[data-cookie-open]').forEach(btn => btn.addEventListener('click', openModal));
    banner.querySelectorAll('[data-cookie-accept-all]').forEach(btn => btn.addEventListener('click', acceptAll));
    banner.querySelectorAll('[data-cookie-reject]').forEach(btn => btn.addEventListener('click', rejectOptional));
    backdrop.querySelectorAll('[data-cookie-close]').forEach(btn => btn.addEventListener('click', closeModal));
    backdrop.querySelectorAll('[data-cookie-accept-all]').forEach(btn => btn.addEventListener('click', acceptAll));
    backdrop.querySelectorAll('[data-cookie-reject]').forEach(btn => btn.addEventListener('click', rejectOptional));
    backdrop.querySelector('[data-cookie-save]').addEventListener('click', saveFromModal);
    backdrop.addEventListener('click', function(event){ if(event.target === backdrop) closeModal(); });

    document.querySelectorAll('[data-open-cookie-preferences]').forEach(btn => btn.addEventListener('click', openModal));
  }

  function syncModal(){
    const prefs = readPrefs();
    const analytics = document.getElementById('cookieAnalytics');
    const marketing = document.getElementById('cookieMarketing');
    if(analytics) analytics.checked = !!prefs.analytics;
    if(marketing) marketing.checked = !!prefs.marketing;
  }

  function openModal(){
    syncModal();
    const el = document.getElementById('cookieModalBackdrop');
    if(el) el.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    const el = document.getElementById('cookieModalBackdrop');
    if(el) el.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  function hideBanner(){
    const el = document.getElementById('cookieBanner');
    if(el) el.classList.remove('is-visible');
  }

  function showBanner(){
    const el = document.getElementById('cookieBanner');
    if(el) el.classList.add('is-visible');
  }

  function acceptAll(){
    writePrefs({ analytics:true, marketing:true });
    hideBanner();
    closeModal();
  }

  function rejectOptional(){
    writePrefs({ analytics:false, marketing:false });
    hideBanner();
    closeModal();
  }

  function saveFromModal(){
    const analytics = document.getElementById('cookieAnalytics');
    const marketing = document.getElementById('cookieMarketing');
    writePrefs({ analytics:!!(analytics && analytics.checked), marketing:!!(marketing && marketing.checked) });
    hideBanner();
    closeModal();
  }

  document.addEventListener('DOMContentLoaded', function(){
    createUI();
    const prefs = readPrefs();
    applyPrefs(prefs);
    if(!prefs.decided){
      setTimeout(showBanner, 250);
    }
  });
})();
