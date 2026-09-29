(()=>{
  'use strict';

  const STORAGE_KEY='thumbtype.hardwareModel';

  function correctDeviceGuess(){
    const dpr=window.devicePixelRatio||1;
    const vv=window.visualViewport;
    const vw=Math.round(vv?.width||innerWidth||screen.width);
    const vh=Math.round(vv?.height||innerHeight||screen.height);
    const portraitWidth=Math.min(vw,vh);
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

    const autoGuess=newestByViewportWidth[`${portraitWidth}@${dpr}`];
    const saved=localStorage.getItem(STORAGE_KEY);
    const guess=saved||autoGuess;
    if(!guess)return;

    const model=document.querySelector('#hardwareModel');
    const note=document.querySelector('#deviceNote');
    if(model){
      model.value=guess;
      if(!model.dataset.thumbtypePersistBound){
        model.addEventListener('change',()=>{
          const value=model.value.trim();
          if(value)localStorage.setItem(STORAGE_KEY,value);
        });
        model.dataset.thumbtypePersistBound='1';
      }
    }

    if(note){
      const sw=Math.min(screen.width,screen.height);
      const sh=Math.max(screen.width,screen.height);
      const visual=vv?`${Math.round(vv.width)}x${Math.round(vv.height)} scale ${vv.scale}`:'unavailable';
      note.textContent=`${saved?'Selected model':'Likely model'}: ${guess}${saved?'':' (newest matching viewport class)'}. Screen: ${sw} × ${sh} CSS px. Pixel ratio: ${dpr}. Viewport: ${innerWidth} × ${innerHeight}. Visual viewport: ${visual}.`;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',correctDeviceGuess,{once:true});
  else correctDeviceGuess();
  addEventListener('pageshow',correctDeviceGuess);
  setTimeout(correctDeviceGuess,100);
})();
