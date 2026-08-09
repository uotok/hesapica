# Hesapica — Analytics, Consent ve Search Console Kurulum Rehberi

> Son güncelleme: 8 Ağustos 2026  
> Bu belge, Hesapica'nın güncel mimarisini esas alır. Eski “her HTML dosyasına doğrudan GA4/AdSense etiketi ekleme” yaklaşımı kullanılmaz.

## 1. Güncel mimari

Hesapica'da GA4 ve AdSense gibi analitik/reklam Google servisleri doğrudan HTML içinden koşulsuz yüklenmemelidir.

Merkezi yapı:

- `cookie-consent.js`: kullanıcı tercihlerini yönetir, Google Consent Mode v2 varsayılanlarını kurar ve izin verilen GA4/AdSense servislerini dinamik yükler.
- `cookie-consent.css`: banner ve tercih modalının görünümü/erişilebilirliği.
- `ads-slot-manager.js`: reklam slotlarını consent ve AdSense doluluk durumuna göre yönetir; manuel reklam birimlerinin `push({})` isteğini merkezden ve bir kez başlatır.
- `ads-slot-manager.css`: reklam slotlarının izin öncesi/sonrası görünümünü tüm sayfalarda merkezden yönetir.
- GA4 Measurement ID: `G-6BNBXVN9EW`
- AdSense publisher/client: `ca-pub-4334681065822132`

### Temel kural

HTML sayfalarında aşağıdaki doğrudan yüklemeler bulunmamalıdır:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=..."></script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=..."></script>
```

GA4 ve AdSense'i `cookie-consent.js` izin durumuna göre yükler.

Google Consent Mode v2 için kullanılan temel izin alanları:

- `analytics_storage`
- `ad_storage`
- `ad_user_data`
- `ad_personalization`

Varsayılan durum, Google ölçüm/reklam komutlarından önce kurulmalıdır.

## 2. Her HTML sayfasında olması gereken yapı

### `<head>` içinde

```html
<link href="cookie-consent.css" rel="stylesheet">
<script src="cookie-consent.js"></script>
<!-- </head> öncesinde, sayfa içi reklam CSS’lerinden sonra -->
<link href="ads-slot-manager.css" rel="stylesheet">
```

Bu entegrasyonun tam konumu sayfa bazında son proje turunda kontrol edilmelidir.

### `</body>` öncesi

Sayfada reklam slotları varsa:

```html
<script src="ads-slot-manager.js"></script>
```

Manuel `<ins class="adsbygoogle">` slotları HTML’de reklamın konumunu belirler; ancak sayfalarda ayrı `adsbygoogle.push({})` scriptleri tutulmaz. Reklam isteğini merkezi `ads-slot-manager.js` yapar.

### Bulunmaması gereken eski kalıntılar

- Doğrudan `gtag.js` yükleyen GA4 scripti
- Doğrudan `adsbygoogle.js` yükleyen AdSense scripti
- Eski `G-XXXXXXXXXX` placeholder'ı
- Eski `YOUR_VERIFICATION_CODE_HERE` placeholder'ı
- `i18n-common.js`
- `HESAPICA_I18N_CONFIG`
- Aynı HTML içinde TR/EN dil değiştirme sistemi

## 3. GA4 doğrulaması

Hesapica'nın mevcut GA4 Measurement ID'si:

```text
G-6BNBXVN9EW
```

Bu ID'yi tekrar tüm HTML dosyalarına elle yapıştırmayın. Merkezi consent sistemi kullanmalıdır.

### Test senaryoları

Tarayıcıda temiz site verisiyle aşağıdaki durumlar ayrı ayrı test edilmelidir.

#### A. İlk ziyaret / karar verilmedi

Beklenen:

- Consent varsayılanları `denied`
- GA4 doğrudan yüklenmez
- AdSense doğrudan yüklenmez
- Banner görünür

#### B. Sadece analitik izni

Beklenen:

- GA4 yüklenir
- Analytics consent `granted`
- Reklam/marketing izni kapalıysa AdSense yüklenmez

#### C. Reklam/marketing izni

Beklenen:

- AdSense consent durumuna uygun şekilde yüklenir
- Reklam slotları `ads-slot-manager.js` tarafından yönetilir

#### D. Opsiyonel çerezleri reddet

Beklenen:

- Analitik ve marketing izinleri kapalı
- İlgili Google servisleri yüklenmez
- Tercihler saklanır

#### E. Tercihi sonradan değiştir

Beklenen:

- `Çerez Tercihleri` butonu modalı açar
- Yeni tercih kalıcı hale gelir
- İlgili servis durumu güncellenir

### GA4 kontrolü

Google Analytics içinde:

1. Yönetici → Veri akışları → Hesapica web akışını açın.
2. Measurement ID'nin `G-6BNBXVN9EW` olduğunu doğrulayın.
3. Consent verilmiş bir test oturumunda Realtime/DebugView tarafını kontrol edin.
4. Tarayıcı Network sekmesinde yalnız izin sonrasında Google tag isteğinin oluştuğunu doğrulayın.

Not: Google, yeni kurulumlarda veri toplamaya başlamanın bir süre alabileceğini belirtir; anlık sonuç görünmemesi tek başına entegrasyon hatası anlamına gelmez.

## 4. Search Console mülkiyet doğrulaması

### Tercih edilen yöntem: Domain property + DNS

Mümkünse Search Console'da:

```text
hesapica.com
```

Domain property oluşturun ve Google'ın verdiği DNS TXT kaydını DNS sağlayıcısına ekleyin.

Bu yöntem alan adının protokol ve alt alan adı varyasyonlarını birlikte kapsar.

### Alternatif yöntem: URL-prefix + HTML meta etiketi

URL-prefix property kullanılıyorsa:

```text
https://hesapica.com/
```

Google'ın verdiği doğrulama etiketi yalnız mülkün ana sayfasının `<head>` bölümünde bulunmalıdır.

Örnek:

```html
<meta name="google-site-verification" content="GOOGLE_TARAFINDAN_VERILEN_GERCEK_DEGER">
```

**Bu etiketi 52 HTML dosyasına kopyalamayın.**

Search Console, HTML tag yönteminde doğrulama etiketini property'nin ana sayfasında arar.

Doğrulama tamamlandıktan sonra etiketi silmeyin; Search Console mülkiyeti periyodik olarak yeniden kontrol edebilir.

## 5. Sitemap

Canlı sitemap adresi:

```text
https://hesapica.com/sitemap.xml
```

Search Console → Sitemaps bölümünden `sitemap.xml` gönderilebilir.

Ayrıca `robots.txt` içinde şu bildirim bulunur:

```text
Sitemap: https://hesapica.com/sitemap.xml
```

Sitemap gönderimi Google için bir sinyaldir; indeksleme garantisi değildir.

Güncel sitemap yalnız canonical, indexlenebilir URL'leri içermelidir.

## 6. URL Inspection

Önemli sayfalar için Search Console → URL Inspection kullanın.

Öncelikli örnekler:

- `https://hesapica.com/`
- `https://hesapica.com/kredi-hesaplama`
- `https://hesapica.com/doviz-cevirici`
- `https://hesapica.com/kdv-hesaplama`

