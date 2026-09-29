(()=>{
  'use strict';
  const see=document.querySelector('#seeResults');
  const share=document.querySelector('#shareResults');
  const modal=document.querySelector('#resultsModal');
  if(!see||!share||!modal)return;

  function sync(){
    const available=!share.disabled;
    see.hidden=!available;
    see.disabled=!available;
  }

  see.addEventListener('click',()=>{
    if(see.disabled)return;
    modal.classList.remove('hidden');
    const status=document.querySelector('#status');
    if(status)status.textContent='Comparison complete.';
  });

  new MutationObserver(sync).observe(share,{attributes:true,attributeFilter:['disabled']});
  sync();
})();
