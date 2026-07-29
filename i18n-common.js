(function(){
  const STORAGE_KEY = 'hesapica_language';

  const globalMap = {
    'Ana Sayfa':'Home',
    'Finans':'Finance',
    'Vergi':'Tax',
    'Emlak':'Real Estate',
    'Yatırım':'Investment',
    'Araç':'Vehicle',
    'Matematik':'Math',
    'Hesaplama':'Calculation',
    'Hesaplama Aracı':'Calculator Tool',
    'Sonucu Gör':'Show Result',
    'Örnek Veri':'Sample Data',
    'Temizle':'Clear',
    'Verileri Sıfırla':'Reset Inputs',
    'Paylaş':'Share',
    'Sonucu Kopyala':'Copy Result',
    'Yazdır / PDF':'Print / PDF',
    'Kısa Yorum':'Quick Note',
    'Yorum':'Comment',
    'Sık sorulanlar':'Frequently Asked Questions',
    'Sık sorulan sorular':'Frequently Asked Questions',
    'İlgili araçlar':'Related Tools',
    'İlgili Araç':'Related Tool',
    'Veri bekleniyor':'Waiting for data',
    'Hazır':'Ready',
    'Kontrol et':'Check',
    'Sonuç bekleniyor':'Waiting for results',
    'Ana sonuç':'Main result',
    'Brüt':'Gross',
    'Net':'Net',
    'Anapara':'Principal',
    'Faiz':'Interest',
    'Vade':'Term',
    'Aylık':'Monthly',
    'Yıllık':'Yearly',
    'Gelir':'Income',
    'Gider':'Expense',
    'KDV':'VAT',
    'Kira':'Rent',
    'Enflasyon':'Inflation',
    'Bütçe':'Budget',
    'Kredi':'Loan',
    'Kredi Kartı':'Credit Card',
    'Maaş':'Salary'
  };

  function setMeta(name, value){
    const el = document.querySelector(`meta[name="${name}"]`);
    if (el && value) el.setAttribute('content', value);
  }

  function setMetaProp(prop, value){
    const el = document.querySelector(`meta[property="${prop}"]`);
    if (el && value) el.setAttribute('content', value);
  }

  function upsertAlternate(hreflang, href){
    if (!href) return;
    let link = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if (!link){
      link = document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  function normalize(text){
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function replaceFromMap(text, dict){
    if (!text) return text;
    let output = text;
    const entries = Object.entries(dict || {}).sort((a,b) => b[0].length - a[0].length);
    for (const [tr, en] of entries){
      if (!tr || !en) continue;
      output = output.split(tr).join(en);
    }
    return output;
  }

  function translatePlaceholders(lang, cfg){
    if (!cfg.placeholders) return;
    Object.entries(cfg.placeholders).forEach(([selector, value]) => {
      const node = document.querySelector(selector);
      if (!node) return;
      if (lang === 'en') node.setAttribute('placeholder', value.en || node.getAttribute('placeholder') || '');
      else if (value.tr) node.setAttribute('placeholder', value.tr);
    });
  }

  function applySelectorMap(lang, cfg){
    const map = cfg.selectorMap || {};
    Object.entries(map).forEach(([selector, value]) => {
      const nodes = document.querySelectorAll(selector);
      if (!nodes.length) return;
      nodes.forEach(node => {
        const text = lang === 'en' ? value.en : value.tr;
        if (text) node.textContent = text;
      });
    });
  }

  function applyTextTranslation(lang, cfg){
    const scope = document.querySelector(cfg.scopeSelector || 'main') || document.body;
    const pageMap = cfg.textMap || {};
    const merged = Object.assign({}, globalMap, pageMap);
    const selectors = cfg.autoTranslateSelectors || [
      'h1','h2','h3','h4','p','label','button','summary','strong','li','a','span.hint','.hint','.section-note','.status-text','.status-title','.hero-chip'
    ];

    if (lang !== 'en'){
      scope.querySelectorAll('[data-i18n-orig]').forEach(el => {
        el.textContent = el.getAttribute('data-i18n-orig');
      });
      return;
    }

    selectors.forEach(sel => {
      scope.querySelectorAll(sel).forEach(el => {
        if (el.closest('.hc-lang-toggle')) return;
        const base = el.getAttribute('data-i18n-orig') || el.textContent;
        if (!el.getAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', base);
        const tr = normalize(base);
        const direct = merged[tr];
        if (direct){
          el.textContent = direct;
        } else {
          el.textContent = replaceFromMap(base, merged);
        }
      });
    });
  }

  function updateLanguageUI(lang){
    const trBtn = document.getElementById('hcLangTr');
    const enBtn = document.getElementById('hcLangEn');
    if (!trBtn || !enBtn) return;
    trBtn.classList.toggle('active', lang === 'tr');
    enBtn.classList.toggle('active', lang === 'en');
  }

  function createToggle(cfg, onChange){
    if (document.querySelector('.hc-lang-toggle')) return;
    const wrap = document.createElement('div');
    wrap.className = 'hc-lang-toggle';
    wrap.innerHTML = '<button type="button" id="hcLangTr">TR</button><button type="button" id="hcLangEn">EN</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('#hcLangTr').addEventListener('click', () => onChange('tr'));
    wrap.querySelector('#hcLangEn').addEventListener('click', () => onChange('en'));
  }

  function ensureStyle(){
    if (document.getElementById('hc-lang-style')) return;
    const style = document.createElement('style');
    style.id = 'hc-lang-style';
    style.textContent = `
      .hc-lang-toggle{position:fixed;top:16px;right:16px;z-index:9999;background:#fff;border:1px solid #dbe4ff;border-radius:999px;padding:4px;box-shadow:0 8px 22px rgba(15,23,42,.12);display:flex;gap:4px}
      .hc-lang-toggle button{border:none;background:transparent;padding:8px 12px;border-radius:999px;font-weight:800;cursor:pointer;color:#4f46e5}
      .hc-lang-toggle button.active{background:#4f46e5;color:#fff}
      @media (max-width:720px){.hc-lang-toggle{top:10px;right:10px}}
    `;
    document.head.appendChild(style);
  }

  function init(cfg){
    if (!cfg) return;

    ensureStyle();

    upsertAlternate('tr', cfg.trUrl);
    upsertAlternate('en', cfg.enUrl);
    upsertAlternate('x-default', cfg.trUrl || cfg.xDefaultUrl);

    let isApplying = false;
    let observerScheduled = false;

    const apply = (lang) => {
      if (isApplying) return;
      isApplying = true;
      try {
        const target = lang === 'en' ? 'en' : 'tr';
        localStorage.setItem(STORAGE_KEY, target);
        document.documentElement.lang = target;

        if (target === 'en'){
          document.title = cfg.titleEn || document.title;
          setMeta('description', cfg.descriptionEn || '');
          setMetaProp('og:title', cfg.titleEn || '');
          setMetaProp('og:description', cfg.descriptionEn || '');
          setMeta('twitter:title', cfg.titleEn || '');
          setMeta('twitter:description', cfg.descriptionEn || '');
          setMetaProp('og:locale', 'en_US');
        } else {
          document.title = cfg.titleTr || document.title;
          setMeta('description', cfg.descriptionTr || '');
          setMetaProp('og:title', cfg.titleTr || '');
          setMetaProp('og:description', cfg.descriptionTr || '');
          setMeta('twitter:title', cfg.titleTr || '');
          setMeta('twitter:description', cfg.descriptionTr || '');
          setMetaProp('og:locale', 'tr_TR');
        }

        applySelectorMap(target, cfg);
        translatePlaceholders(target, cfg);
        applyTextTranslation(target, cfg);
        updateLanguageUI(target);
      } finally {
        isApplying = false;
      }
    };

    createToggle(cfg, apply);
    const saved = localStorage.getItem(STORAGE_KEY);
    apply(saved === 'en' ? 'en' : 'tr');

    if (cfg.observeSelectors && cfg.observeSelectors.length){
      const observer = new MutationObserver(() => {
        const savedLang = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'tr';
        if (savedLang !== 'en' || isApplying || observerScheduled) return;
        observerScheduled = true;
        window.requestAnimationFrame(() => {
          observerScheduled = false;
          if (!isApplying) apply('en');
        });
      });
      cfg.observeSelectors.forEach(sel => {
        const node = document.querySelector(sel);
        if (node) observer.observe(node, { childList:true, subtree:true, characterData:true });
      });
    }

    window.setLanguage = apply;
  }

  window.HesapicaCentralI18n = { init };

  document.addEventListener('DOMContentLoaded', () => {
    if (window.HESAPICA_I18N_CONFIG) {
      window.HesapicaCentralI18n.init(window.HESAPICA_I18N_CONFIG);
    }
  });
})();