Bir URL'de sorun düzelttikten sonra canlı URL testi yapın; gerektiğinde indeksleme isteği gönderin.

## 7. robots.txt

Beklenen temel yapı:

```text
User-agent: *
Allow: /
Disallow: /cdn-cgi/

Sitemap: https://hesapica.com/sitemap.xml
```

`/cdn-cgi/` Cloudflare'ın teknik sistem yoludur ve normal arama içeriği değildir.

## 8. Deploy öncesi global kontrol

Aşağıdakilerin tamamı doğrulanmadan analytics/consent altyapısı final kabul edilmemelidir:

- [ ] Tüm Türkçe HTML sayfalarında güncel `cookie-consent.js` kullanılıyor
- [ ] Tüm ilgili sayfalarda güncel `cookie-consent.css` kullanılıyor
- [ ] Tüm HTML sayfalarında güncel `ads-slot-manager.js` kullanılıyor
- [ ] Tüm HTML sayfalarında güncel `ads-slot-manager.css` kullanılıyor
- [ ] HTML sayfalarında bağımsız `adsbygoogle.push({})` çağrısı kalmadı
- [ ] Statik GA4 `gtag.js` yüklemesi kalmadı
- [ ] Statik AdSense `adsbygoogle.js` yüklemesi kalmadı
- [ ] `G-XXXXXXXXXX` placeholder'ı yok
- [ ] `YOUR_VERIFICATION_CODE_HERE` placeholder'ı yok
- [ ] `i18n-common.js` referansı yok
- [ ] Consent Mode v2 varsayılanları Google ölçüm komutlarından önce kuruluyor
- [ ] İlk ziyarette opsiyonel Google servisleri izin politikasına uygun davranıyor
- [ ] GA4/AdSense yalnız `hesapica.com` / `www.hesapica.com` canlı alan adında yükleniyor
- [ ] Çerez tercihleri sonradan değiştirilebiliyor
- [ ] GA4 Realtime/DebugView testi yapıldı
- [ ] AdSense dolu/boş slot davranışı gerçek tarayıcıda test edildi
- [ ] `sitemap.xml` parse oluyor ve yalnız canonical URL'leri içeriyor
- [ ] `robots.txt` sitemap'i bildiriyor
- [ ] Search Console mülkiyeti doğrulanmış
- [ ] Sitemap Search Console'da işlenmiş

## 9. AdSense ve Avrupa trafiği için not

Özel Hesapica cookie banner'ı teknik consent yönetimini sağlar; ancak Google'ın EEA/UK/İsviçre reklam trafiği için geçerli CMP/TCF gereksinimleri ayrıca değerlendirilmelidir.

Bu konu “cookie banner çalışıyor” kontrolünden ayrı tutulmalıdır.

## 10. Bu belgede artık kullanılmayan eski yaklaşım

Aşağıdaki eski adımlar geçersizdir ve uygulanmamalıdır:

- 52 HTML dosyasında `sed` ile GA4 ID değiştirmek
- 52 HTML dosyasına Search Console verification meta etiketi basmak
- GA4 scriptini AdSense scriptinden sonra koşulsuz yüklemek
- Consent alınmadan Google Analytics ve AdSense'i başlatmak
- `YOUR_VERIFICATION_CODE_HERE` veya `G-XXXXXXXXXX` placeholder'larını deploy etmek

---

Bu rehber Hesapica'nın merkezi consent + ayrı Türkçe/İngilizce dosya mimarisine göre tutulmalıdır.
