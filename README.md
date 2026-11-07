# TyreVision AI

## English [Tr Turkish version below](#turkish)

AI decision-support prototype for tyre pyrolysis plants, based on image recognition for unlabelled scrap tyres (Climathon 2026, top 20 project).

### Problem
Most end-of-life tyres carry no usable RFID or label data. A plant therefore does not know the class or rubber composition of the tyres in a batch and cannot adjust the pyrolysis recipe to the batch.

### What it does
- Reads tyre class, wear level and visible contamination from a photo using Gemini Vision.
- Estimates a class-based rubber composition (natural/synthetic rubber, carbon black, silica, steel wire).
- The model suggests temperature and heating ramp; the server code normalises the composition to 100%, builds the recipe phases and durations, and calculates the mass balance, the recovered carbon black (rCB) quality estimate and the CO₂ estimate.
- Includes a multi-photo batch mode and an accuracy panel (CSV export).

### Important
- The composition is a class-based estimate, not a measurement. The recipes have not been validated in a real plant.
- The CO₂ figure is a gross substitution estimate and excludes process emissions.
- The system is not connected to any PLC/SCADA; the recipe is submitted for operator approval as a simulation.

### Architecture
React + TypeScript + Tailwind (UI), Node.js/Express (server, Gemini call). Built with Google AI Studio.

### Run locally
Requires Node.js.
1. `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to your own key
3. `npm run dev`
4. Open `http://localhost:3000`

### Roadmap
Conveyor camera for automatic classification, calibration with real plant data, additional tyre classes.

---

🇹🇷 Türkçe 

Etiketsiz hurda lastikler için görsel tanıma tabanlı piroliz karar destek prototipi (Climathon 2026, ilk 20 proje).

## Problem
Ömrünü tamamlamış lastiklerin çoğunda RFID/etiket verisi yok. Tesis, partideki lastiğin sınıfını ve kauçuk bileşimini bilmediği için reçeteyi partiye göre ayarlayamıyor.

## Ne yapıyor?
- Lastik fotoğrafından sınıfı, aşınma düzeyini ve görünür kirliliği Gemini Vision ile okur.
- Sınıfa göre kauçuk bileşimini (doğal/sentetik kauçuk, karbon karası, silika, çelik tel) tahmin eder.
- Model sıcaklık ve ısıtma rampası önerir; sunucu kodu bileşimi %100'e normalize eder, reçete fazlarını ve sürelerini kurar, kütle dengesini, geri kazanılmış karbon karası (rCB) kalite tahminini ve CO₂ tahminini hesaplar.
- Çoklu fotoğraflı parti modu ve doğruluk paneli (CSV çıktısı) içerir.

## Önemli
- Bileşim ölçüm değil, sınıf bazlı tahmindir. Reçeteler gerçek bir tesiste doğrulanmamıştır.
- CO₂ değeri brüt ikame tahminidir, piroliz prosesinin emisyonlarını içermez.
- Sistem PLC/SCADA'ya bağlı değildir; reçete operatör onayına sunulan bir simülasyondur.

## Mimari
React + TypeScript + Tailwind (arayüz), Node.js/Express (sunucu, Gemini çağrısı). Google AI Studio ile geliştirildi.

## Çalıştırma
Node.js gerekir.
1. `npm install`
2. `.env.example` dosyasını `.env` olarak kopyala ve `GEMINI_API_KEY` değerini kendi anahtarınla doldur
3. `npm run dev`
4. Tarayıcıda `http://localhost:3000` adresini aç

## Yol haritası
Konveyör kamerası ile otomatik sınıflandırma, gerçek tesis verisiyle kalibrasyon, ek lastik sınıfları.
