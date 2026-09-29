(()=>{
  'use strict';
  // One quiet, finite voice per tap. A new tap fades out the previous cue.
  const cues={
    good:{frequencies:[880,1320,1760],times:[0,.035,.07],duration:.12},
    bad:{frequencies:[392,330,262,131],times:[0,.055,.11,.17],duration:.25}
  };
  let voice=null;
  const celebration=new Set();

  function fadeOut({ctx,gain,oscillator}){
    const t=ctx.currentTime;
    if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(t);
    else gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0,t,.003);
    oscillator.stop(t+.015);
  }

  function stop(){
    if(voice)fadeOut(voice);
    voice=null;
    celebration.forEach(fadeOut);
    celebration.clear();
  }

  function celebrate(ctx,finished=false){
    celebration.forEach(fadeOut);
    celebration.clear();
    if(!ctx)return;
    // Let the last tap finish, then play a discrete major-key game fanfare.
    const start=Math.max(ctx.currentTime,voice?.endTime||0)+.04;
    const notes=finished?[
      [784,0,.12],[784,.15,.12],[1047,.32,.2],[1319,.55,.18],
      [1568,.77,.24],[1319,1.04,.14],
      [523,1.25,.7],[659,1.25,.7],[784,1.25,.7],[1047,1.25,.7]
    ]:[
      [523,0,.09],[659,.1,.09],[784,.2,.09],[1047,.3,.13],[1319,.44,.22]
    ];
    notes.forEach(([hz,offset,duration])=>{
      const t=start+offset,oscillator=ctx.createOscillator(),gain=ctx.createGain();
      const volume=finished&&offset===1.25?.012:.03;
      oscillator.type='triangle';oscillator.frequency.setValueAtTime(hz,t);
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(volume,t+.008);
      gain.gain.setValueAtTime(volume,t+duration-.04);
      gain.gain.linearRampToValueAtTime(0,t+duration);
      oscillator.connect(gain);gain.connect(ctx.destination);
      const note={ctx,gain,oscillator};celebration.add(note);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();celebration.delete(note)};
      oscillator.start(t);oscillator.stop(t+duration+.005);
    });
  }

  function play(ctx,good){
    stop();
    const outcome=good?'good':'bad',cue=cues[outcome];
    if(ctx){
      const t=ctx.currentTime,oscillator=ctx.createOscillator(),gain=ctx.createGain();
      oscillator.type='triangle';
      cue.frequencies.forEach((hz,i)=>{
        const at=t+cue.times[i];
        if(i)oscillator.frequency.linearRampToValueAtTime(hz,at+.008);
        else oscillator.frequency.setValueAtTime(hz,at);
        oscillator.frequency.setValueAtTime(hz,t+(cue.times[i+1]??cue.duration));
      });
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(.035,t+.006);
      gain.gain.setValueAtTime(.035,t+cue.duration-.045);
      gain.gain.linearRampToValueAtTime(0,t+cue.duration);
      oscillator.connect(gain);gain.connect(ctx.destination);
      const current={ctx,gain,oscillator,endTime:t+cue.duration+.005};voice=current;
      oscillator.onended=()=>{
        oscillator.disconnect();gain.disconnect();
        if(voice===current)voice=null;
      };
      oscillator.start(t);oscillator.stop(t+cue.duration+.005);
    }
    return {outcome,durationMs:cue.duration*1000,audioState:ctx?.state||'unavailable'};
  }

  window.ThumbTypeAudio={cues,get active(){return !!voice||celebration.size>0},play,celebrate,stop};
})();
