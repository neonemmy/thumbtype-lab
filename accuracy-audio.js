(()=>{
  'use strict';

  const MAX_CENTS=80;
  const REFERENCE_HZ=900;
  let pending=null;

  function expectedKey(){
    return document.querySelector('#keyboard .key.expected');
  }

  function normalizedDistance(key,x,y){
    if(!key)return null;
    const r=key.getBoundingClientRect();
    const nx=(x-(r.left+r.width/2))/(r.width/2);
    const ny=(y-(r.top+r.height/2))/(r.height/2);
    return Math.hypot(nx,ny);
  }

  function detuneForDistance(distance){
    if(distance==null)return MAX_CENTS;
    const d=Math.min(distance,2);
    return MAX_CENTS*(d/2);
  }

  document.addEventListener('pointerdown',e=>{
    const keyboard=e.target.closest?.('#keyboard');
    if(!keyboard)return;
    const key=expectedKey();
    const distance=normalizedDistance(key,e.clientX,e.clientY);
    pending={
      distance,
      cents:detuneForDistance(distance),
      expires:performance.now()+30
    };
  },true);

  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return;
  const proto=C.prototype;
  const originalCreate=proto.createOscillator;

  proto.createOscillator=function(){
    const primary=originalCreate.call(this);
    const state=pending&&performance.now()<=pending.expires?pending:null;
    if(!state)return primary;
    pending=null;

    const secondary=originalCreate.call(this);
    const pConnect=primary.connect.bind(primary);
    const pStart=primary.start.bind(primary);
    const pStop=primary.stop.bind(primary);
    const sConnect=secondary.connect.bind(secondary);
    const sStart=secondary.start.bind(secondary);
    const sStop=secondary.stop.bind(secondary);

    primary.connect=(dest,...rest)=>{
      pConnect(dest,...rest);
      sConnect(dest,...rest);
      return dest;
    };

    primary.start=(when=0)=>{
      primary.type='sine';
      secondary.type='sine';
      primary.frequency.value=REFERENCE_HZ;
      secondary.frequency.value=REFERENCE_HZ*Math.pow(2,state.cents/1200);
      pStart(when);
      sStart(when);
    };

    primary.stop=(when=0)=>{
      pStop(when);
      sStop(when);
    };

    window.__thumbtypeLastAudioFeedback={
      referenceHz:REFERENCE_HZ,
      detuneCents:+state.cents.toFixed(1),
      secondaryHz:+(REFERENCE_HZ*Math.pow(2,state.cents/1200)).toFixed(1),
      normalizedDistance:state.distance==null?null:+state.distance.toFixed(3)
    };

    return primary;
  };
})();
