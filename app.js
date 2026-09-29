(()=>{
  'use strict';
  const phrases=['the quick brown fox','pack my box with five','bright stars shine tonight','please bring fresh coffee','small keys need careful taps','typing with one thumb works'];
  const modes=[
    {id:'left',label:'Left thumb only',short:'LEFT THUMB',instruction:'Use your left thumb only.'},
    {id:'right',label:'Right thumb only',short:'RIGHT THUMB',instruction:'Use your right thumb only.'},
    {id:'both',label:'Both thumbs',short:'BOTH THUMBS',instruction:'Use both thumbs naturally.'}
  ];
  const repetitions=3;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const keyboard=$('#keyboard'), keys=$$('.key'), keyMap=new Map(keys.map(k=>[k.dataset.key,k]));
  const timers=new Set();
  let phrase=phrases[0], modeIndex=0, repetition=1, samples=[], touches=[], alignment=[], consumed=0, completed=false, locked=true, runStart=null, audioCtx=null;

  function detectDevice(){
    const ua=navigator.userAgent||'';
    const m=ua.match(/OS (\d+)[_\.](\d+)(?:[_\.](\d+))?/i);
    $('#osVersion').value=m?`iOS ${m[1]}.${m[2]}${m[3]?'.'+m[3]:''}`:'Unknown';
    const w=Math.min(screen.width,screen.height), h=Math.max(screen.width,screen.height), dpr=window.devicePixelRatio||1;
    const key=`${w}x${h}@${dpr}`;
    const guesses={
      '320x568@2':'iPhone SE (1st gen)',
      '375x667@2':'iPhone SE (3rd gen)',
      '414x736@3':'iPhone 8 Plus',
      '375x812@3':'iPhone 11 Pro',
      '414x896@2':'iPhone 11',
      '414x896@3':'iPhone 11 Pro Max',
      '360x780@3':'iPhone 13 mini',
      '390x844@3':'iPhone 17e',
      '428x926@3':'iPhone 14 Plus',
      '393x852@3':'iPhone 16',
      '430x932@3':'iPhone 16 Plus',
      '402x874@3':'iPhone 18 Pro',
      '420x912@3':'iPhone Air',
      '440x956@3':'iPhone 18 Pro Max'
    };
    const guess=guesses[key];
    $('#hardwareModel').value=/iPhone/i.test(ua)?(guess||'iPhone — enter exact model'):'Unknown';
    const vv=window.visualViewport?`${Math.round(visualViewport.width)}×${Math.round(visualViewport.height)} @${visualViewport.scale}`:'unavailable';
    $('#deviceNote').textContent=(guess?'Newest known model matching this screen profile; older iPhones may share it. ':'Exact iPhone model is not exposed to web apps. ')+`Screen ${w}×${h} CSS px, DPR ${dpr}, viewport ${innerWidth}×${innerHeight}, visual viewport ${vv}.`;
  }

  function ensureAudio(){
    if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;if(C)audioCtx=new C();}
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
  }
  function tone(freq,duration=.055,volume=.03,delay=0){
    if(!audioCtx)return;
    const t=audioCtx.currentTime+delay,o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.frequency.value=freq;o.type='sine';g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+.02);
  }
  const soundCorrect=()=>tone(760,.045,.024), soundError=()=>tone(230,.07,.038), soundOpen=()=>{tone(520,.05,.025);tone(720,.07,.025,.06)}, soundClose=()=>{tone(700,.04,.024);tone(500,.05,.022,.045)}, soundFinished=()=>{tone(520,.05,.03);tone(660,.06,.03,.06);tone(880,.1,.035,.13)};

  function alignPrefix(expected,actual){
    const n=expected.length,m=actual.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0)),op=Array.from({length:n+1},()=>Array(m+1).fill(null));
    for(let i=1;i<=n;i++){dp[i][0]=i;op[i][0]='skip'}
    for(let j=1;j<=m;j++){dp[0][j]=j;op[0][j]='extra'}
    for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){
      const same=expected[i-1]===actual[j-1],sub=dp[i-1][j-1]+(same?0:1),del=dp[i-1][j]+1,ins=dp[i][j-1]+1,best=Math.min(sub,del,ins);
      dp[i][j]=best;op[i][j]=best===sub?(same?'match':'sub'):best===del?'skip':'extra';
    }
    let endI=0,best=dp[0][m];
    for(let i=1;i<=n;i++)if(dp[i][m]<best){best=dp[i][m];endI=i}
    let i=endI,j=m,out=[];
    while(i>0||j>0){const o=op[i][j];if(o==='match'||o==='sub'){out.push({type:o,expectedIndex:i-1,touchIndex:j-1});i--;j--}else if(o==='skip'){out.push({type:'skip',expectedIndex:i-1,touchIndex:null});i--}else if(o==='extra'){out.push({type:'extra',expectedIndex:null,touchIndex:j-1});j--}else break}
    return {items:out.reverse(),consumed:endI};
  }

  function updateThumbCue(){
    const cue=$('#thumbCue'),mode=modes[modeIndex].id;cue.className=`thumb-cue thumb-${mode}`;
    $('#leftThumbLabel').classList.toggle('active',mode==='left'||mode==='both');$('#rightThumbLabel').classList.toggle('active',mode==='right'||mode==='both');
  }
  function currentWpm(){if(!runStart)return 0;const mins=(performance.now()-runStart)/60000;return mins>0?(consumed/5)/mins:0}
  function renderHeader(){
    $('#modeLabel').textContent=modes[modeIndex].label;$('#modeNumber').textContent=modeIndex+1;$('#repNumber').textContent=repetition;
    $('#sampleCount').textContent=samples.filter(s=>s.type==='touch').length+touches.length;updateThumbCue();
  }
  function renderTyped(){
    const idx=Math.min(consumed,phrase.length);$('#typedLine').innerHTML='';
    const a=document.createElement('span'),b=document.createElement('span'),c=document.createElement('span');a.className='done';b.className='current';a.textContent=phrase.slice(0,idx);b.textContent=phrase[idx]||'';c.textContent=phrase.slice(idx+1);$('#typedLine').append(a,b,c);
    keys.forEach(k=>k.classList.toggle('expected',k.dataset.key===(phrase[idx]||'')));
  }
  function renderEntered(){
    const box=$('#enteredKeys');box.replaceChildren();
    alignment.forEach((a,i)=>{
      const s=document.createElement('span');
      if(a.type==='skip'){const ch=phrase[a.expectedIndex];s.className='skip';s.textContent=`∅${ch===' '?'␠':ch}`}
      else if(a.type==='extra'){const h=touches[a.touchIndex]?.hit;s.className='extra';s.textContent=`+${h===' '?'␠':h||'·'}`}
      else {const t=touches[a.touchIndex],e=phrase[a.expectedIndex];s.className=a.type==='match'?'ok':'miss';s.textContent=t?.hit===' '?'␠':t?.hit||'·';s.title=`Expected ${e}, detected ${t?.hit||'gap'}`}
      box.appendChild(s);if(i<alignment.length-1)box.appendChild(document.createTextNode(' '));
    });
    requestAnimationFrame(()=>{$('#enteredViewport').scrollTop=$('#enteredViewport').scrollHeight});
  }
  function recalc(){const r=alignPrefix(phrase,touches.map(t=>t.hit||'¤'));alignment=r.items;consumed=r.consumed;renderEntered();renderTyped();$('#liveSpeed').textContent=`${currentWpm().toFixed(0)} WPM`}

  function showReady(title){
    locked=true;$('#readyMode').textContent=modes[modeIndex].short;$('#readyTitle').textContent=title;$('#readyText').innerHTML=`${modes[modeIndex].instruction}<br>Repetition ${repetition} of ${repetitions}.`;$('#readyModal').classList.remove('hidden');$('#status').textContent='Press Go when ready.';soundOpen();
  }
  function hideReady(){ensureAudio();$('#readyModal').classList.add('hidden');locked=false;runStart=performance.now();$('#liveSpeed').textContent='0 WPM';$('#status').textContent=modes[modeIndex].instruction;soundClose()}

  function findHitKey(x,y){for(const k of keys){const r=k.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return k.dataset.key}return null}
  function addDot(e){const r=keyboard.getBoundingClientRect(),d=document.createElement('div');d.className='touch-dot';d.style.left=`${e.clientX-r.left}px`;d.style.top=`${e.clientY-r.top}px`;keyboard.appendChild(d);const t=setTimeout(()=>{d.remove();timers.delete(t)},450);timers.add(t)}

  function finalizeRepetition(){
    const durationMs=runStart?performance.now()-runStart:0,wpm=durationMs>0?((phrase.length/5)/(durationMs/60000)):0;
    const final=alignPrefix(phrase,touches.map(t=>t.hit||'¤'));alignment=final.items;consumed=final.consumed;const aligned=[];
    alignment.forEach(a=>{
      if(a.type==='skip')aligned.push({type:'skip',mode:modes[modeIndex].id,repetition,position:a.expectedIndex,expected:phrase[a.expectedIndex],durationMs,wpm});
      else if(a.type==='extra')aligned.push({...touches[a.touchIndex],type:'extra',expected:null,position:null,durationMs,wpm});
      else {const t=touches[a.touchIndex],expected=phrase[a.expectedIndex],target=keyMap.get(expected);let dx=null,dy=null;if(target){const r=target.getBoundingClientRect();dx=t.clientX-(r.left+r.width/2);dy=t.clientY-(r.top+r.height/2)}aligned.push({...t,type:'touch',alignment:a.type,expected,position:a.expectedIndex,dx:dx===null?null:+dx.toFixed(2),dy:dy===null?null:+dy.toFixed(2),durationMs,wpm})}
    });
    samples.push(...aligned);runStart=null;$('#liveSpeed').textContent=`${wpm.toFixed(0)} WPM`;
    if(repetition<repetitions){repetition++;touches=[];alignment=[];consumed=0;renderHeader();renderEntered();renderTyped();showReady('Phrase complete');return}
    if(modeIndex<modes.length-1){modeIndex++;repetition=1;touches=[];alignment=[];consumed=0;renderHeader();renderEntered();renderTyped();showReady('Next thumb test');return}
    completed=true;locked=true;keys.forEach(k=>k.classList.remove('expected'));$('#shareResults').disabled=false;$('#rawData').disabled=false;soundFinished();showResults();
  }

  function repetitionStats(mode){
    const reps=[];for(let r=1;r<=repetitions;r++){const a=samples.filter(s=>s.mode===mode&&s.repetition===r);if(!a.length)continue;const first=a[0],touch=a.filter(s=>s.type==='touch'),skips=a.filter(s=>s.type==='skip').length,extras=a.filter(s=>s.type==='extra').length,subs=touch.filter(s=>s.alignment==='sub').length;reps.push({repetition:r,durationMs:first.durationMs||0,wpm:first.wpm||0,errors:skips+extras+subs,errorRate:(skips+extras+subs)/phrase.length})}return reps;
  }
  function statsFor(mode){
    const a=samples.filter(s=>s.mode===mode),touch=a.filter(s=>s.type==='touch');if(!a.length)return null;
    const skips=a.filter(s=>s.type==='skip').length,extras=a.filter(s=>s.type==='extra').length,subs=touch.filter(s=>s.alignment==='sub').length,pos=touch.filter(s=>Number.isFinite(s.dx)&&Number.isFinite(s.dy)),reps=repetitionStats(mode);
    const mx=pos.length?pos.reduce((n,s)=>n+s.dx,0)/pos.length:0,my=pos.length?pos.reduce((n,s)=>n+s.dy,0)/pos.length:0,radial=pos.length?pos.reduce((n,s)=>n+Math.hypot(s.dx,s.dy),0)/pos.length:0,avgWpm=reps.length?reps.reduce((n,r)=>n+r.wpm,0)/reps.length:0;
    return {touches:touch.length,skips,extras,subs,errorRate:(skips+extras+subs)/(phrase.length*repetitions),mx,my,radial,avgWpm,repetitions:reps};
  }
  const modeName=id=>id==='left'?'Left thumb':id==='right'?'Right thumb':'Both thumbs';
  function describeBias(s){const h=Math.abs(s.mx)<2?'little horizontal bias':s.mx>0?`${Math.abs(s.mx).toFixed(1)} px right`:`${Math.abs(s.mx).toFixed(1)} px left`;const v=Math.abs(s.my)<2?'little vertical bias':s.my>0?`${Math.abs(s.my).toFixed(1)} px low`:`${Math.abs(s.my).toFixed(1)} px high`;return `${h}, ${v}`}
  function showResults(){
    const arr=modes.map(m=>[m.id,statsFor(m.id)]).filter(x=>x[1]),report=$('#report');report.replaceChildren();
    if(!arr.length){report.textContent='No usable results were recorded.'}
    else {
      const acc=[...arr].sort((a,b)=>a[1].errorRate-b[1].errorRate),speed=[...arr].sort((a,b)=>b[1].avgWpm-a[1].avgWpm),pos=[...arr].sort((a,b)=>a[1].radial-b[1].radial);
      arr.forEach(([id,s])=>{const div=document.createElement('div');div.className='report-row';div.innerHTML=`<b>${modeName(id)}</b><div>${s.avgWpm.toFixed(0)} WPM · ${Math.round(s.errorRate*100)}% errors · ${s.radial.toFixed(1)} px mean offset</div><div class="report-note">Bias: ${describeBias(s)}</div>`;report.appendChild(div)});
      const note=document.createElement('div');note.className='report-note';
      if(acc[0][0]===speed[0][0])note.innerHTML=`<strong>${modeName(acc[0][0])}</strong> led on both speed and accuracy in this run. ${modeName(pos[0][0])} had the tightest touch placement.`;
      else note.innerHTML=`There is a speed–accuracy tradeoff: <strong>${modeName(speed[0][0])}</strong> was fastest (${speed[0][1].avgWpm.toFixed(0)} WPM), while <strong>${modeName(acc[0][0])}</strong> was most accurate (${Math.round(acc[0][1].errorRate*100)}% errors). ${modeName(pos[0][0])} had the tightest touch placement.`;
      report.appendChild(note);
    }
    $('#resultsModal').classList.remove('hidden');$('#status').textContent='Comparison complete.';soundOpen();
  }

  function buildPayload(){return {experiment:'iPhone thumb keyboard touch comparison',version:12,created:new Date().toISOString(),alignment:'semi-global prefix Levenshtein',phrase,repetitions,modes:modes.map(m=>m.id),os:$('#osVersion').value.trim()||'Unknown',hardware:$('#hardwareModel').value.trim()||'Unknown',userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,devicePixelRatio:window.devicePixelRatio,innerWidth,innerHeight,visualViewport:window.visualViewport?{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null},summary:{left:statsFor('left'),right:statsFor('right'),both:statsFor('both')},samples:samples.map(({clientX,clientY,...s})=>s)}}
  const payloadText=()=>JSON.stringify(buildPayload(),null,2);

  function shareMessage(){
    const rows=modes.map(m=>[m.id,statsFor(m.id)]).filter(([,s])=>s);
    const lines=['ThumbType Lab results',`Phrase: “${phrase}”`,`Device: ${$('#hardwareModel').value.trim()||'Unknown'} · ${$('#osVersion').value.trim()||'Unknown'}`,''];
    rows.forEach(([id,s])=>lines.push(`${modeName(id)}: ${s.avgWpm.toFixed(0)} WPM · ${Math.round(s.errorRate*100)}% errors · ${s.radial.toFixed(1)} px mean offset`));
    if(rows.length){
      const fastest=[...rows].sort((a,b)=>b[1].avgWpm-a[1].avgWpm)[0];
      const accurate=[...rows].sort((a,b)=>a[1].errorRate-b[1].errorRate)[0];
      lines.push('',`Fastest: ${modeName(fastest[0])} (${fastest[1].avgWpm.toFixed(0)} WPM)`,`Most accurate: ${modeName(accurate[0])} (${Math.round(accurate[1].errorRate*100)}% errors)`);
    }
    lines.push('','ThumbType Lab');
    return lines.join('\n');
  }

  function closeModal(sel){$(sel).classList.add('hidden');soundClose()}
  async function shareResultsMessage(){
    ensureAudio();const text=shareMessage();
    try{
      if(navigator.share)await navigator.share({title:'ThumbType Lab results',text});
      else if(navigator.clipboard){await navigator.clipboard.writeText(text);$('#status').textContent='Results copied to clipboard.';}
      else $('#status').textContent='Sharing is not available on this device.';
    }catch(e){if(e.name!=='AbortError')$('#status').textContent='Could not share results.'}
  }
  async function shareRawData(){
    ensureAudio();const text=payloadText(),file=new File([text],'thumbtype-results.json',{type:'application/json'});
    try{
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({title:'ThumbType Lab raw data',files:[file]});
      else downloadPayload();
    }catch(e){if(e.name!=='AbortError')$('#status').textContent='Could not share raw data.'}
  }
  function downloadPayload(){const blob=new Blob([payloadText()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='thumbtype-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

  function resetAll(){
    timers.forEach(t=>clearTimeout(t));timers.clear();$$('.touch-dot').forEach(d=>d.remove());$('#resultsModal').classList.add('hidden');$('#rawModal').classList.add('hidden');modeIndex=0;repetition=1;samples=[];touches=[];alignment=[];consumed=0;runStart=null;locked=true;completed=false;$('#shareResults').disabled=true;$('#rawData').disabled=true;$('#liveSpeed').textContent='— WPM';renderHeader();renderEntered();renderTyped();showReady('Ready?');
  }

  keyboard.addEventListener('pointerdown',e=>{
    if(completed||locked)return;if(e.pointerType==='mouse'&&e.button!==0)return;ensureAudio();
    const expected=phrase[consumed]||null,br=keyboard.getBoundingClientRect(),hit=findHitKey(e.clientX,e.clientY);
    touches.push({mode:modes[modeIndex].id,repetition,hit,x:+(e.clientX-br.left).toFixed(2),y:+(e.clientY-br.top).toFixed(2),clientX:e.clientX,clientY:e.clientY,timestamp:new Date().toISOString()});addDot(e);recalc();
    const last=alignment.filter(a=>a.touchIndex===touches.length-1).pop();if(last&&last.type==='match')soundCorrect();else if(hit===expected)soundCorrect();else soundError();
    $('#sampleCount').textContent=samples.filter(s=>s.type==='touch').length+touches.length;if(consumed>=phrase.length)finalizeRepetition();
  });

  $('#goButton').addEventListener('click',hideReady);$('#shareResults').addEventListener('click',shareResultsMessage);$('#resultsShare').addEventListener('click',shareResultsMessage);$('#rawData').addEventListener('click',shareRawData);$('#resultsRaw').addEventListener('click',shareRawData);$('#closeResults').addEventListener('click',()=>closeModal('#resultsModal'));$('#closeRaw').addEventListener('click',()=>closeModal('#rawModal'));$('#downloadRaw').addEventListener('click',downloadPayload);
  $('#restart').addEventListener('click',()=>{ensureAudio();tone(330,.05,.024);resetAll()});
  $('#newPhrase').addEventListener('click',()=>{ensureAudio();let next=phrase;while(next===phrase)next=phrases[Math.floor(Math.random()*phrases.length)];phrase=next;$('#phrase').textContent=phrase;resetAll()});

  $('#instructionsButton').addEventListener('click',()=>{location.href='./instructions.html'});
  const onboardingKey='thumbtype-instructions-v1';
  if(!localStorage.getItem(onboardingKey)){localStorage.setItem(onboardingKey,'1');location.replace('./instructions.html?first=1');return;}
  detectDevice();$('#phrase').textContent=phrase;renderHeader();renderEntered();renderTyped();showReady('Ready?');
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
