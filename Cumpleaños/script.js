const $=id=>document.getElementById(id);
// partículas flotantes
['🌸','🌺','🎈','🌷','🎈','🌼','🌸','🎈'].forEach((e,i)=>{for(let k=0;k<3;k++){
  const s=document.createElement('span');s.className='fl';s.textContent=e;
  s.style.left=Math.random()*96+'vw';s.style.fontSize=(22+Math.random()*26)+'px';
  s.style.setProperty('--dx',(Math.random()*160-80)+'px');
  s.style.animationDuration=(20+Math.random()*20)+'s';s.style.animationDelay=(-Math.random()*40)+'s';
  document.body.appendChild(s);}});

const back=$('back'),card=$('card');
$('gift').onclick=()=>{if(document.body.classList.contains('done'))return;back.classList.add('show');$('d').focus()};
back.addEventListener('keydown',e=>{if(e.key==='Enter')check()});
$('ok').onclick=check;
['d','m','y'].forEach(k=>$(k).addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'');e.target.style.borderColor=''}));
function bad(msg,k){$('err').textContent=msg;(k||[]).forEach(x=>$(x).style.borderColor='#e0245e');card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake')}
function check(){
  const d=+$('d').value,m=+$('m').value,y=+$('y').value;
  if(!(d>=1&&d<=31))return bad('El día debe ser del 1 al 31',['d']);
  if(!(m>=1&&m<=12))return bad('El mes debe ser del 1 al 12',['m']);
  if(!(y>=1900&&y<=2026))return bad('El año debe ser de 1900 a 2026',['y']);
  const t=new Date(y,m-1,d);
  if(t.getMonth()!==m-1)return bad('Esa fecha no existe en el calendario',['d','m']);
  if(d===16&&m===11&&y===1983){back.classList.remove('show');celebrate()}
  else bad('Mmm, esa no es la fecha... inténtalo de nuevo 💜');
}
function burst(n){
  const r=$('box').getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height*.2,cols=['#ff4f8b','#ffd23f','#3ec1ff','#7cf29a','#c77dff','#ff8a3d','#fff'];
  for(let i=0;i<n;i++){
    const c=document.createElement('div');c.className='cf';
    c.style.cssText+=`left:${x}px;top:${y}px;background:${cols[i%7]};border-radius:${Math.random()<.4?'50%':'2px'}`;
    document.body.appendChild(c);
    const dx=(Math.random()-.5)*Math.min(innerWidth,700),up=120+Math.random()*320,fall=innerHeight*.7+Math.random()*200;
    c.animate([{transform:'translate(0,0) rotate(0)',opacity:1},
      {offset:.35,transform:`translate(${dx*.7}px,${-up}px) rotate(${Math.random()*360}deg)`,opacity:1},
      {transform:`translate(${dx}px,${fall}px) rotate(${Math.random()*1080}deg)`,opacity:0}],
      {duration:2600+Math.random()*2200,easing:'cubic-bezier(.2,.6,.4,1)'}).onfinish=()=>c.remove();
  }
}
function petal(){
  const p=document.createElement('div');const s=10+Math.random()*12;
  p.style.cssText=`position:fixed;top:-30px;left:${Math.random()*100}vw;width:${s}px;height:${s*1.3}px;border-radius:80% 0 80% 0;background:radial-gradient(circle at 30% 30%,#ff5d73,#b3122c);pointer-events:none;z-index:12;opacity:.9`;
  document.body.appendChild(p);
  const dx=(Math.random()-.5)*200;
  p.animate([{transform:'translate(0,0) rotate(0) rotateY(0)'},{transform:`translate(${dx}px,${innerHeight+60}px) rotate(${Math.random()*720}deg) rotateY(540deg)`}],
    {duration:6000+Math.random()*5000,easing:'ease-in-out'}).onfinish=()=>p.remove();
}
const P=(x,y,z,i,d)=>`<svg viewBox="-50 -50 100 100" style="left:${x-z/2}%;top:${y-z/2}%;width:${z}%;height:${z}%;animation-delay:${d}s,${d}s">${i}</svg>`;
const flower=(n,pc,sc,cc,rx,ry,cy)=>{let o='';for(let i=0;i<n;i++)o+=`<ellipse cy="${-cy}" rx="${rx}" ry="${ry}" fill="${pc}" stroke="${sc}" stroke-width="3" transform="rotate(${360/n*i})"/>`;return o+`<circle r="12" fill="${cc}" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`};
const heart='<path d="M0 32C-48 0-32-38 0-14C32-38 48 0 0 32Z" fill="none" stroke="#e8606e" stroke-width="8" stroke-linejoin="round"/>';
const spark='<path d="M-24 14L-34-10M0 8L0-26M24 14L34-10" stroke="#e8a830" stroke-width="8" stroke-linecap="round"/>';
const dot=c=>`<circle r="40" fill="${c}"/>`;
const branch=f=>{let o=`<path d="M${-42*f} 24Q0 14 ${42*f}-18" stroke="#7a9a52" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  [[-24,2,-50],[-10,24,40],[8,-8,-55],[18,18,35],[34,-14,-40]].forEach(l=>o+=`<ellipse cx="${l[0]*f}" cy="${l[1]}" rx="7" ry="15" fill="#8fae5e" transform="rotate(${l[2]*f} ${l[0]*f} ${l[1]})"/>`);return o};
$('deco').innerHTML=[P(76,14,27,flower(5,'#f5a3b5','#e27f9a','#f2c14e',15,22,24),.2),P(15,12,13,heart,.35),P(91,41,11,heart,.5),
 P(9,38,17,flower(6,'#f7b24f','#ef8f2f','#d9611e',11,17,19),.45),P(53,6,11,spark,.6),
 P(50,87,21,flower(5,'#f5a3b5','#e27f9a','#c9506f',15,22,24),.8),P(21,89,26,branch(1),.9),P(79,89,26,branch(-1),.9),
 P(6,24,3,dot('#e8606e'),.6),P(24,29,2.4,dot('#f2c14e'),.7),P(94,63,3,dot('#f2c14e'),.7),P(7,66,3,dot('#e8606e'),.8),P(62,3,2.4,dot('#e8606e'),.8)].join('');
function celebrate(){
  document.body.classList.add('done');$('stage').classList.add('open');
  setTimeout(()=>burst(110),1000);setTimeout(()=>burst(90),2000);setTimeout(()=>burst(80),3300);
  setTimeout(()=>{
    $('msg').style.display='flex';
    [[-4,-3],[93,-3],[-4,92],[93,92]].forEach((q,i)=>{const r=document.createElement('span');r.className='rose';r.textContent='🌹';
      r.style.left=q[0]+'%';r.style.top=q[1]+'%';r.style.animationDelay=(i*.15)+'s,'+(i*.3)+'s';$('badge').appendChild(r)});
  },1500);
  setInterval(petal,260);for(let i=0;i<12;i++)setTimeout(petal,i*120);
  setInterval(()=>burst(35),6000);
}
