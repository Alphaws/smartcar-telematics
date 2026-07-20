-- SmartCar Telematics Production Database Schema

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS can_profiles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    can_b_speed VARCHAR(32) NOT NULL,
    can_c_speed VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'verified'
);

CREATE TABLE IF NOT EXISTS vehicles (
    vin VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    plate VARCHAR(32) NOT NULL,
    owner_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    can_profile_id VARCHAR(64) REFERENCES can_profiles(id) ON DELETE SET NULL,
    device_id VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(32) DEFAULT 'online',
    last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    windows_closed BOOLEAN DEFAULT true,
    sunroof_closed BOOLEAN DEFAULT true,
    doors_locked BOOLEAN DEFAULT true,
    trunk_closed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry_history (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(64) REFERENCES vehicles(vin) ON DELETE CASCADE,
    lat NUMERIC(9,6) NOT NULL,
    lng NUMERIC(9,6) NOT NULL,
    speed INT DEFAULT 0,
    rpm INT DEFAULT 0,
    coolant_temp INT DEFAULT 85,
    battery_voltage NUMERIC(4,2) DEFAULT 12.6,
    fuel_liters INT DEFAULT 50,
    fuel_percent INT DEFAULT 65,
    odometer INT DEFAULT 100000,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dtc_logs (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(64) REFERENCES vehicles(vin) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    module VARCHAR(32) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(32) DEFAULT 'warning',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(64) NOT NULL,
    deposit_amount INT DEFAULT 25000,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed CAN Profiles
INSERT INTO can_profiles (id, name, can_b_speed, can_c_speed, status)
VALUES 
    ('mb_w164', 'Mercedes-Benz GL / ML (W164 / X164)', '83.3kbps', '500kbps', 'verified'),
    ('bmw_e60', 'BMW 5 Series / 3 Series (E60 / E90 K-CAN)', '100kbps', '500kbps', 'verified'),
    ('vw_mqb', 'Volkswagen / Audi / Skoda (MQB Platform)', '500kbps', '500kbps', 'verified'),
    ('ford_focus3', 'Ford Focus MK3 / Mondeo MK4 (MS-CAN)', '125kbps', '500kbps', 'testing')
ON CONFLICT (id) DO NOTHING;

-- Seed Default Admin & Customer Accounts with valid bcrypt hashes
-- admin123 hash: $2a$10$ptsAmVATYBKAd3KemXq2g.b57hS38VJn6Z0e.2cZK07YenBAdgOT2
-- user123 hash:  $2a$10$qEf6GosGRzHX2Aip26iL2O1mxo4R3ozjyPOtGWcFTzAwi5fb15VEG
INSERT INTO users (id, name, email, password_hash, role)
VALUES 
    ('usr_admin_1', 'Admin Rendszergazda', 'admin@smartcar.hu', '$2a$10$ptsAmVATYBKAd3KemXq2g.b57hS38VJn6Z0e.2cZK07YenBAdgOT2', 'admin'),
    ('usr_imre_2', 'Imre (Mercedes GL Tulajdonos)', 'imre@smartcar.hu', '$2a$10$qEf6GosGRzHX2Aip26iL2O1mxo4R3ozjyPOtGWcFTzAwi5fb15VEG', 'user')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed Default Vehicle (Mercedes GL W164)
INSERT INTO vehicles (vin, name, plate, owner_id, can_profile_id, device_id, status)
VALUES 
    ('WDC1648221A491726', 'Mercedes-Benz GL 320 CDI (W164)', 'ABC-123', 'usr_imre_2', 'mb_w164', 'ESP32_W164_001', 'online')
ON CONFLICT (vin) DO NOTHING;

-- Seed Default DTC Logs
INSERT INTO dtc_logs (vin, code, module, description, severity)
VALUES 
    ('WDC1648221A491726', 'P0299', 'ECM', 'Turbocharger Underboost Condition (Aktuátor szorulás kód)', 'warning'),
    ('WDC1648221A491726', 'C1000', 'ESP', 'CAN Communication Temporary Interruption', 'info')
ON CONFLICT DO NOTHING;
