(() => {
 'use strict';
 const $=id=>document.getElementById(id),left=$('left'),right=$('right');
 let mode='forest',transition=null,color='aqua',running=true,time=0,last=performance.now(),manual=-10,busy=false,cancelled=false,gaze=null,target=[0,0],lastDraw=-Infinity;
 let tracking=[0,0],velocity=[0,0],glass=[0,0],lag=[0,0],followMix=0,attention=0,pointerInside=false,lastMove=-20,lastReact=-20;
 const config=()=>({mode,color});
 function renderEye(c,t,opts,side){
  const g=opts.gaze?[opts.gaze[0]+(side?-1:1)*(opts.attention||0)*2,opts.gaze[1]]:undefined;
  Eyes.render(c,t,{...opts,gaze:g,side});
 }
 function draw(t,opts=config(),withTransition=true){
  const blend=withTransition&&transition?Eyes.smooth(transition.elapsed/.58):1;
  renderEye(left,t,opts,0);renderEye(right,t,opts,1);
  if(blend<1)for(let side=0;side<2;side++){
   const c=(side?right:left).getContext('2d');c.save();c.globalAlpha=1-blend;c.drawImage(transitionCanvases[side],0,0);c.restore();
  }
 }
 // Capture the displayed composite so a second click midway never jumps back
 // to an earlier expression. This preview transition never enters a sequence export.
 const transitionCanvases=[canvas(360,360),canvas(360,360)];
 function tick(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(transition&&!busy){transition.elapsed+=dt;if(transition.elapsed>=.58)transition=null}
  if(running&&!busy){
   time+=dt;const auto=Eyes.state(time,mode),following=$('follow').checked&&pointerInside;
   const goal=following?target:[auto.x,auto.y];
   followMix+=((following?1:0)-followMix)*(1-Math.exp(-dt*9));
   // A damped spring initiates a glance quickly, then settles softly; substeps
   // keep the response stable at both low and high display refresh rates.
   const count=Math.max(1,Math.ceil(dt*120)),step=dt/count;
   for(let n=0;n<count;n++)for(let i=0;i<2;i++){
    velocity[i]+=(170*(goal[i]-tracking[i])-22*velocity[i])*step;
    tracking[i]+=velocity[i]*step;
   }
   glass=glass.map((v,i)=>v+(tracking[i]-v)*(1-Math.exp(-dt*7)));
   lag=glass.map((v,i)=>Math.max(-14,Math.min(14,v-tracking[i])));
   const held=time-lastMove>.55?1:0;
   gaze=followMix>.002?[
    auto.x*(1-followMix)+(tracking[0]+held*.65*Math.sin(time*3.7))*followMix,
    auto.y*(1-followMix)+(tracking[1]+held*.45*Math.sin(time*2.9))*followMix
   ]:null;
   const interest=following?.35+.55*Math.exp(-Math.max(0,time-lastMove)*2):0;
   attention+=(interest-attention)*(1-Math.exp(-dt*5));
  }
  const fps=+$('fps').value;
  if(!busy&&(!running||now-lastDraw>=1000/fps-.5)){
   const sampled=running?Math.floor((time+1e-9)*fps)/fps:time;
   draw(sampled,{...config(),gaze,lag:gaze?lag:undefined,attention,blink:Eyes.blink(sampled,manual)});
   lastDraw=now-(Math.max(0,now-lastDraw)%(1000/fps)||0);
  }
  requestAnimationFrame(tick);
 }requestAnimationFrame(tick);
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
  if(b.dataset.mode===mode||busy)return;
  transitionCanvases[0].getContext('2d').drawImage(left,0,0);transitionCanvases[1].getContext('2d').drawImage(right,0,0);
  transition={elapsed:0};mode=b.dataset.mode;time=0;manual=-10;lastMove=0;lastReact=-20;lastDraw=-Infinity;last=performance.now();
  document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));
 });
 $('fps').onchange=()=>{lastDraw=-Infinity};
 $('color').onchange=e=>{color=e.target.value};$('blink').onclick=()=>{manual=time;running=true;$('pause').textContent='暂停'};
 $('pause').onclick=()=>{running=!running;$('pause').textContent=running?'暂停':'继续'};
 $('hide').onclick=()=>document.body.classList.add('clean');$('show').onclick=()=>document.body.classList.remove('clean');
 $('fullscreen').onclick=async()=>{try{await document.body.requestFullscreen();document.body.classList.add('clean')}catch(e){$('status').textContent='此浏览器未允许全屏；按 H 可隐藏面板'}};
 document.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON/.test(e.target.tagName)||busy)return;if(e.code==='Space'){e.preventDefault();$('pause').click()}if(e.code==='KeyB')$('blink').click();if(e.code==='KeyH')document.body.classList.toggle('clean');if(e.code==='Escape')document.body.classList.remove('clean')});
 $('stage').addEventListener('pointermove',e=>{
  const l=left.getBoundingClientRect(),r=right.getBoundingClientRect();
  const centerX=(l.left+r.right)/2,centerY=(l.top+l.bottom)/2;
  const next=[Math.max(-61,Math.min(61,(e.clientX-centerX)/Math.max(150,(r.right-l.left)/2)*61)),Math.max(-48,Math.min(48,(e.clientY-centerY)/Math.max(120,l.height*.7)*48))];
  const distance=Math.hypot(next[0]-target[0],next[1]-target[1]);
  if(distance>28&&time-lastReact>2.4&&$('follow').checked&&running){manual=time+.065;lastReact=time}
  if(distance>.8)lastMove=time;
  target=next;pointerInside=true;
 });
 $('stage').addEventListener('pointerleave',()=>{pointerInside=false});
 window.addEventListener('blur',()=>{pointerInside=false});
 const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0};
 const enc=new TextEncoder();
 function header(size,values){const a=new Uint8Array(size),v=new DataView(a.buffer);for(const [offset,n,bytes]of values)bytes===2?v.setUint16(offset,n,true):v.setUint32(offset,n,true);return a}
 function zip(files){const local=[],central=[];let offset=0,size=0;for(const f of files){const name=enc.encode(f.name),data=f.data,checksum=crc(data);const h=header(30,[[0,0x04034b50,4],[4,20,2],[6,0x800,2],[14,checksum,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]]);local.push(h,name,data);const z=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[16,checksum,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,offset,4]]);central.push(z,name);offset+=h.length+name.length+data.length;size+=z.length+name.length}return new Blob([...local,...central,header(22,[[0,0x06054b50,4],[8,files.length,2],[10,files.length,2],[12,size,4],[16,offset,4]])],{type:'application/zip'})}
 const png=c=>new Promise((resolve,reject)=>c.toBlob(async b=>b?resolve(new Uint8Array(await b.arrayBuffer())):reject(Error('PNG 编码失败')),'image/png'));
 function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)}
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 function sources(layout){return layout==='separate'?[{name:'left',c:canvas(360,360)},{name:'right',c:canvas(360,360)}]:[{name:'pair',c:canvas(720,360)}]}
 const tmpL=canvas(360,360),tmpR=canvas(360,360);
 function copySources(src,l,r){for(const s of src){const c=s.c.getContext('2d');if(s.name==='pair'){c.drawImage(l,0,0);c.drawImage(r,360,0)}else c.drawImage(s.name==='left'?l:r,0,0)}}
 function renderSources(src,t,opts){renderEye(tmpL,t,opts,0);renderEye(tmpR,t,opts,1);copySources(src,tmpL,tmpR);draw(t,opts,false)}
 $('cancel').onclick=()=>{cancelled=true};
 $('export').onclick=async()=>{
  if(busy)return;busy=true;cancelled=false;const opts=config(),fps=+$('fps').value,duration=+$('duration').value,layout=$('layout').value,format=$('format').value,src=sources(layout),start=time;
  const controls=[...document.querySelectorAll('#panel button,#panel input,#panel select')].filter(x=>x.id!=='cancel');controls.forEach(x=>x.disabled=true);$('cancel').hidden=false;
  try{
   await Eyes.ready;
   const total=Math.round(duration*fps),files=[],meta={version:2,mode:opts.mode,color:opts.color,width:layout==='pair'?720:360,height:360,fps,frameCount:format==='still'?1:total,duration:format==='still'?0:duration,frameDurationSeconds:1/fps,layout,background:'#000000',eyeDiameterPx:360,startTime:format==='still'?start:0,frameIndexOrigin:0,order:layout==='pair'?'left then right':'left/ and right/',note:'Circular displays; corners black. PNG timestamps = frameIndex / fps, interval [0, duration). Export uses scripted gaze, independent of pointer.'};
   if(format==='webm'){
    if(!window.MediaRecorder)throw Error('此浏览器不支持视频录制，请选择 PNG 序列帧');
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw Error('此浏览器不支持 WebM，请选择 PNG 序列帧');
    renderSources(src,0,opts);
    const recs=src.map(s=>{const stream=s.c.captureStream(fps),rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000}),chunks=[];const done=new Promise((resolve,reject)=>{rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>resolve(new Blob(chunks,{type:mime}));rec.onerror=()=>reject(Error('视频录制失败'))});rec.start();return {s,rec,stream,done}});
    const begin=performance.now();
    try{while((performance.now()-begin)/1000<duration){if(cancelled)break;const t=(performance.now()-begin)/1000;renderSources(src,t,opts);$('status').textContent=`录制 ${Math.min(100,Math.round(t/duration*100))}% · 请保持窗口在前台`;await sleep(1000/fps)}}finally{recs.forEach(r=>{r.rec.stop();r.stream.getTracks().forEach(t=>t.stop())})}
    const blobs=await Promise.all(recs.map(r=>r.done));if(cancelled)throw Error('已取消导出');for(let i=0;i<recs.length;i++)files.push({name:recs[i].s.name+'.webm',data:new Uint8Array(await blobs[i].arrayBuffer())});meta.note+=' WebM is real-time capture; actual frame rate depends on browser performance.';
   }else if(format==='still'){
    copySources(src,left,right);meta.includesTransition=!!transition;for(const s of src)files.push({name:s.name+'.png',data:await png(s.c)});
   }else{
    // Chunked sprite sheets keep images within typical GPU texture limits.
    const cols=layout==='pair'?4:8,rows=4,perSheet=cols*rows,sheets=src.map(s=>canvas(s.c.width*cols,360*rows));
    if(format==='sheet'){meta.columns=cols;meta.rows=rows;meta.framesPerSheet=perSheet;meta.frameOrder='row-major';meta.lastSheetValidFrames=total%perSheet||perSheet}
    for(let i=0;i<total;i++){
     if(cancelled)throw Error('已取消导出');renderSources(src,i/fps,opts);
     for(let j=0;j<src.length;j++){const s=src[j];if(format==='sequence')files.push({name:`${s.name}/${String(i).padStart(5,'0')}.png`,data:await png(s.c)});else{const sheet=sheets[j],c=sheet.getContext('2d'),cell=i%perSheet;if(cell===0){c.fillStyle='#000';c.fillRect(0,0,sheet.width,sheet.height)}c.drawImage(s.c,(cell%cols)*s.c.width,Math.floor(cell/cols)*360);if(cell===perSheet-1||i===total-1)files.push({name:`${s.name}/sheet_${String(Math.floor(i/perSheet)).padStart(3,'0')}.png`,data:await png(sheet)})}}
     if(i%4===0){$('status').textContent=`生成 ${i+1} / ${total} 帧 · ${Math.round((i+1)/total*100)}%`;await sleep(0)}
    }
   }
   if(cancelled)throw Error('已取消导出');files.push({name:'manifest.json',data:enc.encode(JSON.stringify(meta,null,2))});$('status').textContent='正在打包…';await sleep(20);save(zip(files),`eyes_${opts.mode}_${format}_${fps}fps.zip`);$('status').textContent='导出完成 · 已下载 ZIP，内含画面和参数说明';
  }catch(e){$('status').textContent=e.message||'导出失败，请重试'}finally{busy=false;time=start;last=performance.now();controls.forEach(x=>x.disabled=false);$('cancel').hidden=true}
 };
 window.EyeApp={draw,get time(){return time},setTime:t=>{time=t;running=false;transition=null;gaze=null;attention=0;draw(t);$('pause').textContent='继续'},setMode:m=>{const b=document.querySelector(`[data-mode="${m}"]`);if(b)b.click()}};
})();
