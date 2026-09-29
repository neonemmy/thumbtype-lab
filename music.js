(()=>{
  'use strict';
  // A small original chiptune loop. Each repetition is a faster, fuller level.
  const melody=[72,76,79,76,69,72,76,72,65,69,72,69,67,71,74,71];
  const bass=[48,45,41,43];
  const levelCount=9;
  const midiHz=n=>440*2**((n-69)/12);
  const tempoFor=level=>104+level*9;
  let run=null,timer=null;
  const notes=new Set();

  function note(ctx,hz,start,duration,volume,type){
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=type;
    oscillator.frequency.setValueAtTime(hz,start);
    gain.gain.setValueAtTime(0,start);
    gain.gain.linearRampToValueAtTime(volume,start+.006);
    gain.gain.setValueAtTime(volume,start+duration-.025);
    gain.gain.linearRampToValueAtTime(0,start+duration);
    oscillator.connect(gain);gain.connect(ctx.destination);
    const voice={ctx,oscillator,gain};notes.add(voice);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();notes.delete(voice)};
    oscillator.start(start);oscillator.stop(start+duration+.005);
  }

  function tick(){
    if(!run)return;
    const {ctx,level,stepDuration}=run;
    while(run.nextTime<ctx.currentTime+.24){
      const i=run.step%melody.length,t=run.nextTime;
      if(level>=4||i%2===0){
        note(ctx,midiHz(melody[i]+(level>=7?5:0)),t,stepDuration*.78,.008,'square');
      }
      if(i%4===0){
        const root=bass[Math.floor(i/4)];
        note(ctx,midiHz(root),t,stepDuration*3.5,.006,'triangle');
      }
      if(level>=7&&i%2===1){
        note(ctx,midiHz(bass[Math.floor(i/4)]+24+(i%4===1?7:12)),t,stepDuration*.55,.003,'square');
      }
      run.step++;
      run.nextTime+=stepDuration;
    }
  }

  function stop(){
    if(timer!==null)clearInterval(timer);
    timer=null;run=null;
    for(const {ctx,oscillator,gain} of notes){
      const t=ctx.currentTime;
      if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(t);
      else gain.gain.cancelScheduledValues(t);
      gain.gain.setTargetAtTime(0,t,.004);
      oscillator.stop(t+.025);
    }
    notes.clear();
  }

  function start(ctx,requestedLevel){
    stop();
    if(!ctx)return;
    const level=Math.min(levelCount,Math.max(1,Math.floor(requestedLevel)));
    run={ctx,level,step:0,stepDuration:30/tempoFor(level),nextTime:ctx.currentTime+.025};
    tick();timer=setInterval(tick,100);
  }

  window.ThumbTypeMusic={levelCount,tempoFor,get active(){return !!run},start,stop};
})();
