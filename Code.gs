// ==========================================
// ORI ACADEMY - CRM & STUDENT MANAGEMENT
// ==========================================
// Version: v6 - Bảo mật token + Nâng cấp bot
// ==========================================

// =====================
// CẤU HÌNH BOT (Bảo mật — lưu trong PropertiesService)
// =====================
// ⚠️ KHÔNG hardcode token ở đây! Chạy setupBotCredentials() 1 lần để lưu.
function getBotToken() {
  return PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN") || "";
}
function getChatId() {
  return PropertiesService.getScriptProperties().getProperty("CHAT_ID") || "";
}
// Chạy HÀM NÀY 1 LẦN DUY NHẤT để lưu token an toàn
function setupBotCredentials() {
  PropertiesService.getScriptProperties().setProperties({
    "TELEGRAM_BOT_TOKEN": "8787082327:AAHanlCOSCeeMU4Q_JtIf1bY1d8dISO65tk",
    "CHAT_ID": "-5238009332"
  });
  Logger.log("✅ Bot credentials đã lưu an toàn trong PropertiesService.");
  // SAU KHI CHẠY XONG → xóa token trong hàm này → commit lại
}
const TELEGRAM_BOT_TOKEN = getBotToken();
const CHAT_ID = getChatId();

// =====================
// SETUP DATABASE
// =====================
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheetKhoaHoc = ss.getSheetByName("KhoaHoc");
  if (!sheetKhoaHoc) {
    sheetKhoaHoc = ss.insertSheet("KhoaHoc");
    sheetKhoaHoc.appendRow(["Mã KH", "Tên KH", "Thời lượng", "Phí giáo trình"]);
    const initialData = [
      ["KH01", "TOEIC Basic (24 buổi)", "24 buổi", 0],
      ["KH02", "Pre TOEIC (12 buổi)", "12 buổi", 0],
      ["KH03", "TOEIC Test (12 buổi)", "12 buổi", 35000],
      ["KH04", "Giao tiếp phản xạ", "Tùy chọn", 0],
      ["KH05", "Phỏng vấn HK 3", "Tùy chọn", 0],
      ["KH06", "Phỏng vấn HK 5", "Tùy chọn", 0],
      ["KH07", "Phỏng vấn HK 8", "Tùy chọn", 0],
      ["KH08", "Phỏng vấn HK 10", "Tùy chọn", 0]
    ];
    sheetKhoaHoc.getRange(2, 1, initialData.length, initialData[0].length).setValues(initialData);
    sheetKhoaHoc.getRange("A1:D1").setFontWeight("bold").setBackground("#d9ead3");
    sheetKhoaHoc.setFrozenRows(1);
  }

  let sheetLopHoc = ss.getSheetByName("LopHoc");
  if (!sheetLopHoc) {
    sheetLopHoc = ss.insertSheet("LopHoc");
    sheetLopHoc.appendRow(["Mã Lớp", "Mã KH", "Ngày khai giảng", "Trạng thái"]);
    sheetLopHoc.getRange("A1:D1").setFontWeight("bold").setBackground("#c9daf8");
    sheetLopHoc.setFrozenRows(1);
  }

  let sheetHocVien = ss.getSheetByName("HocVien");
  if (!sheetHocVien) {
    sheetHocVien = ss.insertSheet("HocVien");
    sheetHocVien.appendRow(["Mã HV", "Họ Tên", "SĐT", "Ngày sinh", "Phân loại", "CCCD", "Email"]);
    sheetHocVien.getRange("A1:G1").setFontWeight("bold").setBackground("#fce5cd");
    sheetHocVien.setFrozenRows(1);
  }

  let sheetHocPhi = ss.getSheetByName("HocPhi");
  if (!sheetHocPhi) {
    sheetHocPhi = ss.insertSheet("HocPhi");
    sheetHocPhi.appendRow(["Mã ĐK", "Mã HV", "Mã Lớp", "Loại thanh toán", "Tổng tiền", "Đã đóng", "Còn nợ", "Ngày đến hạn tiếp theo"]);
    sheetHocPhi.getRange("A1:H1").setFontWeight("bold").setBackground("#fff2cc");
    sheetHocPhi.setFrozenRows(1);
  }

  let sheetDiemDanh = ss.getSheetByName("DiemDanh");
  if (!sheetDiemDanh) {
    sheetDiemDanh = ss.insertSheet("DiemDanh");
    sheetDiemDanh.appendRow(["Ngày", "Mã Lớp", "Mã HV", "Trạng thái"]);
    sheetDiemDanh.getRange("A1:D1").setFontWeight("bold").setBackground("#ead1dc");
    sheetDiemDanh.setFrozenRows(1);
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(["Có mặt", "Vắng", "Trễ"]).build();
    sheetDiemDanh.getRange("D2:D1000").setDataValidation(rule);
  }

  let sheetGiaoDich = ss.getSheetByName("GiaoDich");
  if (!sheetGiaoDich) {
    sheetGiaoDich = ss.insertSheet("GiaoDich");
    sheetGiaoDich.appendRow(["Mã GD", "Thời gian", "Mã HV", "Mã Lớp", "Số tiền", "Hình thức", "Ghi chú"]);
    sheetGiaoDich.getRange("A1:G1").setFontWeight("bold").setBackground("#d9d2e9");
    sheetGiaoDich.setFrozenRows(1);
  }

  let sheetChoHoc = ss.getSheetByName("ChoHoc");
  if (!sheetChoHoc) {
    sheetChoHoc = ss.insertSheet("ChoHoc");
    sheetChoHoc.appendRow(["Mã Khách", "Họ Tên", "SĐT", "Nhu cầu", "Phân loại", "Ngày muốn học", "Level học", "Trạng thái", "CCCD", "Email"]);
    sheetChoHoc.getRange("A1:J1").setFontWeight("bold").setBackground("#d9ead3");
    sheetChoHoc.setFrozenRows(1);
    const ruleTrangThai = SpreadsheetApp.newDataValidation().requireValueInList(["Đang chăm sóc", "Đã chốt", "Hủy"]).build();
    sheetChoHoc.getRange("H2:H1000").setDataValidation(ruleTrangThai);
  }
  let sheetTaiKhoan = ss.getSheetByName("TaiKhoan");
  if (!sheetTaiKhoan) {
    sheetTaiKhoan = ss.insertSheet("TaiKhoan");
    sheetTaiKhoan.appendRow(["Tên đăng nhập", "Mật khẩu", "Quyền", "Họ Tên", "Trạng thái"]);
    const initialUsers = [
      ["admin", "123456", "Manager", "Quản Lý ORI", "Hoạt động"],
      ["letan", "123456", "LeTan", "Lễ Tân 1", "Hoạt động"],
      ["giaovien", "123456", "GiaoVien", "Giáo Viên 1", "Hoạt động"]
    ];
    sheetTaiKhoan.getRange(2, 1, initialUsers.length, initialUsers[0].length).setValues(initialUsers);
    sheetTaiKhoan.getRange("A1:E1").setFontWeight("bold").setBackground("#efefef");
    sheetTaiKhoan.setFrozenRows(1);
  }

  Logger.log("✅ Setup Database hoàn tất.");
}

