(() => {
 'use strict';
 const $=id=>document.getElementById(id),left=$('left'),right=$('right'),modelLeft=$('model-left'),modelRight=$('model-right');
 let mode='forest',transition=null,color='aqua',running=true,time=0,last=performance.now(),manual=-10,busy=false,cancelled=false,gaze=null,target=[0,0],lastDraw=-Infinity;
 let tracking=[0,0],velocity=[0,0],glass=[0,0],lag=[0,0],followMix=0,attention=0,pointerInside=false,lastMove=-20,lastReact=-20;
 // Version the browser-only preset so earlier experimental controls cannot
 // distort the stable public default after a visual update.
 const storageKey='a1-eye-animation:settings:v3';
 const numericIds=['eye-size','eye-width','eye-height','roundness','rim','eye-gap','eye-tilt','pupil-size','iris-size','iris-oval','pupil-oval','texture','shine','gaze-x','gaze-y','upper-lid','lower-lid','micro','expression','eye-pulse','pupil-pulse','highlight-motion','texture-flow','motion-speed','blink-every','blink-depth','blink-offset'];
 const keyFor=id=>id.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
 const profiles=Object.freeze({
  forest:{mode:'forest',behavior:'gentle',color:'aqua',shapePreset:'shellGem',eyeSize:100,eyeWidth:100,eyeHeight:100,roundness:84,rim:3,eyeGap:100,eyeTilt:0,pupilSize:100,irisSize:100,irisOval:100,pupilOval:100,texture:76,shine:98,pattern:'silk',pupilStyle:'round',gazeX:0,gazeY:0,upperLid:0,lowerLid:0,micro:28,expression:72,eyePulse:28,pupilPulse:54,highlightMotion:52,textureFlow:48,motionSpeed:100,blinkEvery:5.5,blinkDepth:100,blinkOffset:9,autoGaze:true,syncEyes:true,autoBlink:true,ambient:true},
  focus:{mode:'curious',behavior:'curious',color:'aqua',shapePreset:'softWide',eyeSize:103,eyeWidth:96,eyeHeight:100,roundness:88,rim:3,eyeGap:100,eyeTilt:0,pupilSize:112,irisSize:100,irisOval:100,pupilOval:100,texture:82,shine:108,pattern:'cloud',pupilStyle:'round',gazeX:0,gazeY:-12,upperLid:3,lowerLid:1,micro:36,expression:80,eyePulse:28,pupilPulse:54,highlightMotion:52,textureFlow:48,motionSpeed:100,blinkEvery:5.5,blinkDepth:100,blinkOffset:9,autoGaze:true,syncEyes:true,autoBlink:true,ambient:true},
  night:{mode:'idle',behavior:'sleepy',color:'violet',shapePreset:'softOval',eyeSize:100,eyeWidth:100,eyeHeight:88,roundness:76,rim:4,eyeGap:100,eyeTilt:0,pupilSize:76,irisSize:96,irisOval:94,pupilOval:110,texture:60,shine:82,pattern:'ripple',pupilStyle:'slit',gazeX:0,gazeY:8,upperLid:12,lowerLid:3,micro:22,expression:64,eyePulse:18,pupilPulse:44,highlightMotion:35,textureFlow:34,motionSpeed:82,blinkEvery:6.5,blinkDepth:90,blinkOffset:9,autoGaze:true,syncEyes:true,autoBlink:true,ambient:true}
 });
 const paletteDefaults={aqua:['#06324b','#52e0cf'],amber:['#3d170d','#f2a64d'],violet:['#21133e','#bd91f2'],caramel:['#4a2612','#e3a45e'],smoky:['#35191a','#b97058'],moon:['#10294b','#54b9d4'],mint:['#123a35','#58c49a'],rose:['#4a2030','#dc8f91']};
 const behaviorModes={gentle:'forest',curious:'curious',shy:'playful',happy:'happy',surprise:'surprise',sleepy:'sleepy'};
 const config=()=>({mode,color,behavior:$('behavior').value,shapePreset:$('shape-preset').value,roundness:+$('roundness').value/100,rim:+$('rim').value/10,eyeSize:+$('eye-size').value/100,eyeWidth:+$('eye-width').value/100,eyeHeight:+$('eye-height').value/100,eyeGap:+$('eye-gap').value,eyeTilt:+$('eye-tilt').value,pupilSize:+$('pupil-size').value/100,irisSize:+$('iris-size').value/100,irisOval:+$('iris-oval').value/100,pupilOval:+$('pupil-oval').value/100,colorTop:$('color-top').value,colorBottom:$('color-bottom').value,texture:+$('texture').value/100,shine:+$('shine').value/100,pattern:$('pattern').value,pupilStyle:$('pupil-style').value,gazeX:+$('gaze-x').value,gazeY:+$('gaze-y').value,upperLid:+$('upper-lid').value,lowerLid:+$('lower-lid').value,micro:+$('micro').value/100,expression:+$('expression').value/100,eyePulse:+$('eye-pulse').value/100,pupilPulse:+$('pupil-pulse').value/100,highlightMotion:+$('highlight-motion').value/100,textureFlow:+$('texture-flow').value/100,speed:+$('motion-speed').value/100,blinkEvery:+$('blink-every').value,blinkDepth:+$('blink-depth').value/100,blinkOffset:+$('blink-offset').value/100,autoGaze:$('auto-gaze').checked,syncEyes:$('sync-eyes').checked,autoBlink:$('auto-blink').checked,ambient:$('ambient').checked});
 function outputValue(id,value){if(id==='blink-every')return Number(value).toFixed(1)+'s';if(['gaze-x','gaze-y','eye-tilt'].includes(id))return (Number(value)>0?'+':'')+value;return value+'%'}
 function syncRange(id){const input=$(id),output=$(id+'-value');if(output)output.textContent=outputValue(id,input.value)}
 function updateStageLayout(){const p=config(),base=Math.min(window.innerWidth*.36,360);left.style.width='';right.style.width='';document.documentElement.style.setProperty('--eye-gap',`${Math.max(12,Math.min(150,base*.36*p.eyeGap/100))}px`)}
 function setActiveMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode))}
 function resetMotion(){transition=null;time=0;manual=-10;lastMove=0;lastReact=-20;gaze=null;attention=0;lastDraw=-Infinity;last=performance.now()}
 function settings(){const value={version:4,mode,behavior:$('behavior').value,color,shapePreset:$('shape-preset').value,colorTop:$('color-top').value,colorBottom:$('color-bottom').value,profile:$('profile').value,fps:$('fps').value,follow:$('follow').checked,pupilStyle:$('pupil-style').value,pattern:$('pattern').value};for(const id of numericIds)value[keyFor(id)]=$(id).value;for(const id of ['auto-gaze','sync-eyes','auto-blink','ambient'])value[keyFor(id)]=$(id).checked;return value}
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify(settings()))}catch(_){/* Private browsing can deny local storage. */}}
 function selectCustom(){if($('profile').value!=='custom')$('profile').value='custom'}
 function applySettings(value){
  if(!value||typeof value!=='object')return;
  const hasMode=typeof value.mode==='string'&&!!document.querySelector(`[data-mode="${value.mode}"]`);
  if(hasMode)setActiveMode(value.mode);
  const hasBehavior=typeof value.behavior==='string'&&[...$('behavior').options].some(option=>option.value===value.behavior);
  if(hasBehavior)$('behavior').value=value.behavior;
  const hasColor=typeof value.color==='string'&&[...$('color').options].some(option=>option.value===value.color);
  if(hasColor){color=value.color;$('color').value=color}
  if(typeof value.shapePreset==='string'&&[...$('shape-preset').options].some(option=>option.value===value.shapePreset))$('shape-preset').value=value.shapePreset;
  const palette=hasColor?paletteDefaults[color]:null;
  for(const [id,index] of [['color-top',0],['color-bottom',1]]){
   const key=keyFor(id);
   if(typeof value[key]==='string')$(id).value=value[key];
   else if(palette)$(id).value=palette[index];
  }
  for(const id of numericIds)if(value[keyFor(id)]!=null){
   const next=value[keyFor(id)];
   const input=$(id),number=Number(next);if(Number.isFinite(number))input.value=String(Math.max(+input.min,Math.min(+input.max,number)));
  }
  if(typeof value.pupilStyle==='string'&&[...$('pupil-style').options].some(option=>option.value===value.pupilStyle))$('pupil-style').value=value.pupilStyle;
 if(typeof value.pattern==='string'&&[...$('pattern').options].some(option=>option.value===value.pattern))$('pattern').value=value.pattern;
  if(value.fps&&[...$('fps').options].some(option=>option.value===String(value.fps)))$('fps').value=String(value.fps);
  if(typeof value.follow==='boolean')$('follow').checked=value.follow;
  for(const id of ['auto-gaze','sync-eyes','auto-blink','ambient'])if(typeof value[keyFor(id)]==='boolean')$(id).checked=value[keyFor(id)];
  if(typeof value.profile==='string'&&profiles[value.profile])$('profile').value=value.profile;else $('profile').value='custom';
  numericIds.forEach(syncRange);updateStageLayout();
  // A named behavior selects its matching mode. Explicit manual behavior keeps
  // special expression buttons (heart, cry, forest actions, etc.) intact.
  if(hasBehavior&&value.behavior!=='manual'&&behaviorModes[value.behavior])setActiveMode(behaviorModes[value.behavior]);
  else if(!hasMode&&$('behavior').value!=='manual'&&behaviorModes[$('behavior').value])setActiveMode(behaviorModes[$('behavior').value]);
 }
 function applyProfile(name){const profile=profiles[name];if(!profile)return;applySettings({...profile,profile:name});resetMotion();persist()}
 function restore(){try{const saved=JSON.parse(localStorage.getItem(storageKey));applySettings(saved)}catch(_){/* Start from the visible defaults if saved data is invalid. */}}
 function renderEye(c,t,opts,side){
  const g=opts.gaze?[opts.gaze[0]+(side?-1:1)*(opts.attention||0)*2,opts.gaze[1]]:undefined;
  Eyes.render(c,t,{...opts,gaze:g,side});
 }
 function draw(t,opts=config(),withTransition=true){
  const blend=withTransition&&transition?Eyes.smooth(transition.elapsed/.58):1;
  renderEye(left,t,opts,0);renderEye(right,opts.syncEyes?t:t+.055,opts,1);
  const modelOpts={...opts,transparentBackground:true};
  renderEye(modelLeft,t,modelOpts,0);renderEye(modelRight,opts.syncEyes?t:t+.055,modelOpts,1);
  if(blend<1)for(let side=0;side<2;side++){
   for(const [targetCanvas,sourceCanvas] of [[side?right:left,transitionCanvases[side]],[side?modelRight:modelLeft,modelTransitionCanvases[side]]]){const c=targetCanvas.getContext('2d');c.save();c.globalAlpha=1-blend;c.drawImage(sourceCanvas,0,0);c.restore()}
  }
 }
 // Capture the displayed composite so a second click midway never jumps back
 // to an earlier expression. This preview transition never enters a sequence export.
 const transitionCanvases=[canvas(360,360),canvas(360,360)],modelTransitionCanvases=[canvas(360,360),canvas(360,360)];
 function tick(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(transition&&!busy){transition.elapsed+=dt;if(transition.elapsed>=.58)transition=null}
  if(running&&!busy){
   const opts=config();time+=dt*opts.speed;const auto=Eyes.state(time,mode),following=$('follow').checked&&pointerInside;
   const goal=following?target:(opts.autoGaze?[auto.x,auto.y]:[opts.gazeX*.66,opts.gazeY*.57]);
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
 restore();
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
  if(b.dataset.mode===mode||busy)return;
  transitionCanvases[0].getContext('2d').drawImage(left,0,0);transitionCanvases[1].getContext('2d').drawImage(right,0,0);
  modelTransitionCanvases[0].getContext('2d').drawImage(modelLeft,0,0);modelTransitionCanvases[1].getContext('2d').drawImage(modelRight,0,0);
   transition={elapsed:0};setActiveMode(b.dataset.mode);const behavior=Object.keys(behaviorModes).find(key=>behaviorModes[key]===b.dataset.mode);$('behavior').value=behavior||'manual';selectCustom();resetMotion();transition={elapsed:0};persist();
 });
 $('fps').onchange=()=>{lastDraw=-Infinity;persist()};
  document.querySelectorAll('.tuning input[type="range"]').forEach(input=>{const update=()=>{if(['gaze-x','gaze-y'].includes(input.id)){$('behavior').value='manual';$('auto-gaze').checked=false;gaze=null;followMix=0;pointerInside=false}syncRange(input.id);lastDraw=-Infinity;selectCustom();updateStageLayout();persist()};input.oninput=update;syncRange(input.id)});
  $('pupil-style').onchange=()=>{selectCustom();lastDraw=-Infinity;persist()};
  $('pattern').onchange=()=>{selectCustom();lastDraw=-Infinity;persist()};
 $('shape-preset').onchange=()=>{selectCustom();lastDraw=-Infinity;persist()};$('behavior').onchange=e=>{if(e.target.value!=='manual')setActiveMode(behaviorModes[e.target.value]||'idle');else {gaze=null;followMix=0;pointerInside=false;$('auto-gaze').checked=false}selectCustom();resetMotion();persist()};
 $('color').onchange=e=>{color=e.target.value;const colors=paletteDefaults[color];if(colors){$('color-top').value=colors[0];$('color-bottom').value=colors[1]}selectCustom();lastDraw=-Infinity;persist()};['color-top','color-bottom'].forEach(id=>$(id).oninput=()=>{selectCustom();lastDraw=-Infinity;persist()});['follow','auto-gaze','sync-eyes','auto-blink','ambient'].forEach(id=>$(id).onchange=()=>{selectCustom();lastDraw=-Infinity;persist()});
 $('profile').onchange=e=>{if(e.target.value!=='custom')applyProfile(e.target.value)};
 $('reset-settings').onclick=()=>applyProfile('forest');
 $('variation').onclick=()=>{const vary=(id,delta)=>{const input=$(id);input.value=String(Math.max(+input.min,Math.min(+input.max,Math.round(+input.value+delta))));syncRange(id)};vary('eye-width',(Math.random()-.5)*8);vary('eye-height',(Math.random()-.5)*8);vary('roundness',(Math.random()-.5)*10);vary('pupil-size',(Math.random()-.5)*8);vary('pupil-oval',(Math.random()-.5)*8);selectCustom();lastDraw=-Infinity;persist()};
 $('save-settings').onclick=()=>{const blob=new Blob([JSON.stringify(settings(),null,2)],{type:'application/json'});save(blob,'eye-settings.json')};
 $('load-settings').onclick=()=>$('settings-file').click();$('settings-file').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{applySettings(JSON.parse(await file.text()));selectCustom();persist();lastDraw=-Infinity;$('status').textContent='参数已导入'}catch(_){$('status').textContent='参数文件无效'}e.target.value=''};
 $('blink').onclick=()=>{manual=time;running=true;$('pause').textContent='暂停'};
 $('pause').onclick=()=>{running=!running;$('pause').textContent=running?'暂停':'继续'};
 $('hide').onclick=()=>document.body.classList.add('clean');$('show').onclick=()=>document.body.classList.remove('clean');
 $('show-model').onclick=()=>$('model-stage').scrollIntoView({behavior:'smooth',block:'start'});
 $('fullscreen').onclick=async()=>{try{await document.body.requestFullscreen();document.body.classList.add('clean')}catch(e){$('status').textContent='此浏览器未允许全屏；按 H 可隐藏面板'}};
 document.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON/.test(e.target.tagName)||busy)return;if(e.code==='Space'){e.preventDefault();$('pause').click()}if(e.code==='KeyB')$('blink').click();if(e.code==='KeyH')document.body.classList.toggle('clean');if(e.code==='Escape')document.body.classList.remove('clean')});
 function followPointer(e,previewLeft,previewRight){
  const l=previewLeft.getBoundingClientRect(),r=previewRight.getBoundingClientRect();
  const centerX=(l.left+r.right)/2,centerY=(l.top+l.bottom)/2;
  const next=[Math.max(-61,Math.min(61,(e.clientX-centerX)/Math.max(150,(r.right-l.left)/2)*61)),Math.max(-48,Math.min(48,(e.clientY-centerY)/Math.max(120,l.height*.7)*48))];
  const distance=Math.hypot(next[0]-target[0],next[1]-target[1]);
  if(distance>28&&time-lastReact>2.4&&$('follow').checked&&running){manual=time+.065;lastReact=time}
  if(distance>.8)lastMove=time;
  target=next;pointerInside=true;
 }
 $('stage').addEventListener('pointermove',e=>followPointer(e,left,right));
 $('model-stage').addEventListener('pointermove',e=>followPointer(e,modelLeft,modelRight));
 $('stage').addEventListener('pointerleave',()=>{pointerInside=false});
 $('model-stage').addEventListener('pointerleave',()=>{pointerInside=false});
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
 function renderSources(src,t,opts){renderEye(tmpL,t,opts,0);renderEye(tmpR,opts.syncEyes?t:t+.055,opts,1);copySources(src,tmpL,tmpR);draw(t,opts,false)}
 $('cancel').onclick=()=>{cancelled=true};
 $('export').onclick=async()=>{
  if(busy)return;busy=true;cancelled=false;const opts=config(),fps=+$('fps').value,duration=+$('duration').value,layout=$('layout').value,format=$('format').value,src=sources(layout),start=time;
  const controls=[...document.querySelectorAll('#panel button,#panel input,#panel select')].filter(x=>x.id!=='cancel');controls.forEach(x=>x.disabled=true);$('cancel').hidden=false;
  try{
   await Eyes.ready;
    const total=Math.round(duration*fps),files=[],meta={version:3,mode:opts.mode,color:opts.color,width:layout==='pair'?720:360,height:360,fps,frameCount:format==='still'?1:total,duration:format==='still'?0:duration,frameDurationSeconds:1/fps,layout,background:'#000000',eyeDiameterPx:360,startTime:format==='still'?start:0,frameIndexOrigin:0,order:layout==='pair'?'left then right':'left/ and right/',parameters:settings(),note:'Circular displays; corners black. PNG timestamps = frameIndex / fps, interval [0, duration). Export uses scripted gaze, independent of pointer.'};
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
  window.addEventListener('resize',updateStageLayout);
  window.EyeApp={draw,get time(){return time},setTime:t=>{time=t;running=false;transition=null;gaze=null;attention=0;draw(t);$('pause').textContent='继续'},setMode:m=>{const b=document.querySelector(`[data-mode="${m}"]`);if(b)b.click()}};
})();
