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

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'sws3021t2_admin',
    password: 'U3o-V2q-A8n',
    database: 'sws3021t2'
});

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

var transform = (filename, outname) => {
    var loc = filename.split('.')[0];
    fs.mkdir('uploads/' + loc);
    fs.rename('uploads/' + filename, 'uploads/' + loc + '/' + filename);
    const adaptation_sets_config = 'id=0,streams=v id=1,streams=a';
    var proc = ffmpeg('uploads/' + loc + '/' + filename)
    .on('start', (command) => {
        console.log('fluent ffmpeg onStart: ', command);
    })
    .on('progress', (data) => {
        /// do stuff with progress data if you want
        console.log('ffmpeg progress: ', data);
    })
    .on('end', () => {
        /// encoding is complete, so callback or move on at this point
        console.log('ffmpeg FINISH!!!');
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
    .addOutputOptions([
        '-c:v libx264', '-g 90', '-keyint_min 90', '-force_key_frames expr:gte(t,n_forced*3)', '-map 0:v:0', '-map 0:v:0', '-map 0:v:0', '-map 0:v:0', '-map 0:a:0', '-map 0:a:0', '-b:v:0 700k', '-c:v:0 libx264', '-filter:v:0 scale=-2:240', '-r 30',
        '-b:v:0 1000k', '-c:v:0 libx264', '-filter:v:1 scale=-2:360', '-r 30',
        '-b:v:0 2000k', '-c:v:0 libx264', '-filter:v:2 scale=-2:480', '-r 30',
        '-b:v:0 4000k', '-c:v:0 libx264', '-filter:v:3 scale=-2:720', '-r 30',
        '-b:a:0 64k', '-c:a:0 aac',
        '-b:a:0 128k', '-c:a:0 aac',
        '-use_template 1', '-use_timeline 0', '-window_size 0',
        '-min_seg_duration 3000000', '-single_file 0'
    ])
    .addOutputOption('-adaptation_sets', adaptation_sets_config)
    .addOutputOption('-f', 'dash')
    .output('uploads/' + loc + '/' + outname)
    .run();

};