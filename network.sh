#!/usr/bin/env bash

STARTTIME=$(date +%s)

# defaults; export these variables before executing this script
: ${FOLDER_SAVE:="alameda"}
export FOLDER_SAVE

function startSignUp2 () {
  echo "Starting sign app for megafon"
  docker-compose up -d sign.megafon.nsd.ru
}

function startSignUp3 () {
  echo "Starting sign app for raiffeisen"
  docker-compose up -d sign.raiffeisen.nsd.ru
}

function startSignUpDev () {
  echo "Starting sign app for megafon and raiffeisen"
  FOLDER_SAVE="alameda-megafon"
  docker-compose up -d sign.megafon.nsd.ru

  FOLDER_SAVE="alameda-raiffeisen"
  docker-compose up -d sign.raiffeisen.nsd.ru
}
function stopSignDev () {
  echo "Stopping sign/download apps"
  docker-compose down
}

function logDev () {
  docker-compose logs
}





# Print the usage message
function printHelp () {
  echo "Usage: "
  echo "  network.sh -m up-2|up-3"
  echo "  network.sh -h|--help (print this message)"
  echo "    -m <mode> - one of 'up-2', 'up-3'"
  echo
  echo "  network.sh -m up-2"
  echo "  network.sh -m up-3"
}

# Parse commandline args
while getopts "h?m:" opt; do
  case "$opt" in
    h|\?)
      printHelp
      exit 0
    ;;
    m)  MODE=$OPTARG
    ;;
    o)  ORG=$OPTARG
    ;;
  esac
done

if [ "${MODE}" == "up-2" ]; then
  startSignUp2
elif [ "${MODE}" == "up-3" ]; then
  startSignUp3
elif [ "${MODE}" == "up" ]; then
  startSignUpDev
elif [ "${MODE}" == "down" ]; then
  stopSignDev
elif [ "${MODE}" == "logs" ]; then
  logDev
else
  printHelp
  exit 1
fi

# print spent time
ENDTIME=$(date +%s)
echo "Finished in $(($ENDTIME - $STARTTIME)) seconds"
