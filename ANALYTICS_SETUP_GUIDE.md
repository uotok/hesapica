# 📊 Google Analytics 4 ve Search Console Kurulum Rehberi

## ✅ Tamamlanan İşlemler

Tüm 52 HTML sayfasına aşağıdaki entegrasyonlar eklendi:

1. **Google Analytics 4 (GA4)** tracking kodu
2. **Google Search Console** verification meta tag
3. Kodlar AdSense script'lerinden sonra optimal konumda yerleştirildi

---

## 🚀 Adım 1: Google Analytics 4 Kurulumu

### 1.1. GA4 Property Oluşturma

1. [Google Analytics](https://analytics.google.com/) adresine gidin
2. Sol alt köşeden **"Yönetici"** (Admin) bölümüne tıklayın
3. **"+ Özellik Oluştur"** (Create Property) butonuna tıklayın
4. Özellik bilgilerini doldurun:
   - **Özellik adı**: Hesapica
   - **Zaman dilimi**: Turkey (GMT+03:00)
   - **Para birimi**: Turkish Lira (TRY)
5. **"İleri"** butonuna tıklayın
6. İşletme bilgilerini doldurun ve **"Oluştur"** butonuna tıklayın

### 1.2. Veri Akışı (Data Stream) Oluşturma

1. Yeni oluşturulan property'de **"Veri Akışları"** (Data Streams) bölümüne gidin
2. **"Akış ekle"** → **"Web"** seçin
3. Bilgileri doldurun:
   - **Web sitesi URL'si**: `https://hesapica.com`
   - **Akış adı**: Hesapica Web
4. **"Akış oluştur"** butonuna tıklayın

### 1.3. Measurement ID'yi Kopyalayın

- Akış oluşturulduktan sonra **"G-XXXXXXXXXX"** formatında bir **Measurement ID** göreceksiniz
- Bu ID'yi kopyalayın (örnek: `G-ABC123XYZ`)

### 1.4. Measurement ID'yi Güncelleyin

Tüm HTML dosyalarında `G-XXXXXXXXXX` ifadesini kendi Measurement ID'nizle değiştirin:

```bash
# Tüm dosyalarda otomatik değiştirme (terminalde)
cd /home/ubuntu/github_repos/hesapica
find . -name "*.html" -type f -exec sed -i 's/G-XXXXXXXXXX/G-ABC123XYZ/g' {} +

# Git commit ve push
git add *.html
git commit -m "config: Update GA4 Measurement ID"
git push origin main
```

**ÖNEMLİ**: `G-ABC123XYZ` yerine kendi Measurement ID'nizi yazın!

---

## 🔍 Adım 2: Google Search Console Kurulumu

### 2.1. Site Ekleme

1. [Google Search Console](https://search.google.com/search-console) adresine gidin
2. **"Özellik ekle"** (Add Property) butonuna tıklayın
3. **"URL öneki"** (URL prefix) seçeneğini seçin
4. `https://hesapica.com` yazın ve **"Devam"** butonuna tıklayın

### 2.2. Mülkiyet Doğrulama

1. **"HTML etiketi"** (HTML tag) yöntemini seçin
2. Gösterilen meta tag'deki **content değerini** kopyalayın
   - Örnek: `<meta name="google-site-verification" content="abc123def456ghi789..." />`
   - Sadece **content** kısmını kopyalayın: `abc123def456ghi789...`

### 2.3. Verification Code'unu Güncelleyin

Tüm HTML dosyalarında `YOUR_VERIFICATION_CODE_HERE` ifadesini kendi verification code'unuzla değiştirin:

```bash
# Tüm dosyalarda otomatik değiştirme
cd /home/ubuntu/github_repos/hesapica
find . -name "*.html" -type f -exec sed -i 's/YOUR_VERIFICATION_CODE_HERE/abc123def456ghi789.../g' {} +

# Git commit ve push
git add *.html
git commit -m "config: Update Google Search Console verification code"
git push origin main
```

**ÖNEMLİ**: `abc123def456ghi789...` yerine kendi verification code'unuzu yazın!

### 2.4. Doğrulamayı Tamamlayın

1. Cloudflare Pages'de deployment tamamlandıktan sonra (yaklaşık 1-2 dakika)
2. Google Search Console'a dönün
3. **"Doğrula"** (Verify) butonuna tıklayın
4. ✅ "Mülkiyet doğrulandı" mesajını görmelisiniz

---

## 📋 Adım 3: Search Console Ek Yapılandırma

### 3.1. Sitemap Gönderimi

1. Search Console'da **"Sitemap'ler"** (Sitemaps) bölümüne gidin
2. Sitemap URL'sini ekleyin: `https://hesapica.com/sitemap.xml`
3. **"Gönder"** butonuna tıklayın
4. Durum: **"Başarılı"** olarak görünmelidir

### 3.2. URL Denetimi

Ana sayfayı test edin:
1. **"URL Denetimi"** (URL Inspection) aracına gidin
2. `https://hesapica.com` yazın
3. **"Canlı URL'yi Test Et"** butonuna tıklayın
4. Hata yoksa **"İndeksleme İste"** (Request Indexing) yapın

---

## 🎯 Adım 4: GA4 Gelişmiş Yapılandırma (Opsiyonel)

### 4.1. Gelişmiş Ölçüm (Enhanced Measurement)

GA4 Admin → Veri Akışları → Web akışı → **Gelişmiş ölçüm**'e gidin ve şunları aktif edin:
- ✅ Sayfa görüntülemeleri (otomatik açık)
- ✅ Kaydırmalar (Scrolls)
- ✅ Giden tıklamalar (Outbound clicks)
- ✅ Site içi aramalar (Site search)
- ✅ Form etkileşimleri (Form interactions)

### 4.2. Dönüşüm Hedefleri (Conversion Goals)

**Keşif** → **Olaylar** (Events) → Önemli olayları dönüşüm olarak işaretleyin:
- Form gönderimleri
- Düğme tıklamaları
- Sayfa görüntülemeleri (önemli sayfalar için)

### 4.3. Özel Boyutlar (Custom Dimensions)

Admin → Veri Ayarları → **Özel tanımlar** (Custom definitions):
- **Hesap Makinesi Türü**: Hangi hesaplama aracı kullanıldı
- **Kullanıcı Segmenti**: Mobil/Desktop
- **Sayfa Kategorisi**: Finans, Vergi, Emlak, vb.

---

## ✅ Doğrulama Kontrol Listesi

### GA4 Kontrolü
- [ ] Measurement ID güncellendi (`G-XXXXXXXXXX` yok)
- [ ] Cloudflare Pages'e deploy edildi
- [ ] Tarayıcı DevTools Network sekmesinde `gtag/js` yüklemesi görünüyor
- [ ] GA4 Admin → Gerçek zamanlı (Realtime) bölümünde aktif kullanıcılar görünüyor

### Search Console Kontrolü
- [ ] Verification code güncellendi (`YOUR_VERIFICATION_CODE_HERE` yok)
- [ ] Cloudflare Pages'e deploy edildi
- [ ] Search Console'da mülkiyet doğrulandı ✅
- [ ] Sitemap gönderildi ve başarılı durumda
- [ ] URL Denetimi başarılı

### robots.txt Kontrolü
```
✅ Dosya mevcut ve uygun
✅ Sitemap bildirimi var: https://hesapica.com/sitemap.xml
✅ Cloudflare CDN yolları hariç tutulmuş
```

---

## 🔗 Faydalı Linkler

- **Google Analytics 4**: https://analytics.google.com/
- **Google Search Console**: https://search.google.com/search-console
- **GA4 Yardım Merkezi**: https://support.google.com/analytics/answer/9304153
- **Search Console Yardım**: https://support.google.com/webmasters/
- **GitHub Repo**: https://github.com/uotok/hesapica
- **Canlı Site**: https://hesapica.com

---

## 📞 Sorun Giderme

### GA4 Veri Gelmiyor?
1. Tarayıcıda `https://hesapica.com` açın
2. F12 → Network → "gtag" ara → İstek başarılı mı?
3. Console'da hata var mı?
4. AdBlocker kapalı mı?
5. 24-48 saat bekleyin (veriler gecikebilir)

### Search Console Doğrulama Hatası?
1. Meta tag doğru mu? (Boşluk, tire yanlışı var mı?)
2. Cloudflare deployment tamamlandı mı?
3. `https://hesapica.com` kaynak kodunda tag görünüyor mu?
4. Cache temizlendi mi? (Ctrl+F5)

---

## 🎉 Sonuç

Tüm kurulum tamamlandıktan sonra:
- ✅ **GA4**: Gerçek zamanlı ziyaretçi takibi başlar
- ✅ **Search Console**: Google'da indeksleme ve performans takibi başlar
- ✅ **Sitemap**: Google tüm 52 sayfayı düzenli tarar
- ✅ **robots.txt**: Bot'lar sitemap'i otomatik bulur

**İlk veri akışı**: GA4'te 5-10 dakika, Search Console'da 1-2 gün içinde görünmeye başlar.

---

*Son güncelleme: 29 Temmuz 2026*
