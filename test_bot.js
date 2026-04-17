const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = "8787082327:AAHanlCOSCeeMU4Q_JtIf1bY1d8dISO65tk";
const chatId = "-5238009332";
const helpText = "📋 *HƯỚNG DẪN BOT ORI ACADEMY*\n\n" +
    "🔍 Tìm kiếm: `/timkiem 09xxxxxxxx`\n\n" +
    "📝 Cập nhật CCCD:\n`/capnhat 09xxx cccd 079204001234`\n\n" +
    "📝 Cập nhật Email:\n`/capnhat 09xxx email abc@gmail.com`\n\n" +
    "📝 Cập nhật cả 2:\n`/capnhat 09xxx cccd 079204001234 email abc@gmail.com`\n\n" +
    "📊 Báo cáo: `/baocao`\n" +
    "🔧 Kiểm tra: `/debug`";

fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: helpText, parse_mode: "Markdown" })
})
.then(res => res.json())
.then(json => console.log(json))
.catch(err => console.error(err));
