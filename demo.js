var express = require('express')
var multer  = require('multer')
var uuid = require('uuid')
var callfile = require('child_process')
var FILE_ROOT =  'uploads/'

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, FILE_ROOT),
    filename: (req, file, cb) => {
      console.log(file);
      cb(null, `${uuid.v4()}.${file.mimetype.split('/')[1]}`);
    },
  }
);

var upload = multer({storage})

var app = express();



app.post('/upload_video', upload.single('upload'), function(req, res, next){
    var filename = req.file['filename'];
    var outname = req.file['originalname'].split('.')[0]+'.mpd';

    callfile.execFile('./uploads/trans.sh',['-f', filename, '-o', outname],null,function (err, stdout, stderr) {
        console.log(stdout);
    });
    var url="http://137.132.92.142:8000/lsc/uploads/"+filename.split('.')[0]+"/"+outname;
    res.json({url:url});
});

app.get('/', function (req, res) {
    res.sendFile( __dirname + "/" + "up_video.html" );
})

var server = app.listen(8081, function () {
    console.log("running...") 
})
