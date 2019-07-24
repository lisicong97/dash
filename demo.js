var express = require('express');
var multer  = require('multer');
var uuid = require('uuid');
var callfile = require('child_process');
var fs = require('fs');
var ffmpeg = require('fluent-ffmpeg');
var FILE_ROOT =  'uploads/';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, FILE_ROOT),
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, `${uuid.v4()}.${file.mimetype.split('/')[1]}`);
    },
});

var upload = multer({storage});
var app = express();
var http = require('http').createServer(app);
var sockets = new Array();

app.use(express.static('dash-player'));
app.use('/uploads',express.static('uploads'));

var io = require('socket.io')(http);
io.on('connection', function(socket){
    socket.emit('progress', 'start');
	console.log(socket['handshake']['address']);
    sockets[socket['handshake']['address']]=socket;
});

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'sws3021t2_admin',
    password: 'U3o-V2q-A8n',
    database: 'sws3021t2'
});

var splitLast = (str) => {
    return str.substring(0, str.lastIndexOf('.'));
}

var insert = (uuid, outname) => {
    var insert_sql = 'INSERT INTO name(uuid, name) VALUES(?, ?)';
    var insert_sql_params = [uuid, outname];
    connection.query(insert_sql, insert_sql_params, (err, result) => {
        if(err){
            console.log('[INSERT ERROR] -', err.message);
            return;
        }
        console.log(result);
    });
}

var transform = (filename, outname, client) => {
    var loc = splitLast(filename);
    fs.mkdirSync('uploads/' + loc);
    fs.renameSync('uploads/' + filename, 'uploads/' + loc + '/' + filename);
    const adaptation_sets_config = 'id=0,streams=v id=1,streams=a';
    var proc = ffmpeg('uploads/' + loc + '/' + filename)
    .on('start', (command) => {
        console.log('fluent ffmpeg onStart: ', command);
    })
    .on('progress', (data) => {
        /// do stuff with progress data if you want

        //console.log(socket_dict[0]);
        sockets[client].emit('progress',data['percent']);
        console.log(data['percent']);
    })
    .on('end', () => {
        /// encoding is complete, so callback or move on at this point
        console.log('ffmpeg FINISH!!!');

        //console.log(socket_dict[0]);
        //for (var i =0; i < sockets.length; i++)
        sockets[client].emit('progress', 100);
        console.log(100);
    })
    .on('error', function (err, stdout, stderr) {
        console.log(err.message);
        console.log(stdout);
        console.log(stderr);
    })
    .inputOptions([
        '-hide_banner',
        '-y'
    ])
    .addOutputOption('-force_key_frames', 'expr:gte(t,n_forced*3)')
    .addOutputOptions([
        '-map 0:v:0', '-map 0:v:0', '-map 0:v:0', '-map 0:v:0', '-map 0:a:0', '-map 0:a:0', 
        '-b:v:0 700k', '-c:v:0 libx264', '-g 90', '-keyint_min 90', '-filter:v:0 scale=-2:240', '-r 30',
        '-b:v:1 1000k', '-c:v:1 libx264', '-g 90', '-keyint_min 90', '-filter:v:1 scale=-2:360', '-r 30',
        '-b:v:2 2000k', '-c:v:2 libx264', '-g 90', '-keyint_min 90', '-filter:v:2 scale=-2:480', '-r 30',
        '-b:v:3 4000k', '-c:v:3 libx264', '-g 90', '-keyint_min 90', '-filter:v:3 scale=-2:720', '-r 30',
        '-b:a:0 64k', '-c:a:0 aac',
        '-b:a:1 128k', '-c:a:1 aac',
        '-use_template 1', '-use_timeline 0', '-window_size 0',
        '-min_seg_duration 3000000', '-single_file 0'
    ])
    .addOutputOption('-adaptation_sets', adaptation_sets_config)
    .addOutputOption('-f', 'dash')
    .output('uploads/' + loc + '/' + outname)
    .run();

};

var getThumbnail = (filename, outname) => {
    const loc = splitLast(filename);
    const picName = splitLast(outname);
    const ffmpegProc = ffmpeg('uploads/' + loc + '/' + filename)
    .on('start', (command) => {
        console.log('fluent ffmpeg getThumbnail start: ', command);
    })
    .on('end', () => {
        /// encoding is complete, so callback or move on at this point
        console.log('ffmpeg getThumbnail finish');
    })
    .on('error', (err, stdout, stderr) => {
        console.log(err.message);
        console.log(stdout);
        console.log(stderr);
    })
    .inputOptions([
        '-hide_banner',
        '-y'
    ])
    .addOutputOption('-vf', 'thumbnail,scale=640:360')
    .addOutputOption('-frames:v', '1')
    .output('uploads/' + loc + '/' + picName + '.jpg')
    .run();
}

app.post('/upload_video', upload.single('upload'), function(req, res, next){
    console.log('begin post function');
    var filename = req.file.filename;
    var outname = splitLast(req.file.originalname) + '.mpd';
    getThumbnail(filename, outname);
    let client = req.connection.remoteAddress;
    transform(filename, outname,client);
    console.log(client);
    insert(splitLast(filename), outname);
    var url="./uploads/"+splitLast(filename)+"/"+outname;
    res.json({url:url});
});

app.get('/video_list', function (req, res) {
    var select_sql = 'SELECT * FROM name';
    var ret = new Array();
    connection.query(select_sql, (err, results, fields) => {
        if (err) {
            console.log('[SELECT ERROR] -', err.message);
            return;
        };
        console.log(results);
        for (var i=0; i<results.length; i++) {
            var url="/uploads/"+results[i].uuid+"/"+splitLast(results[i].name);
            var name=splitLast(results[i].name);
        var tem = {name: name, url:url};
            ret.push(tem);
        }
    res.json(ret);
    });
});

var server = http.listen(8000, function () {
    console.log("running...");
});
