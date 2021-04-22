var express = require('express');
var app = express();
var path = require('path');

var server = require('http').createServer(app);
// http server를 socket.io server로 upgrade한다
var io = require('socket.io')(server);

const net = require('net')
const connection = net.connect({
    port: 8899,
    // host: '10.10.100.254'
    host: '192.168.10.40'
})

// localhost:3000으로 서버에 접속하면 클라이언트로 index.html을 전송한다
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use('/node_modules', express.static(path.join(__dirname, '/node_modules')));

io.on('connection', function(socket) {
    socket.on('getSerialData', function(){
        connection.setEncoding('utf8');
        connection.write('@01RW\r\n');
        setTimeout(function(){
            connection.write('@10RW\r\n');
        }, 500)
    })
    // 명령어 입력
    socket.on('command', function(data){
        console.log(data);

        var cmd = String(data.cmd) + '\r\n';
        connection.setEncoding('utf8');
        connection.write(cmd);
    })
    // force client disconnect from server
    socket.on('forceDisconnect', function() {
        socket.disconnect();
    })

    socket.on('disconnect', function() {
        console.log('Disconnected');
    });
});

// 시리얼 데이터 응답 받는 부분
connection.on('data', function(serialData){
    if(serialData == '' || serialData == null) {
        return;
    }

    // 결과값
    var result = {
        value: '',
        unit: ''
    }

    // if(!isStable(serialData)) {
    //     return;
    // }

    // 커맨드 응답인지 여부 확인
    if(isCommand(serialData)) {
        result.value = serialData;
        showResult(result, getDeviceNum(serialData));
        return;
    }

    // 단위가 카운트인지 무게인지 확인
    result.unit = 'g';
    if(isCount(serialData)) {
        result.unit = 'PC';
    }

    // 숫자값
    result.value = getValue(serialData);

    showResult(result, getDeviceNum(serialData));
    // io.emit('device1', result);
})

var showResult = function(result, deviceNum) {
    // 테스트 코드
    if(deviceNum == '01') {
        io.emit('device01', result);
        return;
    }

    if(deviceNum == '10') {
        io.emit('device10', result);
        return;
    }

    // 정석코드
    io.emit('device'+ deviceNum, result);
}

// 장치 번호 확인하는 함수
var getDeviceNum = function(data) {
    if(data == '' || data == null) {
        return '';
    }

    var deviceNum = data.substring(0,3);
    if(deviceNum == '' || deviceNum == null) {
        return '';
    }
    var result = deviceNum.replace('@', '');

    return result;
}

// 개수 단위인지 확인하는 함수
// PC - 개수
// g - 무게
var isCount = function(data) {
    if(data.search('PC') > 0) {
        return true;
    }
    return false;
}

// 안정,불안정 판정하는 함수
var isStable = function(data) {
    var arr = data.split(',');
    if(arr.length < 2) {
        return false;
    }

    var curStatus = arr[0];
    if(curStatus.search('US') > 0) {
        return false;
    }

    return true;
}

// 커맨드 명령어에 대한 답인지 아닌지 판단하는 함수
var isCommand = function(data) {
    var arr = data.split(',');
    if(arr.length < 2) {
        return true;
    }
    var curStatus = arr[0];
    if(curStatus.search('QT') > 0 || curStatus.search('WT') > 0 || curStatus.search('US') > 0) {
        return false;
    }
    return true;
}

// 값 추출하는 함수
var getValue = function(data) {
    var arr = data.split(',');
    if(arr.length < 2) {
        return 'error';
    }
    var splited = arr[1].split(' ');
    if(splited.length < 2) {
        return 'error';
    }

    var numValue = parseInt(splited[0]);
    var unit = splited[1];

    return numValue;
}

server.listen(3000, function() {
    console.log('Socket IO server listening on port 3000');
});
