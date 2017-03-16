// Include modules, setting and options
const login = require('facebook-chat-api');
const mysql = require('mysql');
const fs = require('fs');
const options = require('./option.js');
const conf = JSON.parse(process.env.testconfig || fs.readFileSync('./config.json', 'utf8'));

// Init facebook account
var credentials = {
    email: conf.user.email,
    password: conf.user.password
};

var pages = {
    pageID: conf.pageID
};

// Init mysql server
var connection = mysql.createConnection({
    host: conf.database.host,
    user: conf.database.user,
    password: conf.database.password,
    database: conf.database.db
});

login(credentials, pages, (err, api) => {
    if (err) return console.error(err);

    api.listen((err, message) => {
        if (message.body == 'สวัสดี' || message.body == 'สวัสดีครับ' || message.body == 'สวัสดีค่ะ') {
            options.register(api, connection, message.threadID);
        } else if (message.body == 'เพิ่มวิชา') {
            options.addSubject(api, connection, message.threadID);
        } else if (message.body == 'ลบวิชา') {
            // options.removeSubject(api, connection, message.threadID);
        } else if (message.body == 'ลบวิชาทั้งหมด') {
            // options.removeSubjectAll(api, connection, message.threadID);
        } else if (message.body == 'เพิ่มงาน') {
            options.addJob(api, connection, message.threadID);
        } else if (message.body == 'ลบงาน') {
            // options.removeJob(api, connection, message.threadID);
        } else if (message.body == 'ลบงานทั้งหมด') {
            // options.removeJobAll(api, connection, message.threadID);
        } else if (message.body == 'เช็ควิชา') {
            // options.checkSubject(api, connection, message.threadID);
        } else if (message.body == 'เช็คงานค้าง') {
            // options.checkJob(api, connection, message.threadID);
        } else if (message.body == 'เปิดแจ้งเตือน') {
            // options.alertOn(api, connection, message.threadID);
        } else if (message.body == 'ปิดแจ้งเตือน') {
            // options.alertOff(api, connection, message.threadID);
        } else {
            api.sendMessage('ขอโทษนะครับ ผมไม่เข้าใจว่าคุณต้องการอะไร', message.threadID);
        }
    });
});