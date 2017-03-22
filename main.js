// Include modules, setting and options
const fs 	= require('fs');
const redis = require('redis');
const mysql = require('mysql');
const schedule  = require('node-schedule');
const login = require('facebook-chat-api');

const options	= require('./optionMain.js');
const conf 		= JSON.parse(process.env.testconfig || fs.readFileSync('./config.json', 'utf8'));

// Init facebook account
var credentials = {
    email: conf.user.email,
    password: conf.user.password
};

var pages = {
    pageID: conf.pageID
};

// Init and connect mysql server
var connection = mysql.createConnection({
    host: conf.database.host,
    user: conf.database.user,
    password: conf.database.password,
    database: conf.database.db
});

// Connect redisDB
redisDB = redis.createClient();

var alertSubject; // Init global variable for save rows;
redisDB.set('updateData', '1');

login(credentials, pages, (err, api) => {
    if (err) return console.error(err);

	// redisDB.del('1682209248'); // User Admin

    api.listen((err, message) => {
    	redisDB.hgetall(message.threadID, function(err, obj) {
		    if(!obj) {
				console.log('Create new user');

				obj = {'state': '0', 'step': '0'};
		    	redisDB.hmset(message.threadID, 'state', '0', 'step', '0');
				options.register(api, connection, message.threadID);
		    }

		if (message.body == 'สวัสดี' || message.body == 'สวัสดีครับ' || message.body == 'สวัสดีค่ะ') {
	            api.sendMessage('สวัสดีครับ ยินดีที่ได้รู้จัก\nกระผมพร้อมช่วยเหลือคุณในการแจ้งเตือนงานที่ต้องทำในแต่ละวัน ตรวจสอบสิ่งที่ผมสามารถทำได้โดยการพิมพ์ "รายการคำสั่ง" แล้วกดส่ง ครับผม', message.threadID);
	        } else if (message.body == 'ยกเลิก') {
				obj = {'state': '0', 'step': '0'};
		    	options.setDefault(redisDB, message.threadID);
				api.sendMessage('ยกเลิก เรียบร้อย!', message.threadID);
			} else if (message.body == 'เพิ่มวิชา' || obj.state == '1') {
	            options.addSubject(api, connection, redisDB, message.threadID, obj.step, message.body);
	        } else if (message.body == 'ลบวิชา' || obj.state == '11') {
	            options.removeSubject(api, connection, redisDB, message.threadID, obj.step, message.body);
	        } else if (message.body == 'ลบวิชาทั้งหมด') {
	            options.removeSubjectAll(api, connection, message.threadID);
	        } else if (message.body == 'รายชื่อวิชา' || obj.state == '13') {
	            options.subjectList(api, connection, message.threadID);
	        } else if (message.body == 'เพิ่มงาน' || obj.state == '2') {
	            options.addJob(api, connection, redisDB, message.threadID, obj.step, message.body);
	        } else if (message.body == 'ลบงาน' || obj.state == '21') {
	            options.removeJob(api, connection, redisDB, message.threadID, obj.step, message.body);
	        } else if (message.body == 'ลบงานทั้งหมด') {
	            options.removeJobAll(api, connection, message.threadID);
	        } else if (message.body == 'รายการงาน') {
	            options.jobList(api, connection, message.threadID);
	        } else if (message.body == 'เปิดแจ้งเตือน') {
	            options.alertOn(api, connection, message.threadID);
	        } else if (message.body == 'ปิดแจ้งเตือน') {
	            options.alertOff(api, connection, message.threadID);
	        } else if (message.body == 'รายการคำสั่ง') {
	            options.showCommand(api, connection, message.threadID);
	        } else {
	            api.sendMessage('ขอโทษนะครับ เราไม่เข้าใจข้อความของคุณ\nสามารถตรวจสอบคำสั่งที่รองรับโดยการพิมพ์ "รายการคำสั่ง"', message.threadID);
	        }
		});
    });

	schedule.scheduleJob('*/10 * * * *', function(){
        redisDB.get('updateData', function(err, reply) {
            if(reply == '1') {
                console.log('Update Data!');
                redisDB.set('updateData', '0');

                connection.query('SELECT userID, name, stopTime, day FROM subject WHERE userID IN (SELECT userID FROM user WHERE alertMode = 1)', function(err, rows) {
                    if (!err) {
                        if(rows != '') {
                            alertSubject = rows;

                            options.onAlertSubject(api, rows);
                        }
                    } else {
                        options.errorReport(api, err);
                    }
                });
            } else {
				console.log('Run Schedule.');
                options.onAlertSubject(api, alertSubject);
            }
        });
    });

	schedule.scheduleJob('0 7 * * *', function(){
		options.onAlertJob(api, connection);
	});

	schedule.scheduleJob('0 17 * * *', function(){
		options.onAlertJobToDay(api, connection);
	});
});
