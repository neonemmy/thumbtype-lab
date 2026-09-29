(()=>{
  'use strict';
  // One quiet, finite voice per tap. A new tap fades out the previous cue.
  const cues={
    good:{frequencies:[880,1320,1760],times:[0,.035,.07],duration:.12},
    bad:{frequencies:[392,330,262,131],times:[0,.055,.11,.17],duration:.25}
  };
  let voice=null;

  function stop(){
    if(!voice)return;
    const {ctx,gain,oscillator}=voice,t=ctx.currentTime;
    if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(t);
    else gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0,t,.003);
    oscillator.stop(t+.015);
    voice=null;
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
      const current={ctx,gain,oscillator};voice=current;
      oscillator.onended=()=>{
        oscillator.disconnect();gain.disconnect();
        if(voice===current)voice=null;
      };
      oscillator.start(t);oscillator.stop(t+cue.duration+.005);
    }
    return {outcome,durationMs:cue.duration*1000,audioState:ctx?.state||'unavailable'};
  }

  window.ThumbTypeAudio={cues,get active(){return !!voice},play,stop};
})();