// =====================
// THÊM CỘT CCCD & EMAIL
// =====================
function addCCCDEmailColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetHocVien = ss.getSheetByName("HocVien");
  if (sheetHocVien) {
    const headers = sheetHocVien.getRange(1, 1, 1, sheetHocVien.getLastColumn()).getValues()[0];
    if (!headers.includes("CCCD")) {
      const nextCol = sheetHocVien.getLastColumn() + 1;
      sheetHocVien.getRange(1, nextCol).setValue("CCCD").setFontWeight("bold").setBackground("#fce5cd");
    }
    const h2 = sheetHocVien.getRange(1, 1, 1, sheetHocVien.getLastColumn()).getValues()[0];
    if (!h2.includes("Email")) {
      const nextCol = sheetHocVien.getLastColumn() + 1;
      sheetHocVien.getRange(1, nextCol).setValue("Email").setFontWeight("bold").setBackground("#fce5cd");
    }
  }

  const sheetChoHoc = ss.getSheetByName("ChoHoc");
  if (sheetChoHoc) {
    const headers = sheetChoHoc.getRange(1, 1, 1, sheetChoHoc.getLastColumn()).getValues()[0];
    if (!headers.includes("CCCD")) {
      const nextCol = sheetChoHoc.getLastColumn() + 1;
      sheetChoHoc.getRange(1, nextCol).setValue("CCCD").setFontWeight("bold").setBackground("#d9ead3");
    }
    const h2 = sheetChoHoc.getRange(1, 1, 1, sheetChoHoc.getLastColumn()).getValues()[0];
    if (!h2.includes("Email")) {
      const nextCol = sheetChoHoc.getLastColumn() + 1;
      sheetChoHoc.getRange(1, nextCol).setValue("Email").setFontWeight("bold").setBackground("#d9ead3");
    }
  }

  Logger.log("✅ Hoàn tất thêm cột CCCD & Email.");
}

// =====================
// VALIDATION CCCD
// =====================
function validateCCCD(cccd) {
  if (!cccd || cccd === "") return true;
  return /^\d{12}$/.test(String(cccd).trim());
}

function setupCCCDValidation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const helpText = "CCCD phải gồm đúng 12 chữ số (Ví dụ: 079204001234)";

  ["HocVien", "ChoHoc"].forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idx = headers.indexOf("CCCD");
    if (idx < 0) return;
    const col = columnToLetter(idx + 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireFormulaSatisfied('=OR(' + col + '2="", REGEXMATCH(TEXT(' + col + '2,"@"), "^\\d{12}$"))')
      .setAllowInvalid(false)
      .setHelpText(helpText)
      .build();
    sheet.getRange(col + "2:" + col + "1000").setDataValidation(rule);
  });

  Logger.log("✅ Hoàn tất thiết lập validation CCCD.");
}

function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// =====================
// CHỐT HỌC VIÊN
// =====================
function chotHocVien(rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetChoHoc = ss.getSheetByName("ChoHoc");
  const sheetHocVien = ss.getSheetByName("HocVien");
  const sheetHocPhi = ss.getSheetByName("HocPhi");

  if (!sheetChoHoc || !sheetHocVien) return;

  const choHocHeaders = sheetChoHoc.getRange(1, 1, 1, sheetChoHoc.getLastColumn()).getValues()[0];
  const rowData = sheetChoHoc.getRange(rowIndex, 1, 1, sheetChoHoc.getLastColumn()).getValues()[0];

  const data = {};
  choHocHeaders.forEach(function(header, i) { data[header] = rowData[i]; });

  if (data["CCCD"] && !validateCCCD(data["CCCD"])) {
    SpreadsheetApp.getUi().alert("❌ CCCD không hợp lệ! Phải đúng 12 chữ số.\nGiá trị: " + data["CCCD"]);
    return;
  }

  const lastRow = sheetHocVien.getLastRow();
  const newMaHV = "HV" + String(lastRow).padStart(4, "0");
  const hvHeaders = sheetHocVien.getRange(1, 1, 1, sheetHocVien.getLastColumn()).getValues()[0];

  const newRow = new Array(hvHeaders.length).fill("");
  hvHeaders.forEach(function(header, i) {
    switch (header) {
      case "Mã HV": newRow[i] = newMaHV; break;
      case "Họ Tên": newRow[i] = data["Họ Tên"] || ""; break;
      case "SĐT": newRow[i] = data["SĐT"] || ""; break;
      case "Phân loại": newRow[i] = data["Phân loại"] || ""; break;
      case "CCCD": newRow[i] = data["CCCD"] || ""; break;
      case "Email": newRow[i] = data["Email"] || ""; break;
    }
  });

  sheetHocVien.appendRow(newRow);

  const trangThaiCol = choHocHeaders.indexOf("Trạng thái") + 1;
  if (trangThaiCol > 0) {
    sheetChoHoc.getRange(rowIndex, trangThaiCol).setValue("Đã chốt");
  }

  if (sheetHocPhi) {
    const maLop = data["Level học"] || "";
    const newMaDK = "DK" + String(sheetHocPhi.getLastRow()).padStart(4, "0");
    sheetHocPhi.appendRow([newMaDK, newMaHV, maLop, "", 0, 0, 0, ""]);
  }

  const message = "✅ *CHỐT HỌC VIÊN MỚI*\n\n" +
    "👤 Họ tên: " + (data["Họ Tên"] || "N/A") + "\n" +
    "📱 SĐT: " + (data["SĐT"] || "N/A") + "\n" +
    "🪪 CCCD: " + (data["CCCD"] || "Chưa cung cấp") + "\n" +
    "📧 Email: " + (data["Email"] || "Chưa cung cấp") + "\n" +
    "📚 Nhu cầu: " + (data["Nhu cầu"] || "N/A") + "\n" +
    "🏷 Phân loại: " + (data["Phân loại"] || "N/A") + "\n" +
    "🔖 Mã HV: " + newMaHV;
  sendToTelegram(message);
}

function onEditChotHocVien(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "ChoHoc") return;
  const range = e.range;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const trangThaiCol = headers.indexOf("Trạng thái") + 1;
  if (range.getColumn() !== trangThaiCol) return;
  if (e.value !== "Đã chốt") return;
  chotHocVien(range.getRow());
}

