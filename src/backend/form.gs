const CONFIG = {
  FORM_SHEET: "<Form sheet name>",  //placeholder for form sheet name
  DATABASE_SHEET: "<Records sheet name>",  //placeholder for table sheet name
  
  HEADER_ROW: 1,
  FIRST_DATA_ROW: 2,
  
  FORM: {
    SEARCH: "D4",
    STUDENT: "B6",
    FATHER: "D6",
    PHONE: "B8",
    CHAT: "D8"
  },
  
  COLUMN: {
    QR: 1,
    STUDENT: 2,
    FATHER: 3,
    PHONE: 4,
    CHAT: 5,
    LAST_SCAN: 6,
    STATUS: 7
  },
  
  QR_PREFIX: "QR",
  QR_DIGITS: 6
};

function spreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function formSheet() {
  return spreadsheet().getSheetByName(CONFIG.FORM_SHEET);
}

function databaseSheet() {
  return spreadsheet().getSheetByName(CONFIG.DATABASE_SHEET);
}

function formCell(name) {
  return formSheet().getRange(CONFIG.FORM[name]);
}

function getValue(name) {
  return formCell(name).getValue();
}

function setValue(name, value) {
  formCell(name).setValue(value);
}

function popup(message) {
  SpreadsheetApp.getUi().alert(message);
}

function confirmBox(message) {
  return SpreadsheetApp.getUi().alert(
    "Confirmation",
    message,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  ) == SpreadsheetApp.getUi().Button.YES;
}

function trim(value) {
  return String(value).trim();
}

function upper(value) {
  return trim(value).toUpperCase();
}

function empty(value) {
  return trim(value) === "";
}

function lastRow() {
  return databaseSheet().getLastRow();
}

function totalRows() {
  return Math.max(0, lastRow() - CONFIG.FIRST_DATA_ROW + 1);
}

function databaseData() {
  if (totalRows() === 0) return [];

  return databaseSheet().getRange(
    CONFIG.FIRST_DATA_ROW,
    1,
    totalRows(),
    CONFIG.COLUMN.STATUS
  ).getValues();
}

function databaseRow(row) {
  return databaseSheet().getRange(
    row,
    1,
    1,
    CONFIG.COLUMN.STATUS
  ).getValues()[0];
}

function writeDatabaseRow(row, values) {
  databaseSheet().getRange(
    row,
    1,
    1,
    values.length
  ).setValues([values]);
}

function appendDatabaseRow(values) {
  databaseSheet().appendRow(values);
}

function deleteDatabaseRow(row) {
  databaseSheet().deleteRow(row);
}

function clearForm() {
  setValue("STUDENT", "");
  setValue("FATHER", "");
  setValue("PHONE", "");
  setValue("CHAT", "");
}

function formData() {
  return {
    student: upper(getValue("STUDENT")),
    father: upper(getValue("FATHER")),
    phone: trim(getValue("PHONE")),
    chat: trim(getValue("CHAT")),
    search: trim(getValue("SEARCH"))
  };
}

function validateName(name, field) {
  if (empty(name)) {
    popup(field + " is required.");
    return false;
  }

  if (!/^[A-Z ]+$/.test(upper(name))) {
    popup(field + " can contain only alphabets and spaces.");
    return false;
  }

  return true;
}

function validatePhone(phone) {
  phone = trim(phone);

  if (empty(phone)) {
    popup("Phone number is required.");
    return false;
  }

  if (!/^\d{10}$/.test(phone)) {
    popup("Phone number must contain exactly 10 digits.");
    return false;
  }

  return true;
}

function validateChat(chat) {
  chat = trim(chat);

  if (empty(chat)) {
    popup("Chat ID is required.");
    return false;
  }

  if (!/^-?\d+$/.test(chat)) {
    popup("Chat ID must contain only numbers.");
    return false;
  }

  return true;
}

function convertUppercase() {
  setValue("STUDENT", upper(getValue("STUDENT")));
  setValue("FATHER", upper(getValue("FATHER")));
}

function validateForm() {

  convertUppercase();

  const data = formData();

  if (!validateName(data.student, "Student Name"))
    return false;

  if (!validateName(data.father, "Father Name"))
    return false;

  if (!validatePhone(data.phone))
    return false;

  if (!validateChat(data.chat))
    return false;

  return true;
}

function randomDigits(length) {

  let value = "";

  for (let i = 0; i < length; i++) {
    value += Math.floor(Math.random() * 10);
  }

  return value;
}

function generateQR() {

  while (true) {

    const qr = CONFIG.QR_PREFIX + randomDigits(CONFIG.QR_DIGITS);

    if (!qrExists(qr))
      return qr;

  }

}

function qrExists(qr) {

  const data = databaseData();

  for (const row of data) {

    if (row[CONFIG.COLUMN.QR - 1] == qr)
      return true;

  }

  return false;
}

function duplicateStudent(student, father) {

  student = upper(student);
  father = upper(father);

  const data = databaseData();

  for (const row of data) {

    if (
      upper(row[CONFIG.COLUMN.STUDENT - 1]) == student &&
      upper(row[CONFIG.COLUMN.FATHER - 1]) == father
    ) {
      return true;
    }

  }

  return false;
}

