# Hesapica — Analytics, Consent ve Search Console Kurulum Rehberi

> Son güncelleme: 10 Ağustos 2026  
> Bu belge, Hesapica'nın güncel mimarisini esas alır. Eski “her HTML dosyasına doğrudan GA4/AdSense etiketi ekleme” yaklaşımı kullanılmaz.

## 1. Güncel mimari

Hesapica'da GA4 ve AdSense gibi analitik/reklam Google servisleri doğrudan HTML içinden koşulsuz yüklenmemelidir.

Merkezi yapı:

- `cookie-consent.js`: kullanıcı tercihlerini yönetir, Google Consent Mode v2 varsayılanlarını kurar, Google Tag için TCF desteğini açar, GA4'ü analitik iznine göre yükler ve AdSense altyapı etiketini canlı hostta varsayılan reklam consent durumları `denied` kurulduktan sonra erken yükler. Bu erken AdSense yüklemesi Google'ın sertifikalı CMP/TCF mesajının çalışabilmesi içindir; `adsbygoogle.pauseAdRequests=1` ile publisher reklam istekleri ayrıca durdurulur.
- `cookie-consent.css`: banner ve tercih modalının görünümü/erişilebilirliği.
- `ads-slot-manager.js`: manuel reklam slotlarını Hesapica reklam/pazarlama tercihi ve AdSense doluluk durumuna göre yönetir; `push({})` isteğini merkezden ve bir kez başlatır. Kullanıcı reklam/pazarlama izni vermeden manuel reklam birimi istenmez.
- `ads-slot-manager.css`: reklam slotlarının izin öncesi/sonrası görünümünü tüm sayfalarda merkezden yönetir.
- GA4 Measurement ID: `G-6BNBXVN9EW`
- AdSense publisher/client: `ca-pub-4334681065822132`
- Reklam yerleşim modeli: **manuel ad units**. Hesapica'nın reklam/pazarlama gate'inin bypass edilmemesi için AdSense hesabında **Auto ads kapalı tutulmalıdır**. Auto ads açıksa erken yüklenen AdSense altyapı etiketi hesap ayarlarına göre otomatik reklam yerleştirebilir.

### Temel kural

HTML sayfalarında aşağıdaki doğrudan yüklemeler bulunmamalıdır:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=..."></script>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=..."></script>
```

GA4'ü `cookie-consent.js` analitik iznine göre yükler. AdSense altyapı etiketi ise Google'ın sertifikalı CMP/TCF mesajının ilk ziyarette çalışabilmesi için, Consent Mode reklam varsayılanları `denied` kurulduktan sonra canlı hostta erken yüklenir. Bu sırada `adsbygoogle.pauseAdRequests=1` tutulur; reklam/pazarlama izni verildiğinde `pauseAdRequests=0` olur ve gerçek manuel reklam birimleri `ads-slot-manager.js` tarafından istenir.

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
<!-- Reklam slotu bulunan sayfalarda -->
<link href="ads-slot-manager.css" rel="stylesheet">
```

Ayrıca 52/52 HTML sayfasında AdSense hesap ilişkilendirmesi için şu pasif meta etiketi bulunur:

```html
<meta name="google-adsense-account" content="ca-pub-4334681065822132">
```

Bu meta etiketi tek başına reklam isteği göndermez; site/hesap ilişkilendirmesi içindir.

Bu entegrasyonun tam konumu sayfa bazında son proje turunda kontrol edilmelidir.

### `</body>` öncesi

Sayfada reklam slotları varsa:

```html
<script src="ads-slot-manager.js"></script>
```

Reklam slotu bulunmayan sayfalarda `ads-slot-manager.js` zorunlu değildir; `cookie-consent.js` yine tüm 52 sayfada bulunur.

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

- Consent Mode v2 varsayılanları dört alanda `denied`
- GA4 yüklenmez
- Canlı hostta AdSense altyapı etiketi CMP/TCF mesajını taşıyabilmek için yüklenebilir
- `adsbygoogle.pauseAdRequests=1`; manuel `adsbygoogle.push({})` reklam isteği yapılmaz
- Hesapica banner'ı görünür; Google CMP etkinse uygun bölgede ayrıca sertifikalı TCF mesajı gösterilebilir

#### B. Sadece analitik izni

Beklenen:

- GA4 yüklenir
- Analytics consent `granted`
- Reklam/marketing izni kapalıysa manuel reklam slotu isteği yapılmaz; AdSense altyapı etiketi CMP/TCF amacıyla denied consent altında yüklü kalabilir

#### C. Reklam/marketing izni

Beklenen:

- Hesapica reklam/pazarlama gate'i açılır ve `adsbygoogle.pauseAdRequests=0` olur
- Manuel reklam slotları `ads-slot-manager.js` tarafından bir kez istenir
- EEA/UK/İsviçre trafiğinde AdSense ayrıca sertifikalı CMP/TCF sinyaline uyar

#### D. Opsiyonel çerezleri reddet