// =====================
// HÀM TIỆN ÍCH
// =====================
function safeParseDate(rawValue) {
  if (!rawValue) return null;
  if (rawValue instanceof Date) return isNaN(rawValue.getTime()) ? null : rawValue;
  const parts = String(rawValue).split(/[-/]/);
  if (parts.length !== 3) return null;
  let date;
  if (parts[0].length === 4) {
    date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  } else {
    date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return (date && !isNaN(date.getTime())) ? date : null;
}

function getMidnight(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function CALCULATE_NEXT_DUE_DATE(registrationDate) {
  if (!registrationDate) return "";
  let date = new Date(registrationDate);
  if (isNaN(date.getTime())) return "";
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  date.setDate(10);
  return date;
}

// =====================
// TELEGRAM DAILY ALERT — V6 ENHANCED
// =====================
function dailyTelegramAlert() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();
  const today = new Date();
  const todayDayMonth = Utilities.formatDate(today, tz, "dd/MM");
  const todayMidnight = getMidnight(today);
  const dayNames = ["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
  const dayName = dayNames[today.getDay()];
  const dateStr = Utilities.formatDate(today, tz, "dd/MM/yyyy");

  const sheetHocVien = ss.getSheetByName("HocVien");
  if (!sheetHocVien) return;
  const hvHeaders = sheetHocVien.getRange(1, 1, 1, sheetHocVien.getLastColumn()).getValues()[0];
  const dataHocVien = sheetHocVien.getDataRange().getValues();
  const totalHV = Math.max(0, dataHocVien.length - 1);
  let hvNameMap = {};
  for (let i = 1; i < dataHocVien.length; i++) {
    hvNameMap[String(dataHocVien[i][hvHeaders.indexOf("Mã HV")] || "")] = {
      name: dataHocVien[i][hvHeaders.indexOf("Họ Tên")] || "N/A",
      phone: dataHocVien[i][hvHeaders.indexOf("SĐT")] || "N/A"
    };
  }

  // 1. SINH NHẬT
  let birthdayList = [];
  for (let i = 1; i < dataHocVien.length; i++) {
    const dobDate = safeParseDate(dataHocVien[i][hvHeaders.indexOf("Ngày sinh")]);
    if (dobDate && Utilities.formatDate(dobDate, tz, "dd/MM") === todayDayMonth) {
      const phanLoai = dataHocVien[i][hvHeaders.indexOf("Phân loại")] ? " [" + dataHocVien[i][hvHeaders.indexOf("Phân loại")] + "]" : "";
      birthdayList.push("🎂 " + dataHocVien[i][hvHeaders.indexOf("Họ Tên")] + phanLoai + " (" + dataHocVien[i][hvHeaders.indexOf("SĐT")] + ")");
    }
  }

  // 2. HỌC PHÍ QUÁ HẠN
  const sheetHocPhi = ss.getSheetByName("HocPhi");
  let debtList = [], totalDebt = 0;
  if (sheetHocPhi && sheetHocPhi.getLastRow() > 1) {
    const dataHocPhi = sheetHocPhi.getDataRange().getValues();
    for (let i = 1; i < dataHocPhi.length; i++) {
      const debtAmount = parseFloat(dataHocPhi[i][6]);
      if (!isNaN(debtAmount) && debtAmount > 0) {
        totalDebt += debtAmount;
        const dueDateMidnight = getMidnight(safeParseDate(dataHocPhi[i][7]));
        if (dueDateMidnight && dueDateMidnight.getTime() <= todayMidnight.getTime()) {
          const hvInfo = hvNameMap[String(dataHocPhi[i][1])] || {name: dataHocPhi[i][1], phone: ""};
          debtList.push("🚨 " + hvInfo.name + " | Nợ: " + debtAmount.toLocaleString('vi-VN') + "đ");
        }
      }
    }
  }

  // 3. KHÁCH CHỜ + FOLLOW-UP
  const sheetChoHoc = ss.getSheetByName("ChoHoc");
  let waitlistAlerts = [], followUpAlerts = [];
  let chotCount = 0, totalLeads = 0;
  if (sheetChoHoc && sheetChoHoc.getLastRow() > 1) {
    const choHeaders = sheetChoHoc.getRange(1, 1, 1, sheetChoHoc.getLastColumn()).getValues()[0];
    const dataChoHoc = sheetChoHoc.getDataRange().getValues();
    const threeDaysAgo = new Date(today.getTime() - 3 * 86400000);
    for (let i = 1; i < dataChoHoc.length; i++) {
      totalLeads++;
      const tt = String(dataChoHoc[i][choHeaders.indexOf("Trạng thái")] || "");
      if (tt === "Đã chốt") chotCount++;
      if (tt === "Đang chăm sóc") {
        const ngay = getMidnight(safeParseDate(dataChoHoc[i][choHeaders.indexOf("Ngày muốn học")]));
        if (ngay && ngay.getTime() <= todayMidnight.getTime()) {
          waitlistAlerts.push("📞 " + dataChoHoc[i][choHeaders.indexOf("Họ Tên")] + " (" + dataChoHoc[i][choHeaders.indexOf("SĐT")] + ") | " + (dataChoHoc[i][choHeaders.indexOf("Nhu cầu")] || ""));
        }
        if (ngay && ngay.getTime() <= threeDaysAgo.getTime()) {
          const days = Math.floor((todayMidnight.getTime() - ngay.getTime()) / 86400000);
          followUpAlerts.push("⏰ " + dataChoHoc[i][choHeaders.indexOf("Họ Tên")] + " (" + dataChoHoc[i][choHeaders.indexOf("SĐT")] + ") — " + days + " ngày chưa follow-up");
        }
      }
    }
  }

  // 4. LỚP ĐANG MỞ
  const sheetLopHoc = ss.getSheetByName("LopHoc");
  let classesToday = [], activeClassCount = 0;
  if (sheetLopHoc && sheetLopHoc.getLastRow() > 1) {
    const lopData = sheetLopHoc.getDataRange().getValues();
    const hL = lopData[0];
    const maLopCol = hL.indexOf("Mã Lớp") !== -1 ? hL.indexOf("Mã Lớp") : hL.indexOf("Ma Lop");
    const statusLopCol = hL.indexOf("Trạng thái") !== -1 ? hL.indexOf("Trạng thái") : hL.indexOf("Trang thai");
    const gvCol = hL.indexOf("Giáo Viên") !== -1 ? hL.indexOf("Giáo Viên") : -1;
    for (let i = 1; i < lopData.length; i++) {
      const st = String(lopData[i][statusLopCol] || "").toLowerCase();
      if (!st.includes("kết thúc") && !st.includes("xong") && !st.includes("hủy")) {
        activeClassCount++;
        const gv = gvCol >= 0 ? String(lopData[i][gvCol] || "") : "";
        classesToday.push("📚 " + lopData[i][maLopCol] + (gv ? " (GV: " + gv + ")" : ""));
      }
    }
  }

  // 5. HV VẮNG NHIỀU
  const sheetDiemDanh = ss.getSheetByName("DiemDanh");
  let absentAlerts = [];
  if (sheetDiemDanh && sheetLopHoc && sheetDiemDanh.getLastRow() > 1) {
    const lopData = sheetLopHoc.getDataRange().getValues();
    const hL = lopData[0];
    const maLopCol = hL.indexOf("Mã Lớp") !== -1 ? hL.indexOf("Mã Lớp") : hL.indexOf("Ma Lop");
    const statusLopCol = hL.indexOf("Trạng thái") !== -1 ? hL.indexOf("Trạng thái") : hL.indexOf("Trang thai");
    let activeClasses = {};
    for (let i = 1; i < lopData.length; i++) {
      const st = String(lopData[i][statusLopCol] || "").toLowerCase();
      if (!st.includes("kết thúc") && !st.includes("xong")) activeClasses[String(lopData[i][maLopCol])] = true;
    }
    const ddData = sheetDiemDanh.getDataRange().getValues();
    const hD = ddData[0];
    const maHVi = hD.indexOf("Mã HV") !== -1 ? hD.indexOf("Mã HV") : hD.indexOf("Ma HV");
    const maLi = hD.indexOf("Mã Lớp") !== -1 ? hD.indexOf("Mã Lớp") : hD.indexOf("Ma Lop");
    const stI = hD.indexOf("Trạng thái") !== -1 ? hD.indexOf("Trạng thái") : hD.indexOf("Trang thai");
    const ngI = hD.indexOf("Ngày") !== -1 ? hD.indexOf("Ngày") : hD.indexOf("Ngay");
    let absentMap = {};
    for (let i = 1; i < ddData.length; i++) {
      const mLop = String(ddData[i][maLi] || "");
      if (!activeClasses[mLop]) continue;
      const mHV = String(ddData[i][maHVi] || "");
      const st = String(ddData[i][stI] || "").toLowerCase();
      const key = mLop + "_" + mHV;
      if (!absentMap[key]) absentMap[key] = { count: 0, lastDate: "", maHV: mHV, maLop: mLop };
      if (st.includes("vắng") || st.includes("vang")) { absentMap[key].count++; absentMap[key].lastDate = String(ddData[i][ngI] || ""); }
    }
    let bufferDate = new Date(today.getTime()); bufferDate.setDate(today.getDate() - 3);
    Object.keys(absentMap).forEach(key => {
      const item = absentMap[key];
      if (item.count >= 2) {
        let ld = safeParseDate(item.lastDate);
        if (ld && ld.getTime() >= bufferDate.getTime()) {
          const hvInfo = hvNameMap[item.maHV] || {name: item.maHV, phone: ""};
          absentAlerts.push("⚠️ " + hvInfo.name + " | Lớp: " + item.maLop + " | Vắng: " + item.count + " buổi");
        }
      }
    });
  }

  // BUILD MESSAGE
  let message = "🔔 *BÁO CÁO " + dayName.toUpperCase() + " — " + dateStr + "*\n";
  message += "━━━━━━━━━━━━━━━━\n\n";
  message += "📊 *TỔNG QUAN:*\n";
  message += "👥 HV: *" + totalHV + "* | Lớp mở: *" + activeClassCount + "*\n";
  message += "📋 Leads: *" + totalLeads + "* (Chốt: " + chotCount + ")\n";
  if (totalDebt > 0) message += "💸 Tổng nợ: *" + totalDebt.toLocaleString('vi-VN') + "đ*\n";
  message += "\n";
  if (classesToday.length > 0) message += "📅 *LỚP ĐANG MỞ (" + classesToday.length + "):*\n" + classesToday.join("\n") + "\n\n";
  if (birthdayList.length > 0) message += "🎈 *SINH NHẬT:*\n" + birthdayList.join("\n") + "\n\n";
  if (debtList.length > 0) message += "💰 *NỢ QUÁ HẠN (" + debtList.length + "):*\n" + debtList.join("\n") + "\n\n";
  if (waitlistAlerts.length > 0) message += "🔥 *KHÁCH CẦN GỌI (" + waitlistAlerts.length + "):*\n" + waitlistAlerts.join("\n") + "\n\n";
  if (followUpAlerts.length > 0) message += "⏰ *NHẮC FOLLOW-UP:*\n" + followUpAlerts.join("\n") + "\n\n";
  if (absentAlerts.length > 0) message += "❌ *HV NGHỈ NHIỀU:*\n" + absentAlerts.join("\n") + "\n\n";
  if (debtList.length === 0 && waitlistAlerts.length === 0 && followUpAlerts.length === 0 && absentAlerts.length === 0) {
    message += "✅ *Không có cảnh báo — mọi thứ ổn!*\n\n";
  }
  message += "━━━━━━━━━━━━━━━━\n💡 Gõ /homnay /doanhthu /help";
  sendToTelegram(message);
}

// =====================
// GỬI TELEGRAM
// =====================
function sendToTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: "Markdown" }),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("❌ sendToTelegram: " + e.message);
  }
}