function fillForm(record) {
  setValue("STUDENT", record[CONFIG.COLUMN.STUDENT - 1]);
  setValue("FATHER", record[CONFIG.COLUMN.FATHER - 1]);
  setValue("PHONE", record[CONFIG.COLUMN.PHONE - 1]);
  setValue("CHAT", record[CONFIG.COLUMN.CHAT - 1]);
}

function clearSearch() {
  setValue("SEARCH", "");
}

function findRecord(keyword) {

  keyword = upper(keyword);

  const data = databaseData();

  const matches = [];

  for (let i = 0; i < data.length; i++) {

    const row = data[i];

    const qr = upper(row[CONFIG.COLUMN.QR - 1]);
    const student = upper(row[CONFIG.COLUMN.STUDENT - 1]);
    const phone = trim(row[CONFIG.COLUMN.PHONE - 1]);
    const chat = trim(row[CONFIG.COLUMN.CHAT - 1]);

    if (
      qr === keyword ||
      student === keyword ||
      phone === keyword ||
      chat === keyword
    ) {

      matches.push({
        sheetRow: CONFIG.FIRST_DATA_ROW + i,
        values: row
      });

    }

  }

  return matches;

}

function searchRecord() {

  const keyword = trim(getValue("SEARCH"));

  if (empty(keyword)) {
    popup("Enter a value to search.");
    return;
  }

  const matches = findRecord(keyword);

  if (matches.length === 0) {
    popup("No record found.");
    return;
  }

  if (matches.length === 1) {

    fillForm(matches[0].values);

    popup("Record loaded successfully.");

    return;

  }

  fillForm(matches[0].values);

  popup(
    "Multiple records found.\n\n" +
    "The first matching record has been loaded.\n\n" +
    "Verify the details before updating.\n\n" +
    "If required, search using QR Code or Phone Number."
  );

}

function selectedRecord() {

  const data = formData();

  const matches = findRecord(data.student);

  for (const match of matches) {

    const row = match.values;

    if (
      upper(row[CONFIG.COLUMN.STUDENT - 1]) === data.student &&
      upper(row[CONFIG.COLUMN.FATHER - 1]) === data.father
    ) {
      return match;
    }

  }

  return null;

}

function recordExists() {

  return selectedRecord() !== null;

}

function saveRecord() {

  if (!validateForm())
    return;

  const data = formData();

  if (duplicateStudent(data.student, data.father)) {
    popup("This student already exists.");
    return;
  }

  const qr = generateQR();

  appendDatabaseRow([
    qr,
    data.student,
    data.father,
    data.phone,
    data.chat,
    "",
    ""
  ]);

  popup(
    "Entry saved successfully.\n\n" +
    "Generated QR ID\n\n" +
    qr +
    "\n\nPlease note this QR ID.\nIt will only be shown once."
  );

  clearForm();
  clearSearch();
}

function saveButton() {
  saveRecord();
}

function searchButton() {
  searchRecord();
}

function onEdit(e) {

  const range = e.range;
  const sheet = range.getSheet();

  if (sheet.getName() !== CONFIG.FORM_SHEET)
    return;

  const address = range.getA1Notation();

  if (address === CONFIG.FORM.STUDENT) {
    setValue("STUDENT", upper(range.getValue()));
    return;
  }

  if (address === CONFIG.FORM.FATHER) {
    setValue("FATHER", upper(range.getValue()));
    return;
  }

  if (address === CONFIG.FORM.PHONE) {

    let phone = String(range.getValue()).replace(/\D/g, "");

    if (phone.length > 10)
      phone = phone.substring(0, 10);

    setValue("PHONE", phone);

    return;
  }

  if (address === CONFIG.FORM.CHAT) {

    let chat = String(range.getValue());

    chat = chat.replace(/(?!^-)[^\d]/g, "");

    setValue("CHAT", chat);

  }

}

function updateRecord() {

  if (!validateForm())
    return;

  const record = selectedRecord();

  if (record === null) {
    popup("Record not found.");
    return;
  }

  const data = formData();

  writeDatabaseRow(record.sheetRow, [
    record.values[CONFIG.COLUMN.QR - 1],
    data.student,
    data.father,
    data.phone,
    data.chat,
    record.values[CONFIG.COLUMN.LAST_SCAN - 1],
    record.values[CONFIG.COLUMN.STATUS - 1]
  ]);

  popup("Record updated successfully.");

}

function deleteRecord() {

  const record = selectedRecord();

  if (record === null) {
    popup("Record not found.");
    return;
  }

  if (!confirmBox(
      "Delete this student?\n\n" +
      record.values[CONFIG.COLUMN.STUDENT - 1] +
      "\n" +
      record.values[CONFIG.COLUMN.FATHER - 1]
  )) {
    return;
  }

  deleteDatabaseRow(record.sheetRow);

  popup("Record deleted successfully.");

  clearForm();
  clearSearch();

}

function clearButton() {
  clearForm();
  clearSearch();
}

function updateButton() {
  updateRecord();
}

function deleteButton() {
  deleteRecord();
}

function clearForm() {

  setValue("STUDENT", "");
  setValue("FATHER", "");
  setValue("PHONE", "");
  setValue("CHAT", "");

}

function resetForm() {
  clearForm();
  clearSearch();
}

function formFilled() {

  const data = formData();

  return !(
    empty(data.student) &&
    empty(data.father) &&
    empty(data.phone) &&
    empty(data.chat)
  );

}

function focusSearch() {
  formCell("SEARCH").activate();
}

function focusStudent() {
  formCell("STUDENT").activate();
}
