const moment    = require('moment');

var self = module.exports = {
    setDefault: function(redisDB, threadID) {
        redisDB.hmset(threadID, 'state', '0', 'step', '0');
    },
    errorReport: function(api, err, threadID) {
        api.sendMessage('ดูเหมือนตอนนี้ระบบมีปัญหาบางอย่าง ทางเราจะแจ้งอีกครั้งเมื่อแก้ไขสำเร็จ ขออภัยในความไม่สะดวกด้วยครับ', threadID);
        api.sendMessage('[Alert] '+moment().format('MMMM Do YYYY, h:mm:ss a')+'\nUser: '+ threadID +' พบปัญหา\n'+err, '1682209248');
        // console.log(err);
    },
    scheduleErrorReport: function(api, err) {
        api.sendMessage('[Alert] '+moment().format('MMMM Do YYYY, h:mm:ss a')+'\nระบบแจ้งเตือนพบปัญหา\n'+err, '1682209248');
        // console.log(err);
    },
    formatTime: function(message) {
        var temp = message.split(".");
        var time = temp[0]+':'+temp[1]+':00';

        return time;
    },
    formatDate: function(message) {
        var temp = message.split("/");
        var date = (temp[2]-543) + '-' + temp[1] + '-' + temp[0];

        return date;
    },
    thaiDate: function(date) {
        var temp = date.split("/");
        var date = temp[0] + '/' + temp[1] + '/' + (parseInt(temp[2], 10)+543);

        return date;
    },
    getTime: function() {
        var time = {'day': '','hour': '', 'minute': ''};
        time.day = (parseInt(moment().format('d'),10)+7)%7;
        time.hour = moment().format('HH');
        time.minute = moment().format('mm');

        return time;
    },
    getDate: function() {
        var date = {'day': '', 'month': '', 'year': ''};

        date.day = moment().format('DD');
        date.month = moment().format('MM');
        date.year = moment().format('YYYY');

        return date;
    },
    register: function(api, connection, threadID) {
        connection.query('SELECT userID FROM user WHERE userID = ? LIMIT 1', [threadID], function(err, rows) {
            if (!err) {
                if (rows == '') {
                    connection.query('INSERT INTO user (userID) VALUES (?)', [threadID], function(err) {
                        if (!err) {
                            api.sendMessage('สวัสดีครับ ยินดีที่ได้รู้จักนะครับ :)', threadID);
                        } else {
                            self.errorReport(api, err, threadID);
                        }
                    });
                }
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    addSubject: function(api, connection, redisDB, threadID, step, message) {
        if(step == 0) {
            redisDB.hmset(threadID, 'state', '1', 'step', '1');
            api.sendMessage('ชื่อวิชาที่ต้องการเพิ่มคือ?', threadID);
        } else if(step == 1) {
            redisDB.hmset(threadID, 'step', '2');
            redisDB.hmset('subject'+threadID, 'name', message);
            api.sendMessage('เริ่มเรียนเวลา? เช่น 08.00 หรือ 14.30 เป็นต้น', threadID);
        } else if(step == 2) {
            redisDB.hmset(threadID, 'step', '3');
            redisDB.hmset('subject'+threadID, 'startTime', self.formatTime(message));
            api.sendMessage('เลิกเรียนเวลา? เช่น 09.30 หรือ 16.00 เป็นต้น', threadID);
        } else if(step == 3) {
            redisDB.hmset(threadID, 'step', '4');
            redisDB.hmset('subject'+threadID, 'stopTime', self.formatTime(message));
            api.sendMessage('เรียนวันไหนบ้าง?\nเช่น จันทร์ พิมพ์ 1\n อังคาร พิมพ์ 2 ตามลำดับ\n ถ้าเรียนทั้งจันทร์และอังคาร พิมพ์ 12', threadID);
        } else if(step == 4) {
            self.setDefault(redisDB, threadID);
            if(message < 8) {
                message *= 10;
            }
            redisDB.hmset('subject'+threadID, 'day', message);

            redisDB.hgetall('subject'+threadID, function(err, obj) {
                if(!err) {
                    connection.query('SELECT name FROM subject WHERE name = ? LIMIT 1', [obj.name], function(err, rows) {
                        if (!err) {
                            if (rows == '') {
                                connection.query('INSERT INTO subject (name, startTime, stopTime, day, userID) VALUES (?, ?, ?, ?, ?)', [obj.name, obj.startTime, obj.stopTime, obj.day, threadID], function(err) {
                                    if (!err) {
                                        api.sendMessage('เพิ่มข้อมูลเรียบร้อยแล้ว (Y)', threadID);
                                        redisDB.del('subject'+threadID);
                                        redisDB.set('updateData', '1');
                                    } else {
                                        self.errorReport(api, err, threadID);
                                    }
                                });
                            } else {
                                api.sendMessage('ขออภัย คุณเพิ่มวิชานี้ไปแล้วครับ', threadID);
                            }
                        } else {
                            self.errorReport(api, err, threadID);
                        }
                    });
                }
            });
        }
    },
    removeSubject: function(api, connection, redisDB, threadID, step, message) {
        if(step == 0) {
            redisDB.hmset(threadID, 'state', '11', 'step', '1');
            api.sendMessage('ชื่อวิชาที่ต้องการลบคือ?', threadID);
        } else if(step == 1) {
            self.setDefault(redisDB, threadID);
            connection.query('SELECT name FROM subject WHERE name = ? LIMIT 1', [message], function(err, rows) {
                if (!err) {
                    if (rows != '') {
                        connection.query('DELETE FROM subject WHERE subject.name = ? AND userID = ?', [message, threadID], function(err) {
                            if (!err) {
                                api.sendMessage('ลบวิชาเรียบร้อยแล้ว (Y)', threadID);
                                redisDB.set('updateData', '1');
                            } else {
                                self.errorReport(api, err, threadID);
                            }
                        });
                    } else {
                        api.sendMessage('ไม่พบวิชาที่คุณต้องการลบ', threadID);
                    }
                } else {
                    self.errorReport(api, err, threadID);
                }
            });
        }
    },
    removeSubjectAll: function(api, connection, redisDB, threadID) {
        connection.query('DELETE FROM subject WHERE userID = ?', [threadID], function(err) {
            if (!err) {
                api.sendMessage('ลบวิชาทั้งหมดเรียบร้อยแล้ว (Y)', threadID);
                redisDB.set('updateData', '1');
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    subjectList: function(api, connection, threadID) {
        connection.query('SELECT name FROM subject WHERE userID = ?', [threadID], function(err, rows) {
            if (!err) {
                if(rows != '') {
                    var message = 'ข้อมูลวิชาทั้งหมดของคุณได้แก่\n';

                    for (var i in rows) {
                        var j = parseInt(i) + 1;
                        message += j + '. ' + rows[i].name + '\n';
                    }

                    api.sendMessage(message, threadID);
                }
                else {
                    api.sendMessage('คุณยังไม่มีข้อมูลวิชาในระบบ', threadID);
                }
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    addJob: function(api, connection, redisDB, threadID, step, message) {
        if(step == 0) {
            redisDB.hmset(threadID, 'state', '2', 'step', '1');
            api.sendMessage('เป็นงานของวิชาอะไร?', threadID);
        } else if(step == 1) {
            redisDB.hmset(threadID, 'step', '2');
            redisDB.hmset('job'+threadID, 'subjectName', message);
            api.sendMessage('ต้องทำอะไรบ้าง?', threadID);
        } else if(step == 2) {
            redisDB.hmset(threadID, 'step', '3');
            redisDB.hmset('job'+threadID, 'description', message);
            api.sendMessage('ส่งเมื่อไหร่?\n(เขียนในรูปแบบ วัน/เดือน/ปี เช่น 30/2/2560)', threadID);
        } else if(step == 3) {
            self.setDefault(redisDB, threadID);
            var addDate = moment().format('YYYY-MM-DD');
            var duoDate = self.formatDate(message);

            redisDB.hgetall('job'+threadID, function(err, obj) {
                if(!err) {
                    connection.query('SELECT subjectID FROM subject WHERE name = ? LIMIT 1', [obj.subjectName], function(err, rows) {
                        if (!err) {
                            if (rows != '') {
                                connection.query('INSERT INTO job (description, addDate, duoDate, userID, subjectID) VALUES (?, ?, ?, ?, ?)', [obj.description, addDate, duoDate, threadID, rows[0].subjectID], function(err, result) {
                                    if (!err) {
                                        api.sendMessage('เพิ่มงานหมายเลข '+ result.insertId +' เรียบร้อย (Y)\n(หมายเลขงาน มีไว้สำหรับขั้นตอนลบงาน ตรวจตรวจหมายเลขงานภายหลังได้ที่คำสั่ง \"รายการงาน\")', threadID);
                                        redisDB.del('job'+threadID);
                                        redisDB.set('updateData', '1');
                                    } else {
                                        self.errorReport(api, err, threadID);
                                        console.log(err);
                                    }
                                });
                            } else {
                                api.sendMessage('ขออภัย ไม่พบวิชาที่ต้องการเพิ่มงาน', threadID);
                            }
                        } else {
                            self.errorReport(api, err, threadID);
                        }
                    });
                }
            });
        }
    },
    removeJob: function(api, connection, redisDB, threadID, step, message) {
        if(step == 0) {
            redisDB.hmset(threadID, 'state', '21', 'step', '1');
            api.sendMessage('กรอกหมายเลขงานที่ต้องการลบ\n(ตรวจตรวจหมายเลขงานได้ที่คำสั่ง \"รายการงาน\")', threadID);
        } else if(step == 1) {
            self.setDefault(redisDB, threadID);
            connection.query('SELECT jobID FROM job WHERE jobID = ? LIMIT 1', [message], function(err, rows) {
                if (!err) {
                    if (rows != '') {
                        connection.query('DELETE FROM job WHERE jobID = ?', [message], function(err) {
                            if (!err) {
                                api.sendMessage('ลบงานเรียบร้อยแล้ว (Y)', threadID);
                                redisDB.set('updateData', '1');
                            } else {
                                self.errorReport(api, err, threadID);
                            }
                        });
                    } else {
                        api.sendMessage('ไม่พบงานที่คุณต้องการลบ', threadID);
                    }
                } else {
                    self.errorReport(api, err, threadID);
                }
            });
        }
    },
    removeJobAll: function(api, connection, redisDB, threadID) {
        connection.query('DELETE FROM job WHERE userID = ?', [threadID], function(err) {
            if (!err) {
                api.sendMessage('ลบงานทั้งหมดเรียบร้อยแล้ว (Y)', threadID);
                redisDB.set('updateData', '1');
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    jobList: function(api, connection, threadID) {
        connection.query('SELECT job.jobID, job.description, subject.name, DATE_FORMAT(job.duoDate, \'%d/%m/%Y\') AS duoDate  FROM job JOIN subject ON job.subjectID = subject.subjectID WHERE job.userID = ? ORDER BY job.jobID', [threadID], function(err, rows) {
            if (!err) {
                if(rows != '') {
                    var message = 'คุณมีงานค้างทั้งหมดได้แก่\n';

                    for (var i in rows) {
                        message += '---------------\n';
                        message += 'หมายเลข: '+ rows[i].jobID + '\n วิชา: ' + rows[i].name + '\n รายละเอียด: ' + rows[i].description + '\n กำหนดส่ง: ' + self.thaiDate(rows[i].duoDate) + '\n';
                    }

                    api.sendMessage(message, threadID);
                }
                else {
                    api.sendMessage('ดีใจด้วย คุณไม่มีงานค้างอะไรเลย ^_^', threadID);
                }
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    jobListToDay: function(api, connection, threadID) {
        var addDate = moment().format('YYYY-MM-DD');

        connection.query('SELECT job.jobID, job.description, subject.name, DATE_FORMAT(job.duoDate, \'%d/%m/%Y\') AS duoDate  FROM job JOIN subject ON job.subjectID = subject.subjectID WHERE job.userID = ? AND addDate = ? ORDER BY job.jobID', [threadID, addDate], function(err, rows) {
            if (!err) {
                if(rows != '') {
                    var message = 'งานที่คุณเพิ่มในวันนี้ได้แก่\n';

                    for (var i in rows) {
                        message += '---------------\n';
                        message += 'หมายเลข: '+ rows[i].jobID + '\n วิชา: ' + rows[i].name + '\n รายละเอียด: ' + rows[i].description + '\n กำหนดส่ง: ' + self.thaiDate(rows[i].duoDate) + '\n';
                    }

                    api.sendMessage(message, threadID);
                }
                else {
                    api.sendMessage('วันนี้คุณไม่ได้เพิ่มงานใด ๆ เลย', threadID);
                }
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    alertOn: function(api, connection, threadID) {
        connection.query('UPDATE user SET alertMode = \'1\' WHERE userID = ?', [threadID], function(err) {
            if (!err) {
                api.sendMessage('เปิดการแจ้งเตือนเรียบร้อย!', threadID);
                redisDB.set('updateData', '1');
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    alertOff: function(api, connection, threadID) {
        connection.query('UPDATE user SET alertMode = \'0\' WHERE userID = ?', [threadID], function(err) {
            if (!err) {
                api.sendMessage('ปิดการแจ้งเตือนเรียบร้อย!', threadID);
                redisDB.set('updateData', '1');
            } else {
                self.errorReport(api, err, threadID);
            }
        });
    },
    showCommand: function(api, connection, threadID) {
        var message = 'คำสั่งทั้งหมดที่สามารถใช้ได้ตอนนี้ มีดังนี้\n';
        message += '\nคำสั่งหมวดวิชา: \n------------------------------\n เพิ่มวิชา, รายชื่อวิชา, ลบวิชา, ลบวิชาทั้งหมด\n';
        message += '\nคำสั่งหมวดงาน\n------------------------------\n เพิ่มงาน, รายการงาน, ลบงาน, ลบงานทั้งหมด\n(หมายเหตุ: ต้องทำการเพิ่มวิชาก่อนจึงจะสามารถเพิ่มงานได้)\n';
        message += '\nคำสั่งหมวดแจ้งเตือน\n------------------------------\n เปิดการแจ้งเตือน, ปิดการแจ้งเตือน\n';
        message += '\n------------------------------\n หากต้องการยกเลิกการทำงานกลางคัน พิมพ์\n"ยกเลิก"';

        api.sendMessage(message, threadID);
    },
    onAlertSubject: function(api, data) {
        console.log('onAlertSubject is running!');

        var time = self.getTime();

        for(var i in data) {
            var stopTime = (data[i].stopTime).split(":");
            var day = [data[i].day[0], data[i].day[1]];

            if(time.hour == stopTime[0] && time.minute == stopTime[1] && (time.day == day[0] || time.day == day[1])) {
                api.sendMessage('เรียนวิชา' + data[i].name + ' เสร็จแล้วใช่ไหม วันนี้มีงานอะไรหรือเปล่า?', data[i].userID);
            }
        }
    },
    onAlertJob: function(api, connection) {
        console.log('onAlertJob is running!');

        connection.query('SELECT userID FROM user WHERE alertMode = 1', function(err, rows) {
            if (!err) {
                if(rows != '') {
                    for(var i in rows) {
                        self.jobList(api, connection, rows[i].userID);
                    }
                }
            } else {
                self.errorReport(api, err);
            }
        });
    },
    onAlertJobToDay: function(api, connection) {
        console.log('onAlertJobToDay is running!');

        connection.query('SELECT userID FROM user WHERE alertMode = 1', function(err, rows) {
            if (!err) {
                if(rows != '') {
                    for(var i in rows) {
                        self.jobListToDay(api, connection, rows[i].userID);
                    }
                }
            } else {
                self.errorReport(api, err);
            }
        });
    }
};
