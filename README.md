# SmartCar Telematics & Remote Control SaaS Platform

**Verzió:** 1.0.0  
**Típus:** Kereskedelmi Autó-Telematikai és Távvezérlő Felhős Platform  
**Lokális URL:** `https://smartcar.localhost`  
**API URL:** `https://api.smartcar.localhost`

---

## 🚘 Áttekintés

A **SmartCar Telematics** egy professzionális, felhőalapú telematikai és távvezérlő platform, amely a járművekbe épített **ESP32 Dual-CAN** modulokkal kommunikál. 

### Fő Funkciók
- 🪟 **Távvezérlés (CAN-B Busz):** Ablakok és tolótető felhúzása, ajtók nyitása/zárása, csomagtér nyitása közvetlenül a mobiltelefonos webappból.
- 📍 **Élő GPS Nyomkövetés:** Valós idejű Leaflet térkép, koordináták, műholdstátusz.
- 📊 **Telemetria Dashboard:** Akkumulátor feszültség, üzemanyag-szint (liter és %), hűtővíz hőmérséklet, sebesség, km óra állás.
- ⚠️ **Motordiagnosztika (DTC):** Valós idejű motordiagnosztikai hibakódok beolvasása és értesítések.

---

## 🛠️ Architektúra és Technológiai Stack

- **Frontend:** React + Vite + Lucide Icons + Leaflet Maps + Socket.IO Client + Vanilla CSS Glassmorphism
- **Backend:** Node.js + Express + MQTT.js + Socket.IO + In-Memory & REST API
- **MQTT Broker:** Eclipse Mosquitto (MQTT + WebSockets)
- **Orchestration:** Docker Compose + Traefik Reverse Proxy (TLS HTTPS `smartcar.localhost`)

---

## 🚀 Indítás és Fejlesztés

### Lokális Indítás (Docker Compose)
```bash
cd /home/alphaws/Dev/Projects/smartcar-telematics
docker compose up -d --build
```

Nyisd meg a böngészőben: **[https://smartcar.localhost](https://smartcar.localhost)**

---

## 📂 Könyvtárszerkezet

```
smartcar-telematics/
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── src/index.js
│   └── Dockerfile
├── frontend/
│   ├── src/App.jsx
│   ├── src/index.css
│   └── Dockerfile
└── mosquitto/
    └── config/mosquitto.conf
```