function sendTelegramTo(chatId, text) {
  try {
    var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("❌ sendTelegramTo: " + e.message);
  }
}

// =====================
// TRIGGER & TEST
// =====================
function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "dailyTelegramAlert") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("dailyTelegramAlert").timeBased().everyDays(1).atHour(8).create();
  Logger.log("✅ Trigger dailyTelegramAlert lúc 8h mỗi ngày.");
}

function testBot() {
  sendToTelegram("✅ Bot ORI Academy đã kết nối thành công!");
}

// =====================
// MENU
// =====================
function onOpen() {
  SpreadsheetApp.getUi().createMenu("🎓 ORI Academy")
    .addItem("📊 Setup Database", "setupDatabase")
    .addItem("➕ Thêm cột CCCD & Email", "addCCCDEmailColumns")
    .addItem("✅ Thiết lập Validation CCCD", "setupCCCDValidation")
    .addSeparator()
    .addItem("📱 Test Telegram Bot", "testBot")
    .addItem("🔗 Kết nối Telegram Webhook", "setupWebhook")
    .addItem("⏰ Tạo trigger báo cáo hàng ngày", "setupDailyTrigger")
    .addItem("🔍 Debug: Kiểm tra Webhook", "debugCheckWebhook")
    .addToUi();
}

// =====================================================
// TELEGRAM WEBHOOK — SỬA LỖI GỬI LẶP VÔ HẠN
// =====================================================

// Cache để chống trùng lặp (update_id)
var PROCESSED_CACHE_KEY = "processed_updates";

function isAlreadyProcessed(updateId) {
  var cache = CacheService.getScriptCache();
  var key = "tg_" + updateId;
  if (cache.get(key)) {
    return true; // Đã xử lý rồi → bỏ qua
  }
  cache.put(key, "1", 300); // Lưu 5 phút
  return false;
}

