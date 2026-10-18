# Replica Skill - Kullanım Kılavuzu

## 1. Bu repo nedir?

**Replica**, Claude için hazırlanmış **11 beceriden (skill)** oluşan bir pakettir. Amacı: bir uygulamanın **özelliklerini ve akışlarını** inceleyip, kendi kodunuzla sıfırdan, "clean-room" yöntemiyle yeniden yapmak ve satılabilir hale getirmektir. Ücretsiz, MIT lisanslı; kayıt, API anahtarı ya da bağlantı gerektirmez.

> Kopyalamaz: uygulamanın kodunu, logosunu, metinlerini, içeriğini. Sadece **ne yaptığını** yeniden yapar.

## 2. Kurulum

**Yöntem A: Claude'a yapıştırın**
```
https://github.com/Jakeschincariol/replica-skill

install skill
```

**Yöntem B: Claude Code eklentisi**
```
/plugin marketplace add Jakeschincariol/replica-skill
/plugin install replica-skill@replica-skill
```
Bu durumda komutlar `/replica-skill:replica-recon` gibi olur.

**Yöntem C: Klasörleri kopyalama (kısa komutlar için)**
```bash
git clone https://github.com/Jakeschincariol/replica-skill.git
cp -r replica-skill/replica-* ~/.claude/skills/
```
Sadece bir proje için istiyorsanız `.claude/skills/` içine kopyalayın.

**Gereksinim:** Python 3.8+ (ek paket kurulumu yok).

## 3. On bir beceri

| Sıra | Komut | Ne yapar |
|---|---|---|
| 1 | `/replica-recon` | Uygulamayı inceler: ekranlar, akışlar, bileşenler, veri modeli |
| 2 | `/replica-architect` | Teknoloji yığını, veritabanı şeması, API planı |
| 3 | `/replica-design` | Renk, yazı tipi, boşluk gibi tasarım sistemini oluşturur |
| 4 | `/replica-build` | Ekranları tek tek inşa eder |
| 5 | `/replica-backend` | Giriş sistemi, veritabanı, ödeme, entegrasyonlar |
| 6 | `/replica-test` | Tüm akışları test eder, hataları raporlar |
| 7 | `/replica-diff` | Orijinalle karşılaştırır, "benzerlik puanı" verir |
| 8 | `/replica-entrepreneur` | Kullanıcı yorumlarından şikayetleri bulur, fark yaratacak düzeltmeleri önerir |
| 9 | `/replica-brand` | Yeni isim, palet, logo yönergesi; orijinalden iz bırakmaz |
| 10 | `/replica-launch` | Açılış sayfası, fiyatlandırma, mağaza listesi |
| 11 | `/replica-deploy` | Kendi alan adınızda canlıya alır |

## 4. Nasıl kullanılır?

Sırayla çalıştırın. Her adım, bir öncekinin projenizdeki `replica/` klasörüne yazdığı çıktıyı okur:

```
recon -> architect -> design -> build -> backend -> test -> diff -> entrepreneur -> brand -> launch -> deploy
```

**Örnek (randevu uygulaması klonu):**
1. **recon:** Uygulamanın URL'sini verirsiniz, `replica/recon.md` ve `features.csv` çıkar.
2. **architect:** Next.js + Postgres gibi bir yığın seçer, şemayı yazar.
3. **design:** Ekran görüntülerinden renk/yazı/boşluk değerlerini çıkarır.
4. **build:** Ekranları sırayla kodlar, `features.csv`'de işaretler.
5. **backend:** Kayıt/giriş, takvim, ödeme, e-posta ekler.
6. **test:** Test planı ve Playwright testleri yazar, ciddi hata kalmayana dek ilerler.
7. **diff:** Özellik ve görünüm puanı verir, eksikleri listeler.
8. **entrepreneur:** Gerçek yorumları okur, en çok şikayet edilenleri düzeltme planına çevirir.
9. **brand:** Yeni isim/kimlik verir, kodda orijinalden kalan ne varsa tarar.
10. **launch:** Açılış sayfası ve mağaza metinlerini hazırlar.
11. **deploy:** Son kontrolleri yapar, siz "go" deyince yayınlar.

İstediğiniz adımı **tek başına** da çalıştırabilirsiniz. Örneğin sadece `/replica-entrepreneur` ile bir uygulamayı klonlamaya değip değmeyeceğini test edebilirsiniz.

## 5. Python araçları

Hepsi standart kütüphane ile yazılmış, internete bağlanmaz:

```bash
python3 replica-diff/imgdiff.py orijinal.png klon.png --out fark.png   # Düzen farkı (renk yok sayılır)
python3 replica-diff/parity.py replica/features.csv                     # Özellik eşleşme puanı
python3 replica-entrepreneur/reviews.py replica/reviews.csv             # Kullanıcı şikayetleri, sıralı ve linkli
python3 replica-design/contrast.py replica/design/tokens.json           # WCAG kontrast kontrolü
python3 replica-brand/sweep.py . --avoid "Orijinal Uygulama"            # Orijinalden iz kaldı mı?
python3 replica-launch/listing.py replica/launch/listing.json           # Mağaza sınırları ve kopya kontrolü
```

Testleri çalıştırmak için:
```bash
python3 -m unittest discover -s tests -v
```

## 6. Klasör yapısı

- Her `replica-*` klasöründe bir `SKILL.md` (becerinin talimatları) bulunur; bazılarında yardımcı betik ve şablonlar vardır.
- `tests/`: Python araçlarının testleri
- `.claude-plugin/`: Eklenti tanımı
- `README.md` (İngilizce), `README.tr.md` (Türkçe), `LICENSE` (MIT)

## 7. Önemli kurallar

- **Sadece işlevi taklit eder**, kodu/logoyu/metni/içeriği asla kopyalamaz.
- **Sadece erişmeye hakkınız olanı okur:** herkese açık sayfalar ve kendi hesabınız. Girişin arkasını kazımaz, ödeme duvarını aşmaz.
- **Yayından önce mutlaka yeniden markalanır;** `sweep.py` temiz çıkmadan `deploy` yayına almaz.
- **Uydurma yok:** Yorum ve alıntılar gerçek, birebir ve linklidir.
- **İçerik/ağ klonlanamaz:** Müzik uygulamasının çalma listesi özelliğini yaparsınız, şarkı kataloğunu değil.
- **Satmadan önce** marka araştırması yapın ve gerekirse avukata danışın (hukuki tavsiye değildir).

## 8. Kısa özet

> Klonlamak istediğiniz uygulamanın adresini `/replica-recon`'a verin, sırayla ilerleyin; sonunda kendi adınız, kendi kodunuz ve kullanıcıların sevmediği şeyleri düzelten, satılabilir bir uygulamanız olsun.
