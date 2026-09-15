#include "esp_camera.h"
#include <ESP32QRCodeReader.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>

const char *WIFI_SSID = "**********";     // your wifi ssid or name
const char *WIFI_PASSWORD = "**********"; // your wifi password

const char *SCRIPT_URL =
    "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"; // your Google
                                                                  // Apps Script
                                                                  // Deployment
                                                                  // ID

LiquidCrystal_I2C lcd(0x27, 16, 2);

ESP32QRCodeReader reader(CAMERA_MODEL_AI_THINKER);
QRCodeData qrData;
String lastQr = "";
unsigned long lastScanTime = 0;

void connectWiFi() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting");
  lcd.setCursor(0, 1);
  lcd.print("WiFi...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");

  Serial.println("WiFi Connected");
}

void showReady() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready To Scan");
  lcd.setCursor(0, 1);
  lcd.print("Show QR Code");

  Serial.println("Ready to scan, show QR code");
}

void showWaiting() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Checking...");
  lcd.setCursor(0, 1);
  lcd.print("Please Wait");

  Serial.println("Checking...  Plese wait");
}

void setup() {
  Serial.begin(115200);

  Wire.begin(13, 14);
  lcd.init();
  lcd.backlight();

  connectWiFi();

  QRCodeReaderSetupErr err = reader.setup();

  if (err != SETUP_OK) {
    lcd.clear();
    lcd.print("Camera Error");

    Serial.println("Camera Error");

    while (true) {
      delay(1000);
    }
  }

  //====THIS BLOCK IS FOR OV3660 CAMERA MODULE===

  //===============================================

  sensor_t *s = esp_camera_sensor_get();
  if (s && s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_hmirror(s, 0);
  }

  //==============================================
  reader.begin();

  Wire.begin(13, 14);
  lcd.init();
  lcd.backlight();

  showReady();
}

void loop() {
  if (!reader.receiveQrCode(&qrData, 100))
    return;

  if (!qrData.valid)
    return;

  String qr = "";

  for (int i = 0; i < qrData.payloadLen; i++) {
    qr += (char)qrData.payload[i];
  }

  qr.trim();

  if (qr.length() == 0)
    return;

  if (qr == lastQr && (millis() - lastScanTime < 5000)) {
    return;
  }

  lastQr = qr;
  lastScanTime = millis();

  Serial.print("QR : ");
  Serial.println(qr);

  showWaiting();

  if (WiFi.status() != WL_CONNECTED) {

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Lost");

    lcd.setCursor(0, 1);
    lcd.print("Reconnect...");

    Serial.println("Wi-Fi lost Reconnect...");

    connectWiFi();
    showReady();

    return;
  }

  WiFiClientSecure client;
  HTTPClient http;
  client.setInsecure();

  String url = String(SCRIPT_URL);
  url += "?qr=";
  url += qr;

  Serial.print("Request URL: ");
  Serial.println(url);

  http.begin(client, url);
  http.setFollowRedirects(HTTPC_FORCE_FOLLOW_REDIRECTS);
  http.setTimeout(15000);

  int httpCode = http.GET();
  if (httpCode > 0) {

    String response = http.getString();

    Serial.print("Server : ");
    Serial.println(response);

    if (response.startsWith("OK|")) {

      String student = response.substring(3);

      Serial.println(response);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Message Sent");

      Serial.println("Message Sent");

      lcd.setCursor(0, 1);

      if (student.length() > 16) {
        student = student.substring(0, 16);
      }

      lcd.print(student);

      Serial.println(student);
    }

    else if (response.startsWith("ERROR|")) {
      String error = response.substring(6);

      lcd.clear();

      if (error == "QR Not Found") {
        lcd.setCursor(0, 0);
        lcd.print("QR Not Found");
        lcd.setCursor(0, 1);
        lcd.print("Try Again");

        Serial.println("QR not found, Try again");
      }

      else if (error == "QR Missing") {
        lcd.setCursor(0, 0);
        lcd.print("QR Missing");
        lcd.setCursor(0, 1);
        lcd.print("Try Again");

        Serial.println("QR Missing, Try again");
      }

      else if (error == "Telegram Failed") {
        lcd.setCursor(0, 0);
        lcd.print("Telegram");
        lcd.setCursor(0, 1);
        lcd.print("Failed");

        Serial.println("Telegram Failed");
      }

      else if (error == "Database Not Found") {
        lcd.setCursor(0, 0);
        lcd.print("Sheet Error");
        lcd.setCursor(0, 1);
        lcd.print("Database");

        Serial.println("Sheet Error, Database");
      }

      else {
        lcd.setCursor(0, 0);
        lcd.print("Server Error");
        lcd.setCursor(0, 1);
        lcd.print("Try Again");

        Serial.println("Server Error, Try again");
      }
    }

    else {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Invalid Reply");
      lcd.setCursor(0, 1);
      lcd.print("Apps Script");

      Serial.println("Invalid Reply, Apps Script");
    }
  }

  else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("HTTP Error");
    lcd.setCursor(0, 1);
    lcd.print(httpCode);

    Serial.print("HTTP Error, ");
    Serial.println(httpCode);
  }

  http.end();

  delay(2500);

  Wire.begin(13, 14);
  lcd.init();
  lcd.backlight();

  showReady();
}