function doPost(e) {
  // LUÔN trả OK ngay lập tức cho Telegram để không retry
  var output = ContentService.createTextOutput("OK");

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return output;
    }

    var data = JSON.parse(e.postData.contents);

    // === DASHBOARD API ===
    if (data.source === "dashboard") {
      var result = handleDashboardAPI(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // === TELEGRAM BOT (existing) ===
    var updateId = data.update_id;
    if (updateId && isAlreadyProcessed(updateId)) {
      Logger.log("⏭ Bỏ qua update trùng: " + updateId);
      return output;
    }

    var message = data.message;
    if (!message || !message.text) {
      return output;
    }

    var chatId = String(message.chat.id);
    var text = message.text.trim();

    var command = text.split("@")[0].split(" ")[0].toLowerCase();

    if (command === "/capnhat") {
      handleCapNhat(chatId, text);
    } else if (command === "/timkiem") {
      handleTimKiem(chatId, text);
    } else if (command === "/help" || command === "/start") {
      handleHelp(chatId);
    } else if (command === "/baocao") {
      handleBaoCao(chatId);
    } else if (command === "/homnay") {
      handleHomNay(chatId);
    } else if (command === "/doanhthu") {
      handleDoanhThu(chatId);
    } else if (command === "/nhacnho") {
      handleNhacNho(chatId);
    } else if (command === "/debug") {
      sendTelegramTo(chatId, "✅ Bot đang hoạt động!\n📱 Chat ID: `" + chatId + "`\n⏰ " + new Date().toLocaleString("vi-VN"));
    }

  } catch (err) {
    Logger.log("❌ doPost error: " + err.message);
  }

  return output;
}

// =====================
// DASHBOARD API HANDLER
// =====================
function handleDashboardAPI(data) {
  try {
    var action = data.action;
    var ss = SpreadsheetApp.openById("19hkkfwrK0elsf6p0WGpyesbA-lexQqHI81nPXkq4GAg");

    if (action === "login") {
      var sheet = ss.getSheetByName("TaiKhoan");
      if (!sheet) {
        // Tự động tạo tab TaiKhoan với 3 tài khoản mặc định
        sheet = ss.insertSheet("TaiKhoan");
        sheet.appendRow(["Tên đăng nhập", "Mật khẩu", "Quyền", "Họ Tên", "Trạng thái"]);
        var initialUsers = [
          ["admin", "123456", "Manager", "Quản Lý ORI", "Hoạt động"],
          ["letan", "123456", "LeTan", "Lễ Tân 1", "Hoạt động"],
          ["giaovien", "123456", "GiaoVien", "Giáo Viên 1", "Hoạt động"]
        ];
        sheet.getRange(2, 1, initialUsers.length, initialUsers[0].length).setValues(initialUsers);
        sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#efefef");
        Logger.log("✅ Đã tự động tạo TaiKhoan với 3 tài khoản mặc định.");
      }
      var dataTK = sheet.getDataRange().getValues();
      var headers = dataTK[0];
      var userCol = headers.indexOf("Tên đăng nhập");
      var passCol = headers.indexOf("Mật khẩu");
      var roleCol = headers.indexOf("Quyền");
      var nameCol = headers.indexOf("Họ Tên");
      
      for (var i = 1; i < dataTK.length; i++) {
        if (String(dataTK[i][userCol]) === String(data.username) && String(dataTK[i][passCol]) === String(data.password)) {
           return {
             success: true,
             role: dataTK[i][roleCol],
             name: dataTK[i][nameCol] || "User",
             message: "Đăng nhập thành công"
           };
        }
      }
      return { success: false, message: "Sai tên đăng nhập hoặc mật khẩu" };

    } else if (action === "addStudent") {
      // Thêm học viên mới vào sheet HocVien
      var sheet = ss.getSheetByName("HocVien");
      sheet.appendRow([
        data.maHV,
        data.hoTen,
        data.sdt,
        data.ngaySinh || "",
        data.phanLoai || "",
        data.cccd || "",
        data.email || ""
      ]);
      return { success: true, message: "Đã thêm HV: " + data.hoTen };

    } else if (action === "addEnrollment") {
      // Thêm đăng ký (HocPhi) mới
      var sheet = ss.getSheetByName("HocPhi");
      sheet.appendRow([
        data.maDK,
        data.maHV,
        data.maLop,
        data.loaiThanhToan || "",
        data.tongTien || 0,
        data.daDong || 0,
        data.conNo || 0,
        data.ngayHan || ""
      ]);
      return { success: true, message: "Đã đăng ký: " + data.maHV + " → " + data.maLop };

    } else if (action === "markAttendance") {
      // Điểm danh
      var sheet = ss.getSheetByName("DiemDanh");
      sheet.appendRow([
        data.ngay,
        data.maLop,
        data.maHV,
        data.trangThai
      ]);
      return { success: true, message: "Đã điểm danh: " + data.maHV + " = " + data.trangThai };

    } else if (action === "recordPayment") {
      // Thu tiền học phí
      var sheet = ss.getSheetByName("HocPhi");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var maDKCol = headers.indexOf("Mã ĐK");
      var maHVCol = headers.indexOf("Mã HV");
      var daDongCol = headers.indexOf("Đã đóng");
      var conNoCol = headers.indexOf("Còn nợ");

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][maDKCol]) === String(data.maDK) || String(values[i][maHVCol]) === String(data.maHV)) {
          var currentPaid = parseFloat(values[i][daDongCol]) || 0;
          var currentDebt = parseFloat(values[i][conNoCol]) || 0;
          var amount = parseFloat(data.soTienThu) || 0;
          
          sheet.getRange(i + 1, daDongCol + 1).setValue(currentPaid + amount);
          sheet.getRange(i + 1, conNoCol + 1).setValue(Math.max(0, currentDebt - amount));
          
          // Gửi thông báo Telegram
          var actorInfo = data.actorName ? " (" + data.actorName + ")" : "";
          sendToTelegram("💰 *THU TIỀN HỌC PHÍ*\n\n👤 Mã HV: " + data.maHV + "\n💵 Số tiền: " + amount.toLocaleString('vi-VN') + "đ\n💳 Hình thức: " + data.hinhThuc + "\n👨‍💼 Thu bởi: " + (data.actorName || "Hệ thống"));

          // Nhật Ký Giao Dịch
          try {
            var sheetGiaoDich = ss.getSheetByName("GiaoDich");
            if (sheetGiaoDich) {
              var maGD = "GD" + new Date().getTime().toString().slice(-6);
              var tz = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
              var maLop = headers.indexOf("Mã Lớp") !== -1 ? values[i][headers.indexOf("Mã Lớp")] : "";
              sheetGiaoDich.appendRow([maGD, tz, data.maHV, maLop, amount, data.hinhThuc || "Tiền mặt", "Thu học phí" + actorInfo]);
            }
          } catch(e) {
            Logger.log("Lỗi ghi GiaoDich: " + e.message);
          }

          return { success: true, message: "Đã ghi nhận thu tiền" };
        }
      }
      return { success: false, message: "Không tìm thấy đăng ký" };

    } else if (action === "updateEnrollmentStatus") {
      // Cập nhật trạng thái HV (Học thử → Chính thức)
      var sheet = ss.getSheetByName("HocPhi");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var maHVCol = headers.indexOf("Mã HV");
      var maLopCol = headers.indexOf("Mã Lớp");

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][maHVCol]) === String(data.maHV) &&
            String(values[i][maLopCol]) === String(data.maLop)) {
          // Add/update Trạng thái HV column
          var statusCol = headers.indexOf("Trạng thái HV");
          if (statusCol === -1) {
            // Add column if not exists
            statusCol = headers.length;
            sheet.getRange(1, statusCol + 1).setValue("Trạng thái HV").setFontWeight("bold");
          }
          sheet.getRange(i + 1, statusCol + 1).setValue(data.trangThai);
          return { success: true, message: "Đã cập nhật: " + data.maHV + " = " + data.trangThai };
        }
      }
      return { success: false, message: "Không tìm thấy đăng ký" };

    } else if (action === "removeEnrollment") {
      // Xóa học viên khỏi lớp (Xóa khỏi sheet HocPhi)
      var sheet = ss.getSheetByName("HocPhi");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var maDKCol = headers.indexOf("Mã ĐK");
      var maHVCol = headers.indexOf("Mã HV");
      var maLopCol = headers.indexOf("Mã Lớp");

      for (var i = 1; i < values.length; i++) {
        if (
          (String(values[i][maDKCol]) === String(data.maDK)) || 
          (String(values[i][maHVCol]) === String(data.maHV) && String(values[i][maLopCol]) === String(data.maLop))
        ) {
          sheet.deleteRow(i + 1);
          return { success: true, message: "Đã xóa đăng ký: " + data.maDK + " khỏi lớp" };
        }
      }
      return { success: false, message: "Không tìm thấy đăng ký để xóa" };

    } else if (action === "editStudent") {
      // Sửa thông tin học viên (HocVien)
      var sheet = ss.getSheetByName("HocVien");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var maHVCol = headers.indexOf("Mã HV");
      var hoTenCol = headers.indexOf("Họ Tên");
      var sdtCol = headers.indexOf("SĐT");

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][maHVCol]) === String(data.maHV)) {
          if (data.hoTen && hoTenCol >= 0) sheet.getRange(i + 1, hoTenCol + 1).setValue(data.hoTen);
          if (data.sdt && sdtCol >= 0) sheet.getRange(i + 1, sdtCol + 1).setValue(data.sdt);
          return { success: true, message: "Đã cập nhật thông tin học viên" };
        }
      }
      return { success: false, message: "Không tìm thấy học viên để sửa" };

    } else if (action === "addLead") {
      // Đăng ký khách tư vấn vào ChoHoc
      var sheet = ss.getSheetByName("ChoHoc");
      sheet.appendRow([
        data.maKhach || "",
        data.hoTen || "",
        data.sdt || "",
        data.nhuCau || "",
        data.phanLoai || "",
        data.ngayMuonHoc || "",
        data.levelHoc || "",
        "Đang chăm sóc",
        data.cccd || "",
        data.email || ""
      ]);
      return { success: true, message: "Đã thêm khách tư vấn mới" };

    } else if (action === "updateLeadStatus") {
      // Chốt Khách (Chờ Học)
      var sheet = ss.getSheetByName("ChoHoc");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var sdtCol = headers.indexOf("SĐT");
      var trangThaiCol = headers.indexOf("Trạng thái");

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][sdtCol]) === String(data.sdt)) {
          var targetStatus = data.status || "Đã chốt";
          sheet.getRange(i + 1, trangThaiCol + 1).setValue(targetStatus);
          
          if (targetStatus === "Đã chốt") {
            // Kích hoạt hàm chốt học viên tự động (như AppSheet)
            chotHocVien(i + 1);
            return { success: true, message: "Đã chốt khách & tạo hồ sơ học viên" };
          } else {
            return { success: true, message: "Đã cập nhật trạng thái: " + targetStatus };
          }
        }
      }
      return { success: false, message: "Không tìm thấy khách" };

    } else if (action === "editClass") {
      // Cập nhật lớp học (Giáo viên, Trạng thái)
      var sheet = ss.getSheetByName("LopHoc");
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var maLopCol = headers.indexOf("Mã Lớp") !== -1 ? headers.indexOf("Mã Lớp") : headers.indexOf("Ma Lop");
      var gvCol = headers.indexOf("Giáo Viên") !== -1 ? headers.indexOf("Giáo Viên") : headers.indexOf("Giao Vien");
      var statusCol = headers.indexOf("Trạng thái") !== -1 ? headers.indexOf("Trạng thái") : headers.indexOf("Trang thai");

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][maLopCol]) === String(data.maLop)) {
          if (data.giaoVien && gvCol !== -1) sheet.getRange(i + 1, gvCol + 1).setValue(data.giaoVien);
          if (data.status && statusCol !== -1) sheet.getRange(i + 1, statusCol + 1).setValue(data.status);
          return { success: true, message: "Đã cập nhật lớp: " + data.maLop };
        }
      }
      return { success: false, message: "Không tìm thấy lớp học" };

    } else if (action === "addClass") {
      // Mở lớp học mới
      var sheet = ss.getSheetByName("LopHoc");
      sheet.appendRow([
        data.maLop,
        data.tenLop || "",
        data.giaoVien || "",
        data.maKH || "",
        data.ngayKhaiGiang || "",
        "Đang mở"
      ]);
      return { success: true, message: "Đã mở lớp học: " + data.maLop };

    } else {
      return { success: false, message: "Unknown action: " + action };
    }

  } catch (err) {
    Logger.log("❌ Dashboard API error: " + err.message);
    return { success: false, message: "Lỗi: " + err.message };
  }
}

