module.exports = {
    errorReport: function(api, err, threadID) {
        api.sendMessage('ดูเหมือนตอนนี้ระบบมีปัญหาบางอย่าง ไว้มาใหม่นะครับ', threadID);
        console.log(err);
    },
    register: function(api, connection, threadID) {
        connection.query('SELECT userID from user WHERE userID = ? LIMIT 1', [threadID], function(err, rows, fields) {
            if (!err) {
                if (rows == '') {
                    connection.query('INSERT INTO user (userID) VALUES (?)', [threadID], function(err) {
                        if (!err) {
                            api.sendMessage('สวัสดีครับ ยินดีที่ได้รู้จักนะครับ :)', threadID);
                        } else {
                            errorReport(api, err, threadID);
                        }
                    });
                } else {
                    api.sendMessage('สวัสดีครับ เจอกันอีกแล้วนะครับ? ^_^', threadID);
                }
            } else {
                errorReport(api, err, threadID);
            }
        });
    },
    addSubject: function(api, connection, threadID, state) {
        api.sendMessage('รบกวนกรอก ชื่อ, เวลาเริ่ม, เวลาสิ้นสุด ของวิชา เช่น\n คอมพิวเตอร์,13.00,14.30', threadID);
        api.listen(err, message) {
            name = message.body;
            connection.query('SELECT name from subject WHERE name = ? LIMIT 1', [name], function(err, rows, fields) {
                if (!err) {
                    if (rows == '') {
                        api.sendMessage('เริ่มเรียนกี่โมง?', threadID);
                        api.listen((err, message) => {
                            startTime = message.body;
                            api.listen((err, message) => {
                                stopTime = message.body;
                                return;
                            });
                            return;
                        });
                    } else {
                        api.sendMessage('วิชานี้มีในระบบแล้วครับ', threadID);
                    }
                } else {
                    errorReport(api, err, threadID);
                }
            });
            return;
        };
    },
    addJob: function(api, connection, message, threadID, state) {
        connection.query('SELECT name from job WHERE name = ? LIMIT 1', [message], function(err, rows, fields) {
            if (!err) {
                if (rows == '') {
                    connection.query('INSERT INTO user (userID) VALUES (?)', [threadID], function(err) {
                        if (!err) {
                            api.sendMessage('สวัสดีครับ ยินดีที่ได้รู้จักนะครับ :)', threadID);
                        } else {
                            errorReport(api, err, threadID);
                        }
                    });
                } else {
                    api.sendMessage('สวัสดีครับ เจอกันอีกแล้วนะครับ? ^_^', threadID);
                }
            } else {
                errorReport(api, err, threadID);
            }
        });
    }
};