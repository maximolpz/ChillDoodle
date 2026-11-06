const $=s=>document.querySelector(s),mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const show=id=>document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id==id));
let SRC,mask,T={x:0,y:0,s:1},tool='fill',col='#ff5a5f',undo=[],redo=[],shown=true,drag=null;
const C=mk(1,1),L=mk(1,1),cx=C.getContext('2d',{willReadFrequently:true}),stage=$('#stage'),vp=$('#vp');L.id='L';stage.append(C,L);

let loadedCategories = {};
let activeCategory = 'all';

$('#folder').onchange = e => handleFiles(e.target.files);

const dropArea = $('#drop-area');
dropArea.ondragover = e => { e.preventDefault(); dropArea.classList.add('drag'); };
dropArea.ondragleave = () => dropArea.classList.remove('drag');
dropArea.ondrop = e => {
  e.preventDefault();
  dropArea.classList.remove('drag');
  if (e.dataTransfer.items) {
    const queue = [];
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const entry = e.dataTransfer.items[i].webkitGetAsEntry();
      if (entry) queue.push(entry);
    }
    processEntries(queue);
  } else {
    handleFiles(e.dataTransfer.files);
  }
};

function processEntries(queue) {
  function readEntry(entry) {
    if (entry.isFile) {
      return new Promise(resolve => {
        entry.file(file => {
          file.fullPath = entry.fullPath;
          resolve(file);
        });
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      return new Promise(resolve => {
        reader.readEntries(entries => {
          Promise.all(entries.map(e => readEntry(e))).then(res => {
            resolve(res.flat());
          });
        });
      });
    }
    return Promise.resolve([]);
  }

  Promise.all(queue.map(e => readEntry(e))).then(results => {
    handleFiles(results.flat());
  });
}

function handleFiles(files) {
  loadedCategories = {};
  const imageRegex = /\.(png|jpe?g|webp)$/i;

  Array.from(files).forEach(file => {
    if (!imageRegex.test(file.name)) return;

    const path = file.webkitRelativePath || file.fullPath || file.name;
    const parts = path.split('/').filter(p => p);
    
    let categoryName = 'General';
    if (parts.length > 2) {
      categoryName = parts[parts.length - 2];
    } else if (parts.length === 2) {
      categoryName = parts[0];
    }

    if (!loadedCategories[categoryName]) {
      loadedCategories[categoryName] = [];
    }

    loadedCategories[categoryName].push({
      name: file.name.replace(imageRegex, ''),
      file: file,
      url: URL.createObjectURL(file)
    });
  });

  renderCategoryTabs();
  renderGallery();
}

function renderCategoryTabs() {
  const tabBox = $('#tab-container');
  tabBox.innerHTML = '';

  const catNames = Object.keys(loadedCategories);
  if (catNames.length === 0) {
    boxEmpty();
    return;
  }

  const allBtn = document.createElement('button');
  allBtn.className = 'tab-btn act';
  allBtn.textContent = 'Todas';
  allBtn.onclick = () => filterCategory('all', allBtn);
  tabBox.append(allBtn);

  catNames.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = cat;
    btn.onclick = () => filterCategory(cat, btn);
    tabBox.append(btn);
  });
}

function filterCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('act'));
  if (btn) btn.classList.add('act');
  renderGallery();
}

function renderGallery() {
  const box = $('#gal');
  box.innerHTML = '';

  const catNames = Object.keys(loadedCategories);
  if (catNames.length === 0) {
    boxEmpty();
    return;
  }

  catNames.forEach(cat => {
    if (activeCategory !== 'all' && activeCategory !== cat) return;

    loadedCategories[cat].forEach(item => {
      const d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = `<img src="${item.url}" alt="${item.name}">
                     <span style="display:block;margin-top:6px;font-size:13px;font-weight:bold">${item.name}</span>
                     <span class="mut">${cat}</span>`;
      d.onclick = () => load(item.url);
      box.append(d);
    });
  });
}

function boxEmpty() {
  $('#gal').innerHTML = '<p class="mut" style="grid-column:1/-1;text-align:center;padding:20px">No se encontraron carpetas cargadas. Elegí o arrastrá una carpeta arriba para empezar.</p>';
}

function load(src){
  const im=new Image();
  im.onload=()=>{
    const m=Math.max(im.width,im.height),s=Math.min(1800/m,2);
    SRC=mk(Math.round(im.width*s),Math.round(im.height*s));
    const x=SRC.getContext('2d');
    x.fillStyle='#fff'; x.fillRect(0,0,SRC.width,SRC.height);
    x.drawImage(im,0,0,SRC.width,SRC.height);
    prep();
  };
  im.onerror=()=>alert('No se pudo abrir la imagen seleccionada.');
  im.src=src;
}