function doGet(e) {
  return ContentService.createTextOutput("ORI Academy Bot is running! " + new Date().toISOString());
}

// =====================
// TELEGRAM COMMAND HANDLERS
// =====================
function handleHelp(chatId) {
  var helpText =
    "📋 *HƯỚNG DẪN BOT ORI ACADEMY v6*\n\n" +
    "📅 Hôm nay: `/homnay`\n" +
    "💰 Doanh thu tháng: `/doanhthu`\n" +
    "⏰ Nhắc follow-up: `/nhacnho`\n" +
    "📊 Báo cáo tổng: `/baocao`\n\n" +
    "🔍 Tìm HV: `/timkiem 09xxxxxxxx`\n" +
    "📝 Cập nhật CCCD:\n`/capnhat 09xxx cccd 079204001234`\n" +
    "📝 Cập nhật Email:\n`/capnhat 09xxx email abc@gmail.com`\n\n" +
    "🔧 Kiểm tra: `/debug`";
  sendTelegramTo(chatId, helpText);
}

function handleTimKiem(chatId, text) {
  var parts = text.split(/\s+/);
  if (parts.length < 2) {
    sendTelegramTo(chatId, "⚠️ Cú pháp: `/timkiem 09xxxxxxxx`");
    return;
  }
  var phone = parts[1].replace(/[^\d]/g, '');
  if (!phone) {
    sendTelegramTo(chatId, "⚠️ SĐT không hợp lệ");
    return;
  }

  var hocVienResult = findByPhone("HocVien", phone);
  var choHocResult = findByPhone("ChoHoc", phone);
  var reply = "";

  if (hocVienResult) {
    reply += "✅ *HỌC VIÊN*\n" +
      "👤 " + (hocVienResult["Họ Tên"] || "—") + "\n" +
      "📱 " + (hocVienResult["SĐT"] || "—") + "\n" +
      "🪪 CCCD: " + (hocVienResult["CCCD"] || "❌ Chưa có") + "\n" +
      "📧 Email: " + (hocVienResult["Email"] || "❌ Chưa có") + "\n" +
      "🏷 " + (hocVienResult["Mã HV"] || "—") + "\n\n";
  }
  if (choHocResult) {
    reply += "📋 *CHỜ HỌC*\n" +
      "👤 " + (choHocResult["Họ Tên"] || "—") + "\n" +
      "📱 " + (choHocResult["SĐT"] || "—") + "\n" +
      "🪪 CCCD: " + (choHocResult["CCCD"] || "❌ Chưa có") + "\n" +
      "📧 Email: " + (choHocResult["Email"] || "❌ Chưa có") + "\n" +
      "📚 " + (choHocResult["Nhu cầu"] || "—") + "\n" +
      "📊 " + (choHocResult["Trạng thái"] || "—") + "\n";
  }
  if (!reply) {
    reply = "❌ Không tìm thấy SĐT: " + phone;
  }
  sendTelegramTo(chatId, reply);
}

