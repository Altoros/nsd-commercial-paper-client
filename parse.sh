#!/usr/bin/env bash

filename=$1

cat ${filename} | jq -r .alamedaFrom > "$filename-alamedaFrom.xml"
cat ${filename} | jq -r .alamedaTo > "$filename-alamedaTo.xml"
cat ${filename} | jq -r .alamedaSignatureFrom | base64 -d - > "$filename-alamedaSignatureFrom.xml"
cat ${filename} | jq -r .alamedaSignatureTo | base64 -d - > "$filename-alamedaSignatureTo.xml"