Beklenen:

- Analitik ve marketing izinleri kapalı
- GA4 yüklenmez; `adsbygoogle.pauseAdRequests=1` olur ve manuel reklam slotu isteği yapılmaz. AdSense altyapı etiketi CMP/TCF amacıyla denied consent altında yüklü kalabilir
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
- [ ] Reklam slotu bulunan tüm HTML sayfalarında güncel `ads-slot-manager.js` kullanılıyor
- [ ] Reklam slotu bulunan tüm HTML sayfalarında güncel `ads-slot-manager.css` kullanılıyor
- [ ] 52/52 HTML sayfasında `google-adsense-account` meta etiketi doğru publisher ID ile bulunuyor
- [ ] HTML sayfalarında bağımsız `adsbygoogle.push({})` çağrısı kalmadı
- [ ] Statik GA4 `gtag.js` yüklemesi kalmadı
- [ ] Statik AdSense `adsbygoogle.js` yüklemesi kalmadı
- [ ] `G-XXXXXXXXXX` placeholder'ı yok
- [ ] `YOUR_VERIFICATION_CODE_HERE` placeholder'ı yok
- [ ] `i18n-common.js` referansı yok
- [ ] Consent Mode v2 varsayılanları Google ölçüm komutlarından önce kuruluyor
- [ ] İlk ziyarette GA4 yüklenmiyor; AdSense altyapı etiketi yalnız CMP/TCF/consent altyapısı için denied varsayımla yükleniyor
- [ ] Reklam/pazarlama izni olmadan `adsbygoogle.pauseAdRequests=1` ve manuel reklam slotu isteği yapılmıyor
- [ ] AdSense hesabında Auto ads kapalı; reklamlar yalnız Hesapica'nın manuel ad unit slotlarından geliyor
- [ ] GA4/AdSense yalnız `hesapica.com` / `www.hesapica.com` canlı alan adında yükleniyor
- [ ] Çerez tercihleri sonradan değiştirilebiliyor
- [ ] Statik footer bulunmayan araç sayfalarında merkezi “Çerez Tercihleri” erişim noktası karar sonrası görünüyor
- [ ] GA4 Realtime/DebugView testi yapıldı
- [ ] AdSense dolu/boş slot davranışı gerçek tarayıcıda test edildi
- [ ] `sitemap.xml` parse oluyor ve yalnız canonical URL'leri içeriyor
- [ ] `robots.txt` sitemap'i bildiriyor
- [ ] Search Console mülkiyeti doğrulanmış
- [ ] Sitemap Search Console'da işlenmiş

## 9. AdSense ve Avrupa trafiği — zorunlu canlı hesap adımı

Hesapica'nın özel çerez tercih paneli, site içi analitik ve reklam gate'ini yönetir; **Google'ın sertifikalı CMP gereksiniminin yerine geçmez.**

Google AdSense kullanan yayıncılar EEA, Birleşik Krallık ve İsviçre trafiğinde Google tarafından sertifikalı ve IAB TCF ile entegre bir CMP kullanmalıdır. Canlıya geçmeden önce AdSense hesabında:

1. **Ads → Overview → hesapica.com** altında **Auto ads = OFF** olduğunu doğrula. Hesapica manuel ad unit modeli kullanır.
2. **Privacy & messaging → European regulations** bölümünü aç.
3. Google CMP veya Google-certified third-party CMP seç.
4. Mesajı `hesapica.com` için yayımla.
5. Google CMP kullanılıyorsa consent mode for advertising purposes'ı; gerekiyorsa analytics purposes'ı da etkinleştir.
6. EEA/UK/İsviçre test lokasyonunda mesajın gerçekten göründüğünü ve `__tcfapi` sinyalinin oluştuğunu doğrula.
7. Google'ın otomatik revocation link'inin veya CMP'nin tercih geri çekme bağlantısının çalıştığını test et.

`cookie-consent.js`, Google tag tarafında TCF desteğini açar (`gtag_enable_tcf_support = true`) ve AdSense altyapı etiketini CMP mesajının ilk ziyarette çalışabilmesi için denied consent varsayımlarından sonra yükler.

## 10. Bu belgede artık kullanılmayan eski yaklaşım

Aşağıdaki eski adımlar geçersizdir ve uygulanmamalıdır:

- 52 HTML dosyasında `sed` ile GA4 ID değiştirmek
- 52 HTML dosyasına Search Console verification meta etiketi basmak
- GA4 scriptini AdSense scriptinden sonra koşulsuz yüklemek
- Consent varsayılanları kurulmadan Google etiketlerini başlatmak veya reklam/pazarlama izni olmadan manuel AdSense slotu istemek
- `YOUR_VERIFICATION_CODE_HERE` veya `G-XXXXXXXXXX` placeholder'larını deploy etmek

---

Bu rehber Hesapica'nın merkezi consent + ayrı Türkçe/İngilizce dosya mimarisine göre tutulmalıdır.