function handleCapNhat(chatId, text) {
  var parts = text.split(/\s+/);
  if (parts.length < 4) {
    sendTelegramTo(chatId,
      "⚠️ *Cú pháp:*\n" +
      "`/capnhat 09xxx cccd 079204001234`\n" +
      "`/capnhat 09xxx email abc@gmail.com`\n" +
      "`/capnhat 09xxx cccd 079204001234 email abc@gmail.com`");
    return;
  }

  var phone = parts[1].replace(/[^\d]/g, '');
  if (!phone) {
    sendTelegramTo(chatId, "⚠️ SĐT không hợp lệ");
    return;
  }

  var newCCCD = null, newEmail = null;
  for (var i = 2; i < parts.length; i++) {
    if (parts[i].toLowerCase() === 'cccd' && i + 1 < parts.length) {
      newCCCD = parts[++i];
    } else if (parts[i].toLowerCase() === 'email' && i + 1 < parts.length) {
      newEmail = parts[++i];
    }
  }

  if (!newCCCD && !newEmail) {
    sendTelegramTo(chatId, "⚠️ Cần chỉ định `cccd` hoặc `email`");
    return;
  }
  if (newCCCD && !validateCCCD(newCCCD)) {
    sendTelegramTo(chatId, "❌ CCCD phải đúng 12 số. Nhập: `" + newCCCD + "`");
    return;
  }
  if (newEmail && !newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    sendTelegramTo(chatId, "❌ Email không hợp lệ: `" + newEmail + "`");
    return;
  }

  var updated = false;
  var reply = "📝 *CẬP NHẬT* — SĐT: " + phone + "\n\n";

  if (updateByPhone("ChoHoc", phone, newCCCD, newEmail)) { reply += "✅ ChoHoc\n"; updated = true; }
  if (updateByPhone("HocVien", phone, newCCCD, newEmail)) { reply += "✅ HocVien\n"; updated = true; }

  if (!updated) {
    reply += "❌ Không tìm thấy SĐT";
  } else {
    if (newCCCD) reply += "🪪 CCCD → `" + newCCCD + "`\n";
    if (newEmail) reply += "📧 Email → `" + newEmail + "`\n";
  }
  sendTelegramTo(chatId, reply);
}

function handleBaoCao(chatId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetHV = ss.getSheetByName("HocVien");
  var sheetCH = ss.getSheetByName("ChoHoc");
  var sheetHP = ss.getSheetByName("HocPhi");

  var tongHV = sheetHV ? Math.max(0, sheetHV.getLastRow() - 1) : 0;
  var tongCH = sheetCH ? Math.max(0, sheetCH.getLastRow() - 1) : 0;

  var dangCS = 0, daChot = 0;
  if (sheetCH && sheetCH.getLastRow() > 1) {
    var chData = sheetCH.getDataRange().getValues();
    var ttCol = chData[0].indexOf("Trạng thái");
    for (var i = 1; i < chData.length; i++) {
      if (chData[i][ttCol] === "Đang chăm sóc") dangCS++;
      if (chData[i][ttCol] === "Đã chốt") daChot++;
    }
  }

  var tongNo = 0, soNo = 0;
  if (sheetHP && sheetHP.getLastRow() > 1) {
    var hpData = sheetHP.getDataRange().getValues();
    for (var i = 1; i < hpData.length; i++) {
      var no = parseFloat(hpData[i][6]);
      if (!isNaN(no) && no > 0) { tongNo += no; soNo++; }
    }
  }

  sendTelegramTo(chatId,
    "📊 *BÁO CÁO ORI ACADEMY*\n\n" +
    "👥 Học viên: *" + tongHV + "*\n" +
    "📋 Chờ học: *" + tongCH + "*\n" +
    "  ├ Đang chăm sóc: " + dangCS + "\n" +
    "  └ Đã chốt: " + daChot + "\n\n" +
    "💰 Tổng nợ: *" + tongNo.toLocaleString("vi-VN") + "đ*\n" +
    "🚨 HV còn nợ: *" + soNo + "*\n\n" +
    "⏰ " + new Date().toLocaleString("vi-VN"));
}

// =====================
// HÀM TÌM & CẬP NHẬT
// =====================
function findByPhone(sheetName, phone) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var sdtCol = headers.indexOf("SĐT");
  if (sdtCol < 0) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][sdtCol]).replace(/[^\d]/g, '') === phone) {
      var result = {};
      headers.forEach(function(h, j) { result[h] = data[i][j]; });
      return result;
    }
  }
  return null;
}

function updateByPhone(sheetName, phone, newCCCD, newEmail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var sdtCol = headers.indexOf("SĐT");
  var cccdCol = headers.indexOf("CCCD");
  var emailCol = headers.indexOf("Email");
  if (sdtCol < 0) return false;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][sdtCol]).replace(/[^\d]/g, '') === phone) {
      if (newCCCD && cccdCol >= 0) sheet.getRange(i + 1, cccdCol + 1).setValue(newCCCD);
      if (newEmail && emailCol >= 0) sheet.getRange(i + 1, emailCol + 1).setValue(newEmail);
      return true;
    }
  }
  return false;
}

// =====================
// WEBHOOK SETUP
// =====================
function setupWebhook() {
  var webAppUrl = ScriptApp.getService().getUrl();
  if (!webAppUrl) {
    try {
      SpreadsheetApp.getUi().alert("❌ Chưa deploy Web App!\n\n1. Deploy → New deployment\n2. Web app → Execute as: Me, Access: Anyone\n3. Deploy → Chạy lại setupWebhook");
    } catch (e) {}
    return;
  }
  var telegramUrl = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(webAppUrl);
  var response = UrlFetchApp.fetch(telegramUrl);
  var result = JSON.parse(response.getContentText());
  if (result.ok) {
    sendToTelegram("🤖 *Bot ORI Academy kết nối thành công!*\nGõ /help để xem hướng dẫn.");
    try { SpreadsheetApp.getUi().alert("✅ Webhook OK!\n" + webAppUrl); } catch (e) {}
  } else {
    try { SpreadsheetApp.getUi().alert("❌ Lỗi: " + JSON.stringify(result)); } catch (e) {}
  }
}

