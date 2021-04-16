var app = require('express')();
var server = require('http').createServer(app);
// http server를 socket.io server로 upgrade한다
var io = require('socket.io')(server);

const net = require('net')
const connection = net.connect({
    port: 8899,
    host: '192.168.10.40'
})


// localhost:3000으로 서버에 접속하면 클라이언트로 index.html을 전송한다
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    socket.on('getSerialData', function(){
        connection.setEncoding('utf8');
        connection.write('@99RW\r\n');
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

    // 커맨드 응답인지 여부 확인
    if(isCommand(serialData)) {
        result.value = serialData;
        io.emit('device1', result);
        return;
    }

    // 단위가 카운트인지 무게인지 확인
    result.unit = 'g';
    if(isCount(serialData)) {
        result.unit = 'PC';
    }

    // 숫자값
    result.value = getValue(serialData);

    io.emit('device1', result);
})

// 개수 단위인지 확인하는 함수
// PC - 개수
// g - 무게
var isCount = function(data) {
    if(data.search('PC') > 0) {
        return true;
    }
    return false;
}

// 커맨드 명령어에 대한 답인지 아닌지 판단하는 함수
var isCommand = function(data) {
    var arr = data.split(',');
    if(arr.length < 2) {
        return true;
    }
    var curStatus = arr[0];
    if(curStatus.search('QT') > 0 || curStatus.search('WT') > 0) {
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
