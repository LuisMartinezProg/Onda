/* Menu lateral: cambiar de vista */
$('#nav').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;view=b.dataset.v;document.querySelectorAll('.side [data-v]').forEach(x=>x.classList.toggle('on',x==b));render()};
