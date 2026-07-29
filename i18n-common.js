(function(){
  const STORE_KEY = 'hesapica_lang_pref_v1';
  function setMeta(name, value){
    const el = document.querySelector(`meta[name="${name}"]`);
    if(el && value) el.setAttribute('content', value);
  }
  function setMetaProp(prop, value){
    const el = document.querySelector(`meta[property="${prop}"]`);
    if(el && value) el.setAttribute('content', value);
  }
  function upsertAlternate(hreflang, href){
    if(!href) return;
    let el = document.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`);
    if(!el){
      el = document.createElement('link');
      el.rel = 'alternate';
      el.hreflang = hreflang;
      document.head.appendChild(el);
    }
    el.href = href;
  }
  function applyDict(lang, dict){
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if(dict[key] && dict[key][lang] != null) el.textContent = dict[key][lang];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if(dict[key] && dict[key][lang] != null) el.setAttribute('placeholder', dict[key][lang]);
    });
  }
  function updateToggleUI(lang){
    document.querySelectorAll('.hc-lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }
  function ensureStyles(){
    if(document.getElementById('hc-i18n-style')) return;
    const style = document.createElement('style');
    style.id = 'hc-i18n-style';
    style.textContent = `.hc-lang-toggle{position:fixed;right:16px;bottom:16px;z-index:4000;display:flex;gap:8px;background:#fff;border:1px solid #dbe4ff;border-radius:999px;padding:8px;box-shadow:0 10px 24px rgba(79,70,229,.14)}.hc-lang-btn{border:none;background:#f3f4f6;color:#111827;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}.hc-lang-btn.active{background:#4f46e5;color:#fff}`;
    document.head.appendChild(style);
  }
  function createToggle(onChange){
    if(document.querySelector('.hc-lang-toggle')) return;
    const box = document.createElement('div');
    box.className = 'hc-lang-toggle';
    box.innerHTML = '<button type="button" class="hc-lang-btn" data-lang="tr">TR</button><button type="button" class="hc-lang-btn" data-lang="en">EN</button>';
    box.addEventListener('click', (e)=>{
      const btn = e.target.closest('.hc-lang-btn');
      if(!btn) return;
      onChange(btn.dataset.lang);
    });
    document.body.appendChild(box);
  }
  function init(cfg){
    if(!cfg) return;
    ensureStyles();
    const preferred = localStorage.getItem(STORE_KEY);
    const lang = (preferred === 'en' || preferred === 'tr') ? preferred : 'tr';
    const dict = cfg.dictionary || {};

    function apply(langCode){
      document.documentElement.lang = langCode;
      updateToggleUI(langCode);
      localStorage.setItem(STORE_KEY, langCode);
      if(langCode === 'tr'){
        if(cfg.titleTr) document.title = cfg.titleTr;
        setMeta('description', cfg.descriptionTr);
        setMetaProp('og:title', cfg.titleTr);
        setMetaProp('og:description', cfg.descriptionTr);
        setMeta('twitter:title', cfg.titleTr);
        setMeta('twitter:description', cfg.descriptionTr);
        setMetaProp('og:locale', 'tr_TR');
      } else {
        if(cfg.titleEn) document.title = cfg.titleEn;
        setMeta('description', cfg.descriptionEn);
        setMetaProp('og:title', cfg.titleEn);
        setMetaProp('og:description', cfg.descriptionEn);
        setMeta('twitter:title', cfg.titleEn);
        setMeta('twitter:description', cfg.descriptionEn);
        setMetaProp('og:locale', 'en_US');
      }
      upsertAlternate('tr', cfg.trUrl);
      upsertAlternate('en', cfg.enUrl);
      upsertAlternate('x-default', cfg.xDefaultUrl || cfg.trUrl);
      applyDict(langCode, dict);
      window.dispatchEvent(new CustomEvent('hesapica:lang-changed', {detail:{lang:langCode}}));
    }

    window.setLanguage = apply;
    createToggle(apply);
    apply(lang);
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(window.HESAPICA_I18N_CONFIG) init(window.HESAPICA_I18N_CONFIG);
  });
})();
