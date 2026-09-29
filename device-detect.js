(()=>{
  'use strict';

  function correctDeviceGuess(){
    const dpr=window.devicePixelRatio||1;
    const vv=window.visualViewport;
    const vw=Math.round(vv?.width||innerWidth||screen.width);
    const vh=Math.round(vv?.height||innerHeight||screen.height);
    const portraitWidth=Math.min(vw,vh);

    // Do not depend on the User-Agent here. Installed iOS web apps can expose
    // reduced/frozen UA information. Restrict the heuristic to phone-like,
    // high-DPR touch devices instead.
    const phoneLike=(navigator.maxTouchPoints||0)>0 && dpr>=2 && portraitWidth<=500;
    if(!phoneLike)return;

    const newestByViewportWidth={
      '320@2':'iPhone SE (1st gen)',
      '360@3':'iPhone 13 mini',
      '375@2':'iPhone SE (3rd gen)',
      '375@3':'iPhone 11 Pro',
      '390@3':'iPhone 17e',
      '393@3':'iPhone 16',
      '402@3':'iPhone 18 Pro',
      '414@2':'iPhone 11',
      '414@3':'iPhone 11 Pro Max',
      '420@3':'iPhone Air',
      '428@3':'iPhone 14 Plus',
      '430@3':'iPhone 16 Plus',
      '440@3':'iPhone 18 Pro Max'
    };

    const guess=newestByViewportWidth[`${portraitWidth}@${dpr}`];
    if(!guess)return;

    const model=document.querySelector('#hardwareModel');
    const note=document.querySelector('#deviceNote');
    if(model)model.value=guess;

    if(note){
      const sw=Math.min(screen.width,screen.height);
      const sh=Math.max(screen.width,screen.height);
      const visual=vv?`${Math.round(vv.width)}x${Math.round(vv.height)} scale ${vv.scale}`:'unavailable';
      note.textContent=`Likely model: ${guess} (newest matching viewport class). Screen: ${sw} × ${sh} CSS px. Pixel ratio: ${dpr}. Viewport: ${innerWidth} × ${innerHeight}. Visual viewport: ${visual}.`;
    }
  }

  // Run after the main app detector, and again when a standalone PWA is
  // restored from the page cache or its viewport settles.
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',correctDeviceGuess,{once:true});
  else correctDeviceGuess();
  addEventListener('pageshow',correctDeviceGuess);
  setTimeout(correctDeviceGuess,100);
})();