$('#file-single').onchange=e=>{
  const f=e.target.files[0];
  if(f){
    if(f.size>20e6) alert('La imagen pesa más de 20 MB.');
    else load(URL.createObjectURL(f));
  }
  e.target.value='';
};

function prep(){
  show('prep'); $('#pvbox').append(L);
  proc();
}

$('#th').oninput=()=>{ proc(); };

function proc(){
  const W=SRC.width, H=SRC.height, n=W*H;
  const s=SRC.getContext('2d').getImageData(0,0,W,H).data;
  const gr=new Float32Array(n);
  for(let i=0;i<n;i++) gr[i]=.299*s[i*4]+.587*s[i*4+1]+.114*s[i*4+2];
  const t=+$('#th').value;
  L.width=W; L.height=H;
  const o=L.getContext('2d'), im=o.createImageData(W,H), d=im.data;
  for(let i=0;i<n;i++){
    const v = gr[i]<t ? 0 : 255;
    d[i*4]=d[i*4+1]=d[i*4+2]=v; d[i*4+3]=255;
  }
  o.putImageData(im,0,0);
}

function start(){
  const W=L.width, H=L.height;
  C.width=W; C.height=H;
  cx.fillStyle='#fff'; cx.fillRect(0,0,W,H);
  stage.style.width=W+'px'; stage.style.height=H+'px';
  stage.append(L);
  shown=true; L.style.visibility='';
  const d=L.getContext('2d').getImageData(0,0,W,H).data;
  mask=new Uint8Array(W*H);
  for(let i=0;i<W*H;i++) mask[i]=d[i*4]<128;
  undo=[]; redo=[];
  show('edit');
  requestAnimationFrame(fit);
}

const apply=()=>stage.style.transform='translate('+T.x+'px,'+T.y+'px) scale('+T.s+')';
function fit(){
  const r=vp.getBoundingClientRect(), s=Math.min(r.width/C.width, r.height/C.height)*.96;
  T={s, x:(r.width-C.width*s)/2, y:(r.height-C.height*s)/2};
  apply();
}

function zoomAt(c,f){
  const r=vp.getBoundingClientRect(), px=c[0]-r.left, py=c[1]-r.top;
  const ns=Math.min(12,Math.max(.05,T.s*f));
  f=ns/T.s; T.x=px-(px-T.x)*f; T.y=py-(py-T.y)*f; T.s=ns;
}

const pt=e=>{
  const r=vp.getBoundingClientRect();
  return[(e.clientX-r.left-T.x)/T.s, (e.clientY-r.top-T.y)/T.s];
};

const snap=()=>{
  undo.push(cx.getImageData(0,0,C.width,C.height));
  if(undo.length>12) undo.shift();
  redo=[];
};

function swap(a,b){
  if(!a.length) return;
  b.push(cx.getImageData(0,0,C.width,C.height));
  cx.putImageData(a.pop(),0,0);
}

const c32=h=>((255<<24)|(parseInt(h.slice(5,7),16)<<16)|(parseInt(h.slice(3,5),16)<<8)|parseInt(h.slice(1,3),16))>>>0;

function doFill(x,y){
  x|=0; y|=0;
  const W=C.width, H=C.height;
  const drawnData = cx.getImageData(0,0,W,H).data;
  const isBlocked = (idx) => {
    if (mask[idx]) return true;
    const p = idx * 4;
    return (drawnData[p] < 240 || drawnData[p+1] < 240 || drawnData[p+2] < 240);
  };

  let i0=-1;
  for(const[a,b] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[2,2],[-2,2],[2,-2],[-2,-2]]){
    const xx=x+a, yy=y+b;
    if(xx>=0&&yy>=0&&xx<W&&yy<H&&!isBlocked(yy*W+xx)){
      i0=yy*W+xx; break;
    }
  }
  if(i0<0) return;
  
  snap();
  const im=cx.getImageData(0,0,W,H), d=new Uint32Array(im.data.buffer), px=c32(col), seen=new Uint8Array(W*H), st=[i0];
  seen[i0]=1;
  while(st.length){
    const i=st.pop(); d[i]=px; const xx=i%W; let j;
    if(xx>0&&!seen[j=i-1]&&!isBlocked(j)){seen[j]=1;st.push(j)}
    if(xx<W-1&&!seen[j=i+1]&&!isBlocked(j)){seen[j]=1;st.push(j)}
    if(i>=W&&!seen[j=i-W]&&!isBlocked(j)){seen[j]=1;st.push(j)}
    if(i<W*(H-1)&&!seen[j=i+W]&&!isBlocked(j)){seen[j]=1;st.push(j)}
  }
  cx.putImageData(im,0,0);
}

