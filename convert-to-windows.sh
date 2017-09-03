#!/usr/bin/env bash

in=$1
out=`echo $in | sed -e 's/.xml/-windows.xml/'`

iconv -f utf-8 -t windows-1251 $in | sed -e 's/?>/ encoding="Windows-1251"?>/' > $out