function debugCheckWebhook() {
  try {
    var response = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getWebhookInfo");
    var result = JSON.parse(response.getContentText());
    var info = "URL: " + (result.result.url || "❌ Chưa set") +
      "\nPending: " + (result.result.pending_update_count || 0) +
      "\nLast error: " + (result.result.last_error_message || "Không có");
    Logger.log(info);
    try { SpreadsheetApp.getUi().alert("🔍 WEBHOOK\n\n" + info); } catch (e) {}
  } catch (e) {
    Logger.log("❌ " + e.message);
  }
}

function removeWebhook() {
  UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/deleteWebhook");
  Logger.log("✅ Webhook removed");
}

function testHelp() { handleHelp(CHAT_ID); }
function testBaoCao() { handleBaoCao(CHAT_ID); }
function testHomNay() { handleHomNay(CHAT_ID); }
function testDoanhThu() { handleDoanhThu(CHAT_ID); }

// =====================
// NEW COMMANDS V6
// =====================
function handleHomNay(chatId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = new Date();
  var dayNames = ["Chủ nhật","Thứ Hai","Thứ Ba","Thứ Tư","Thứ Năm","Thứ Sáu","Thứ Bảy"];
  var msg = "📅 *HÔM NAY — " + dayNames[today.getDay()] + " " + Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy") + "*\n\n";

  // Lớp đang mở
  var sheetLop = ss.getSheetByName("LopHoc");
  if (sheetLop && sheetLop.getLastRow() > 1) {
    var lopData = sheetLop.getDataRange().getValues();
    var hL = lopData[0];
    var maLopCol = hL.indexOf("Mã Lớp") !== -1 ? hL.indexOf("Mã Lớp") : hL.indexOf("Ma Lop");
    var statusCol = hL.indexOf("Trạng thái") !== -1 ? hL.indexOf("Trạng thái") : hL.indexOf("Trang thai");
    var gvCol = hL.indexOf("Giáo Viên") !== -1 ? hL.indexOf("Giáo Viên") : -1;
    var classes = [];
    for (var i = 1; i < lopData.length; i++) {
      var st = String(lopData[i][statusCol] || "").toLowerCase();
      if (!st.includes("kết thúc") && !st.includes("xong") && !st.includes("hủy")) {
        var gv = gvCol >= 0 ? String(lopData[i][gvCol] || "") : "";
        classes.push("📚 " + lopData[i][maLopCol] + (gv ? " (GV: " + gv + ")" : ""));
      }
    }
    msg += "*Lớp đang mở (" + classes.length + "):*\n" + (classes.length > 0 ? classes.join("\n") : "Không có lớp") + "\n\n";
  }

  // Khách cần gọi
  var sheetCH = ss.getSheetByName("ChoHoc");
  if (sheetCH && sheetCH.getLastRow() > 1) {
    var chHeaders = sheetCH.getRange(1, 1, 1, sheetCH.getLastColumn()).getValues()[0];
    var chData = sheetCH.getDataRange().getValues();
    var todayMidnight = getMidnight(today);
    var calls = [];
    for (var i = 1; i < chData.length; i++) {
      if (String(chData[i][chHeaders.indexOf("Trạng thái")] || "") !== "Đang chăm sóc") continue;
      var ngay = getMidnight(safeParseDate(chData[i][chHeaders.indexOf("Ngày muốn học")]));
      if (ngay && ngay.getTime() <= todayMidnight.getTime()) {
        calls.push("📞 " + chData[i][chHeaders.indexOf("Họ Tên")] + " (" + chData[i][chHeaders.indexOf("SĐT")] + ")");
      }
    }
    if (calls.length > 0) msg += "*Khách cần gọi (" + calls.length + "):*\n" + calls.join("\n") + "\n\n";
  }

  if (msg.split("\n").length <= 3) msg += "✅ Không có việc cần làm hôm nay!";
  sendTelegramTo(chatId, msg);
}

function handleDoanhThu(chatId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetGD = ss.getSheetByName("GiaoDich");
  var today = new Date();
  var thisMonth = today.getMonth();
  var thisYear = today.getFullYear();

  var totalMonth = 0, countMonth = 0;
  var totalAll = 0;

  if (sheetGD && sheetGD.getLastRow() > 1) {
    var gdData = sheetGD.getDataRange().getValues();
    var headers = gdData[0];
    var amountCol = headers.indexOf("Số tiền");
    var dateCol = headers.indexOf("Thời gian");
    for (var i = 1; i < gdData.length; i++) {
      var amount = parseFloat(gdData[i][amountCol]);
      if (isNaN(amount) || amount <= 0) continue;
      totalAll += amount;
      var d = safeParseDate(gdData[i][dateCol]);
      if (d && d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        totalMonth += amount;
        countMonth++;
      }
    }
  }

  var monthName = "Tháng " + (thisMonth + 1) + "/" + thisYear;
  var msg = "💰 *DOANH THU — " + monthName + "*\n\n";
  msg += "📊 Thu tháng này: *" + totalMonth.toLocaleString('vi-VN') + "đ*\n";
  msg += "🧾 Số giao dịch: *" + countMonth + "*\n";
  msg += "💵 Tổng tất cả: *" + totalAll.toLocaleString('vi-VN') + "đ*\n";
  sendTelegramTo(chatId, msg);
}

function handleNhacNho(chatId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetCH = ss.getSheetByName("ChoHoc");
  var today = new Date();
  var todayMidnight = getMidnight(today);
  var threeDaysAgo = new Date(today.getTime() - 3 * 86400000);
  var alerts = [];

  if (sheetCH && sheetCH.getLastRow() > 1) {
    var chHeaders = sheetCH.getRange(1, 1, 1, sheetCH.getLastColumn()).getValues()[0];
    var chData = sheetCH.getDataRange().getValues();
    for (var i = 1; i < chData.length; i++) {
      if (String(chData[i][chHeaders.indexOf("Trạng thái")] || "") !== "Đang chăm sóc") continue;
      var ngay = getMidnight(safeParseDate(chData[i][chHeaders.indexOf("Ngày muốn học")]));
      if (ngay && ngay.getTime() <= threeDaysAgo.getTime()) {
        var days = Math.floor((todayMidnight.getTime() - ngay.getTime()) / 86400000);
        alerts.push("⏰ " + chData[i][chHeaders.indexOf("Họ Tên")] + " (" + chData[i][chHeaders.indexOf("SĐT")] + ") — " + days + " ngày");
      }
    }
  }

  var msg = "⏰ *NHẮC NHỞ FOLLOW-UP*\n\n";
  if (alerts.length > 0) {
    msg += "Khách chưa follow-up > 3 ngày:\n" + alerts.join("\n");
  } else {
    msg += "✅ Tất cả khách đã được follow-up!";
  }
  sendTelegramTo(chatId, msg);
}
