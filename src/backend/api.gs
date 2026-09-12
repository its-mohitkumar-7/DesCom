const SCHOOL_NAME = "<YOUR_SCHOOL_NAME>";   //your school name
const BOT_TOKEN = "<YOUR_BOT_TOKEN>";   //your bot token
const SHEET_NAME = "<RECORDS_SHEET_NAME>";   //sheet name where you stored records

const COL = {
  QR: 1,
  STUDENT: 2,
  FATHER: 3,
  PHONE: 4,
  CHAT: 5,
  LAST_SCAN: 6,
  STATUS: 7
};

function sheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function scanTime() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
}

function doGet(e) {
  if (!e || !e.parameter || !e.parameter.qr) {
    return ContentService.createTextOutput("ERROR|QR Missing");
  }

  const qr = String(e.parameter.qr).trim();
  if (qr == "") {
    return ContentService.createTextOutput("ERROR|QR Missing");
  }

  const ws = sheet();
  if (!ws) {
    return ContentService.createTextOutput("ERROR|Database Not Found");
  }

  const data = ws.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const currentQR = String(data[i][COL.QR - 1]).trim();

    if (currentQR !== qr) continue;

    const row = i + 1;
    const student = String(data[i][COL.STUDENT - 1]).trim();
    const father = String(data[i][COL.FATHER - 1]).trim();
    const chat = String(data[i][COL.CHAT - 1]).trim();
    const time = scanTime();

    const message = `✅ Destination Confirmation\n\nSchool: ${SCHOOL_NAME}\n\nStudent: ${student}\nParent: ${father}\n\nThe student has scanned the school QR code.\n\nScan Time:\n${time}`;
    
    const requestPayload = {
      url: "https://telegram.org" + BOT_TOKEN + "/sendMessage",
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chat, text: message }),
      muteHttpExceptions: true
    };

    let sent = false;
    try {
      const responses = UrlFetchApp.fetchAll([requestPayload]);
      if (responses[0].getResponseCode() === 200) {
        sent = true;
      }
    } catch (err) {
      sent = false;
    }

    const statusText = sent ? "Sent" : "Failed";

    ws.getRange(row, COL.LAST_SCAN, 1, 2).setValues([[time, statusText]]);

    if (sent) {
      return ContentService.createTextOutput("OK|" + student);
    } else {
      return ContentService.createTextOutput("ERROR|Telegram Failed");
    }
  }

  return ContentService.createTextOutput("ERROR|QR Not Found");
}
