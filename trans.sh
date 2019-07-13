#!/bin/sh

FILE_NAME=""
OUTPUT_NAME=""
while getopts "f:o:" arg
do
    case $arg in
        f)
            FILE_NAME=$OPTARG
            ;;
        o)
            OUTPUT_NAME=$OPTARG
            ;;
        ?)
            echo "parameters error!"
            exit 1
            ;;
    esac
done


LOC=${FILE_NAME%%.*}
mkdir $LOC
mv $FILE_NAME ./$LOC
cd $LOC

# 视频转 DASH manifest
ffmpeg -hide_banner -y -i $FILE_NAME \
  -c:v libx264 -g 90 -keyint_min 90 -force_key_frames "expr:gte(t,n_forced*3)" \
  -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:v:0 -map 0:a:0 -map 0:a:0 \
  -b:v:0 700k -c:v:0 libx264 -filter:v:0 "scale=-2:240" -r 30 \
  -b:v:1 1000k -c:v:0 libx264 -filter:v:1 "scale=-2:360" -r 30 \
  -b:v:2 2000k -c:v:1 libx264 -filter:v:2 "scale=-2:480" -r 30 \
  -b:v:3 4000k -c:v:2 libx264 -filter:v:3 "scale=-2:720" -r 30 \
  -b:a:0 64k -c:a:0 aac \
  -b:a:1 128k -c:a:1 aac \
  -use_template 1 -use_timeline 0 -window_size 0 -min_seg_duration 3000000 -single_file 0 -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -f dash $OUTPUT_NAME

echo "finished."