#!/bin/bash
# Ghișeu captures (2026-10-16). Usage: tools/figma/ghiseu/cap.sh "<state> <d|m> <captureId> [nofit|H=<height>]" …  (≤ 3 in parallel)
# d = 1440 (BO desktop), m = 375 (mobile). Full page, --fit grows the viewport until the sheet / modal / list
# bodies stop scrolling; menu / hover / open-list states use „nofit” (a viewport resize closes them) + H=<px>.
cd /Users/user/Desktop/e-permits-vibe
FS=".e-permits-gh-sheet__body,.e-permits-gh-start__body,.e-permits-shell__canvas-surface,.e-permits-workplace__table-wrap,.modal-content"
run() {
  set -- $1
  local st=$1 vp=$2 cid=$3 opt=$4 W=1440 H=900
  [ "$vp" = m ] && W=375 && H=812
  local fit="--fit --fit-sel $FS"
  local ev=""
  case "$opt" in nofit) fit="";; H=*) fit=""; H=${opt#H=};; ROW=*) fit=""; ev="(async()=>{const w=document.querySelector('[data-registry-kind=ghiseu] .e-permits-workplace__table-wrap'); if(w) w.scrollLeft=w.scrollWidth; await new Promise(r=>setTimeout(r,300)); const t=document.querySelector(\"tr[data-workplace-row='${opt#ROW=}'] [data-stack-menu-trigger]\"); if(t){ if(t.getAttribute('aria-expanded')==='true'){t.click(); await new Promise(r=>setTimeout(r,250));} t.click(); await new Promise(r=>setTimeout(r,400)); } return 1})()";; esac
  node --experimental-websocket --no-warnings tools/figma/capture-to-figma.mjs --state "$st" --capture "$cid" --width $W --height $H $fit --settle ${SETTLE:-2500} --wait 45000 ${ev:+--eval "$ev"} 2>&1 | tail -2 | tr '\n' ' '
  echo " <- $st $vp"
}
N=0
for job in "$@"; do run "$job" & N=$((N+1)); if [ $N -ge 3 ]; then wait; N=0; fi; done
wait
