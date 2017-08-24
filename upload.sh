#!/usr/bin/env bash

channel=${CHANNEL}
filename=$1

function parse() {
  element=$1
  echo $(sed -ne "s/.*<$element>\(.*\)<\/$element>.*/\1/gp" ${filename})
}

accountFrom=$(parse "dep_acc_c")
divisionFrom=$(parse "sec_c")
accountTo=$(parse "corr_acc_c")
divisionTo=$(parse "corr_sec_c")
security=$(parse "security_c")
quantity=$(parse "security_q")
tradeDate=$(parse "date_deal")
instructionDate=$(parse "execute_dt")
reference=$(parse "deal_reference")

signature=$(base64 --wrap=0 ${filename})

args="[\"${accountFrom}\",\"${divisionFrom}\",\"${accountTo}\",\"${divisionTo}\",\"${security}\",\"${quantity}\",\"${reference}\",\"${instructionDate}\",\"${tradeDate}\",\"${signature}\"]"

echo "post request to enroll ${USER} to ${API_SERVER}"
res=$(curl -s -X POST ${API_SERVER}/users -H "content-type: application/x-www-form-urlencoded" -d "username=${USER}")
echo "responded ${res}"
token=$(echo ${res} | jq -r ".token")
echo "enrolled with token=${token}"

echo "post request to sign with $args"
res=$(curl -s -X POST ${API_SERVER}/channels/${channel}/chaincodes/instruction -H "authorization: Bearer $token" -H "content-type: application/json" -d "{\"peers\":[\"$ORG/peer0\"],\"fcn\":\"sign\",\"args\":$args}")
echo "responded ${res}"
ok=$(echo ${res} | jq -r ".ok")

if [ ${ok} == true ]; then
  echo "OK uploaded signature"
  exit 0
else
  echo "ERROR cannot upload signature"
  exit 1
fi