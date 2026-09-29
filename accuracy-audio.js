(()=>{
  'use strict';
  const referenceHz=900, scales=[50,150,300];
  let voices=null;
  function stop(){
    if(!voices)return;
    const {ctx,gain,oscillators}=voices,t=ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setTargetAtTime(0,t,.015);
    oscillators.forEach(o=>{o.stop(t+.08);o.onended=()=>o.disconnect()});
    oscillators[0].onended=()=>{oscillators[0].disconnect();gain.disconnect()};
    voices=null;
  }
  function start(ctx){
    stop();
    if(!ctx)return;
    const gain=ctx.createGain(),oscillators=[ctx.createOscillator(),ctx.createOscillator()];
    gain.gain.setValueAtTime(0,ctx.currentTime);
    gain.gain.linearRampToValueAtTime(.045,ctx.currentTime+.04);
    gain.connect(ctx.destination);
    oscillators.forEach(o=>{o.type='sine';o.frequency.value=referenceHz;o.connect(gain);o.start()});
    voices={ctx,gain,oscillators};
  }
  function update(key,x,y,scaleCents){
    const r=key?.getBoundingClientRect();
    const distance=r&&r.width>0&&r.height>0?Math.hypot((x-r.left-r.width/2)/(r.width/2),(y-r.top-r.height/2)/(r.height/2)):null;
    const cents=distance===null?0:scaleCents*Math.min(distance,2);
    if(voices)voices.oscillators[1].detune.setTargetAtTime(cents,voices.ctx.currentTime,.025);
    return {referenceHz,scaleCents,detuneCents:cents,secondaryHz:referenceHz*2**(cents/1200),normalizedDistance:distance,audioState:voices?.ctx.state||'unavailable'};
  }
  window.ThumbTypeAudio={referenceHz,scales,get active(){return !!voices},scaleFor:(modeIndex,repetition)=>scales[(modeIndex+repetition-1)%scales.length],start,stop,update};
})();
