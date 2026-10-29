#!/bin/bash
# Ex officio initiation captures (oficiu-board-v1, 2026-10-26). Usage: tools/figma/oficiu/cap.sh "<state> <captureId> [nofit]" …
# Desktop 1440 only (BO). --fit grows the viewport until the request sheet / BO canvas / table / modal bodies stop scrolling;
# menu states use „nofit” (a viewport resize closes them). PAR=<n> parallel jobs (default 1: row / menu states land on the picker in parallel).
cd /Users/user/Desktop/e-permits-vibe
FS=".e-permits-gh-sheet__body,.e-permits-gh-start__body,.e-permits-shell__canvas-surface,.e-permits-workplace__table-wrap,.modal-content"
run() {
  set -- $1
  local st=$1 cid=$2 opt=$3
  local fit="--fit --fit-sel $FS"
  [ "$opt" = nofit ] && fit=""
  node --experimental-websocket --no-warnings tools/figma/capture-to-figma.mjs --state "$st" --capture "$cid" --width 1440 --height 900 $fit --settle ${SETTLE:-3000} --wait 45000 2>&1 | tail -2 | tr '\n' ' '
  echo " <- $st"
}
N=0; P=${PAR:-1}
for job in "$@"; do run "$job" & N=$((N+1)); if [ $N -ge $P ]; then wait; N=0; fi; done
wait