function stroke(a,b){
  cx.lineCap=cx.lineJoin='round';
  cx.lineWidth=+$('#sz').value;
  cx.strokeStyle=tool=='erase'?'#fff':col;
  cx.beginPath(); cx.moveTo(a[0],a[1]); cx.lineTo(b[0]+.01,b[1]); cx.stroke();
}

const P=new Map();
vp.onpointerdown=e=>{
  vp.setPointerCapture(e.pointerId);
  P.set(e.pointerId,[e.clientX,e.clientY]);
  if(P.size>1){
    if(drag&&drag.t=='b') cx.putImageData(undo.pop(),0,0);
    drag={t:'z'}; return;
  }
  const p=pt(e);
  if(tool=='hand'||e.button==1) drag={t:'p'};
  else if(tool=='fill') drag={t:'f',x:e.clientX,y:e.clientY,p};
  else { snap(); drag={t:'b',p}; stroke(p,p); }
};

vp.onpointermove=e=>{
  const q=P.get(e.pointerId); if(!q||!drag) return;
  if(drag.t=='z'){
    if(P.size!=2) return;
    const o=[...P.values()], oc=[(o[0][0]+o[1][0])/2,(o[0][1]+o[1][1])/2], od=Math.hypot(o[0][0]-o[1][0],o[0][1]-o[1][1]);
    P.set(e.pointerId,[e.clientX,e.clientY]);
    const n=[...P.values()], nc=[(n[0][0]+n[1][0])/2,(n[0][1]+n[1][1])/2], nd=Math.hypot(n[0][0]-n[1][0],n[0][1]-n[1][1]);
    zoomAt(nc,nd/(od||1)); T.x+=nc[0]-oc[0]; T.y+=nc[1]-oc[1]; apply(); return;
  }
  const dx=e.clientX-q[0], dy=e.clientY-q[1];
  P.set(e.pointerId,[e.clientX,e.clientY]);
  if(drag.t=='f'&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8) drag.t='p';
  if(drag.t=='p'){ T.x+=dx; T.y+=dy; apply(); }
  else if(drag.t=='b'){ const p=pt(e); stroke(drag.p,p); drag.p=p; }
};

vp.onpointerup=vp.onpointercancel=e=>{
  if(drag&&drag.t=='f'&&e.type=='pointerup'&&P.size==1) doFill(drag.p[0],drag.p[1]);
  P.delete(e.pointerId); if(!P.size) drag=null;
};

vp.onwheel=e=>{
  e.preventDefault();
  zoomAt([e.clientX,e.clientY],Math.exp(-e.deltaY*.0015));
  apply();
};

document.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{
  tool=b.dataset.t;
  document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('act',x==b));
});

$('#bu').onclick=()=>swap(undo,redo);
$('#br').onclick=()=>swap(redo,undo);
$('#bf').onclick=fit;
$('#bl').onclick=()=>{ shown=!shown; L.style.visibility=shown?'':'hidden'; };
$('#bh').onclick=()=>{ if(confirm('¿Volver al inicio? Se perderá lo pintado.')) show('home'); };
$('#bx').onclick=()=>{
  const t=mk(C.width,C.height), x=t.getContext('2d');
  x.drawImage(C,0,0);
  if(shown){ x.globalCompositeOperation='multiply'; x.drawImage(L,0,0); }
  const a=document.createElement('a');
  a.href=t.toDataURL('image/png');
  a.download='chill-doodle.png';
  a.click();
};

const PAL='#e63946 #f4a261 #ffd166 #fff176 #b5e48c #52b788 #2d6a4f #06d6a0 #48cae4 #4895ef #3a0ca3 #7209b7 #f72585 #ff8fab #ffcad4 #8d5524 #c68642 #ffdbac #adb5bd #6c757d #212529 #ffffff #fb8500 #9d4edd'.split(' ');
function setCol(c,el){ col=c; document.querySelectorAll('.sw').forEach(x=>x.classList.toggle('act',x==el)); }
PAL.forEach(c=>{
  const b=document.createElement('button');
  b.className='sw'; b.style.background=c;
  b.onclick=()=>{ setCol(c,b); $('#cc').value=c; };
  $('#pal').append(b);
});
$('#cc').oninput=e=>setCol(e.target.value,null);

boxEmpty();
