/**
 * Hesapica Reklam Slot Yöneticisi
 * Boş reklam slotlarını gizler, dolu olanları gösterir
 */

(function() {
    'use strict';
    
    // Timeout süresi (milisaniye)
    const AD_TIMEOUT = 8000;
    
    // Slot'u gizle
    function hideSlot(slot) {
        slot.style.display = 'none';
        slot.style.height = '0';
        slot.style.margin = '0';
        slot.style.padding = '0';
        slot.style.border = '0';
        slot.style.overflow = 'hidden';
    }
    
    // Slot'u göster
    function showSlot(slot) {
        slot.style.display = 'flex';
        slot.style.height = '';
        slot.style.margin = '';
        slot.style.padding = '';
        slot.style.border = '';
        slot.style.overflow = '';
    }
    
    // Ad slot'u izle
    function observeAdSlot(slot) {
        const insElement = slot.querySelector('ins.adsbygoogle');
        
        if (!insElement) {
            hideSlot(slot);
            return;
        }
        
        // Timeout: 8 saniye sonra hala status yoksa gizle
        const timeoutId = setTimeout(function() {
            const status = insElement.getAttribute('data-ad-status');
            if (status !== 'filled') {
                hideSlot(slot);
            }
        }, AD_TIMEOUT);
        
        // MutationObserver ile data-ad-status değişikliklerini izle
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
                    const status = insElement.getAttribute('data-ad-status');
                    
                    if (status === 'filled') {
                        clearTimeout(timeoutId);
                        showSlot(slot);
                    } else {
                        hideSlot(slot);
                    }
                }
            });
        });
        
        // İzlemeyi başlat
        observer.observe(insElement, {
            attributes: true,
            attributeFilter: ['data-ad-status']
        });
        
        // Mevcut durumu kontrol et
        const currentStatus = insElement.getAttribute('data-ad-status');
        if (currentStatus === 'filled') {
            clearTimeout(timeoutId);
            showSlot(slot);
        } else {
            hideSlot(slot);
        }
    }
    
    // Tüm ad slotları işle
    function initAdSlots() {
        const adSlots = document.querySelectorAll('.hc-ad-slot');
        
        adSlots.forEach(function(slot) {
            // Başlangıçta gizle
            hideSlot(slot);
            
            // İzlemeyi başlat
            observeAdSlot(slot);
        });
    }
    
    // DOM hazır olduğunda çalıştır
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdSlots);
    } else {
        initAdSlots();
    }
})();
