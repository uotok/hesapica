/**
 * Hesapica Reklam Slot Yöneticisi
 * Cookie consent ile uyumlu biçimde reklam slotlarını hazırlar;
 * dolu slotları gösterir, gerçekten boş kalanları çökerterek gizler.
 */

(function() {
    'use strict';

    const AD_STATUS_TIMEOUT = 15000;
    const SLOT_SELECTOR = '.hc-ad-slot';
    const AD_SELECTOR = 'ins.adsbygoogle';
    const states = new WeakMap();
    const requestedAds = new WeakSet();

    function isLiveHost() {
        try {
            const host = String(window.location && window.location.hostname || '').toLowerCase();
            return host === 'hesapica.com' || host === 'www.hesapica.com';
        } catch (err) {
            return false;
        }
    }

    function marketingAllowed() {
        if (!isLiveHost()) return false;

        try {
            if (window.HesapicaCookieConsent && typeof window.HesapicaCookieConsent.canRun === 'function') {
                return window.HesapicaCookieConsent.canRun('marketing') === true;
            }
        } catch (err) {}

        return document.documentElement &&
            document.documentElement.dataset.cookieMarketing === 'granted';
    }

    function requestAd(insElement) {
        if (!marketingAllowed() || !insElement || requestedAds.has(insElement)) return;

        // AdSense bu birimi daha önce işlediyse ikinci kez push etme.
        if (insElement.getAttribute('data-ad-status')) {
            requestedAds.add(insElement);
            insElement.dataset.hcAdRequested = 'yes';
            return;
        }

        requestedAds.add(insElement);
        insElement.dataset.hcAdRequested = 'yes';

        try {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adsbygoogle.push({});
        } catch (err) {
            requestedAds.delete(insElement);
            delete insElement.dataset.hcAdRequested;
        }
    }

    function clearStateTimer(state) {
        if (state && state.timeoutId) {
            window.clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
    }

    function restoreSlotBox(slot) {
        slot.style.removeProperty('height');
        slot.style.removeProperty('margin');
        slot.style.removeProperty('padding');
        slot.style.removeProperty('border');
        slot.style.removeProperty('overflow');
    }

    function collapseSlot(slot, reason) {
        const state = states.get(slot);
        clearStateTimer(state);

        slot.classList.remove('hc-ad-loaded');
        slot.style.display = 'none';
        slot.style.height = '0';
        slot.style.margin = '0';
        slot.style.padding = '0';
        slot.style.border = '0';
        slot.style.overflow = 'hidden';
        slot.dataset.hcAdState = reason || 'hidden';
    }

    function showPending(slot) {
        restoreSlotBox(slot);
        slot.classList.remove('hc-ad-loaded');

        // AdSense, reklam birimi başlangıçta görünmezse isteği çalıştırmayabilir.
        // İzin verildiğinde slot bu nedenle ölçülebilir/görünür durumda tutulur.
        slot.style.display = 'block';
        slot.dataset.hcAdState = 'pending';
    }

    function showFilled(slot) {
        const state = states.get(slot);
        clearStateTimer(state);
        restoreSlotBox(slot);
        slot.style.display = 'flex';
        slot.classList.add('hc-ad-loaded');
        slot.dataset.hcAdState = 'filled';
    }

    function showOptimized(slot) {
        const state = states.get(slot);
        clearStateTimer(state);
        restoreSlotBox(slot);
        slot.classList.remove('hc-ad-loaded');
        slot.style.display = 'block';
        slot.dataset.hcAdState = 'unfill-optimized';
    }

    function scheduleFallback(slot, insElement) {
        const state = states.get(slot);
        if (!state) return;

        clearStateTimer(state);
        state.timeoutId = window.setTimeout(function() {
            if (!marketingAllowed()) {
                collapseSlot(slot, 'consent-denied');
                return;
            }

            const status = insElement.getAttribute('data-ad-status');
            if (!status) {
                // Script engellenmiş veya istek sonuçlanmamışsa kalıcı boş alan bırakma.
                // Observer aktif kalır; sonradan "filled" gelirse slot yeniden açılır.
                collapseSlot(slot, 'timeout');
            }
        }, AD_STATUS_TIMEOUT);
    }

    function syncSlotStatus(slot, insElement) {
        if (!marketingAllowed()) {
            collapseSlot(slot, 'consent-denied');
            return;
        }

        const status = insElement.getAttribute('data-ad-status');

        if (status === 'filled') {
            showFilled(slot);
            return;
        }

        if (status === 'unfilled') {
            collapseSlot(slot, 'unfilled');
            return;
        }

        if (status === 'unfill-optimized') {
            // AdSense bu durumda boş alanı kendi optimizasyon sistemiyle yönetebilir.
            showOptimized(slot);
            return;
        }

        showPending(slot);
        scheduleFallback(slot, insElement);
    }

    function disconnectSlot(slot) {
        const state = states.get(slot);
        if (!state) return;

        clearStateTimer(state);
        if (state.observer) state.observer.disconnect();
        states.delete(slot);
    }

    function observeAdSlot(slot) {
        const insElement = slot.querySelector(AD_SELECTOR);

        if (!insElement) {
            disconnectSlot(slot);
            collapseSlot(slot, 'missing-ad-unit');
            return;
        }

        const existingState = states.get(slot);
        if (existingState && existingState.insElement === insElement) {
            syncSlotStatus(slot, insElement);
            requestAd(insElement);
            return;
        }

        disconnectSlot(slot);

        const state = {
            insElement: insElement,
            observer: null,
            timeoutId: null
        };
        states.set(slot, state);

        state.observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
                    syncSlotStatus(slot, insElement);
                    break;
                }
            }
        });

        state.observer.observe(insElement, {
            attributes: true,
            attributeFilter: ['data-ad-status']
        });

        syncSlotStatus(slot, insElement);
        requestAd(insElement);
    }

    function processAllSlots() {
        const adSlots = document.querySelectorAll(SLOT_SELECTOR);
        adSlots.forEach(observeAdSlot);
    }

    function hideAllForDeniedConsent() {
        document.querySelectorAll(SLOT_SELECTOR).forEach(function(slot) {
            collapseSlot(slot, 'consent-denied');
        });
    }

    function handleConsentChanged(event) {
        const detail = event && event.detail;
        const allowed = detail && typeof detail.marketing === 'boolean'
            ? detail.marketing
            : marketingAllowed();

        if (!allowed) {
            hideAllForDeniedConsent();
            return;
        }

        // Cookie yöneticisi AdSense loader'ını aynı tercih değişiminde başlatır.
        // Slotları hemen görünür/pending yaparak reklam kodunun ölçüm yapabilmesini sağla.
        processAllSlots();
    }

    function initAdSlots() {
        if (marketingAllowed()) processAllSlots();
        else hideAllForDeniedConsent();
    }

    window.addEventListener('hesapica:cookie-consent-changed', handleConsentChanged);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdSlots, { once: true });
    } else {
        initAdSlots();
    }

    window.HesapicaAdSlots = {
        refresh: processAllSlots,
        marketingAllowed: marketingAllowed,
        isLiveHost: isLiveHost
    };
})();
