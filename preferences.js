(()=>{
  'use strict';
  const HW_KEY='thumbtype.hardwareModel';
  const OS_KEY='thumbtype.osVersion';

  function browserReportedIOS(){
    const ua=navigator.userAgent||'';
    const m=ua.match(/OS (\d+)[_\.](\d+)(?:[_\.](\d+))?/i);
    return m?`iOS ${m[1]}.${m[2]}${m[3]?'.'+m[3]:''}`:null;
  }

  function versionNumber(value){
    const m=String(value||'').match(/(\d+(?:\.\d+){0,2})/);
    return m?m[1]:'';
  }

  function normalizedIOS(value){
    const n=versionNumber(value);
    return n?`iOS ${n}`:'';
  }

  function bindEditableIOS(os){
    if(os.dataset.preferenceBound)return;
    os.addEventListener('focus',()=>{
      const n=versionNumber(os.value);
      os.value=n;
      requestAnimationFrame(()=>os.setSelectionRange(0,os.value.length));
    });
    const save=()=>{
      const v=normalizedIOS(os.value);
      if(v){
        localStorage.setItem(OS_KEY,v);
        os.value=v;
      }else{
        localStorage.removeItem(OS_KEY);
        os.value='';
      }
    };
    os.addEventListener('change',save);
    os.addEventListener('blur',save);
    os.dataset.preferenceBound='1';
  }

  function applyPreferences(){
    const hardware=document.querySelector('#hardwareModel');
    const os=document.querySelector('#osVersion');
    const note=document.querySelector('#deviceNote');

    const savedHardware=localStorage.getItem(HW_KEY);
    const savedOS=localStorage.getItem(OS_KEY);
    const reportedOS=browserReportedIOS();

    if(hardware){
      if(savedHardware)hardware.value=savedHardware;
      if(!hardware.dataset.preferenceBound){
        const save=()=>{const v=hardware.value.trim();if(v)localStorage.setItem(HW_KEY,v)};
        hardware.addEventListener('change',save);
        hardware.addEventListener('blur',save);
        hardware.dataset.preferenceBound='1';
      }
    }

    if(os){
      if(savedOS)os.value=savedOS;
      else if(reportedOS)os.value=`${reportedOS} (browser-reported)`;
      else os.value='';
      bindEditableIOS(os);
    }

    if(note&&reportedOS&&!savedOS&&!note.textContent.includes('browser UA')){
      note.textContent += ` iOS version from the browser UA (${reportedOS}) may be frozen; tap the OS field to enter the real version.`;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyPreferences,{once:true});
  else applyPreferences();
  addEventListener('pageshow',applyPreferences);
  setTimeout(applyPreferences,150);
})();
