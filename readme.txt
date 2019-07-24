1. install dependencies: npm install
2. create mysql database sws3021t2: create table name(name varchar(100), uuid varchar(100), primary key (uuid));
2. run our code: node demo.js
3. to use our service, visit: http://monterosa.d2.comp.nus.edu.sg:8000

name:
    Zeng Hui 20190042
    Li Sicong 20190030
    Dong Boyu 20190044
    Yan Xutianren 20190046
username:
    SWS3021T2

demo.js
    -our main server code, which processes the original video with ffmpeg and provides data from mysql to the website as json
uploads/
    -the folder where all our file(.mpd .m4s .jpg, etc) saved in.
dash-player/
    index.html
        -our website UI
    app/
        css/
        fonts/
        img/
            -the static file for our web
        rules/ElasticRule.js
            -our ABR rule
        lib/
            -some lib including dash, angular, etc
