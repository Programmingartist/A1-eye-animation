/* Procedural animation matched to the supplied eight-expression reference.
 * All geometry uses a 360 x 360 circular display coordinate system. */
(() => {
 'use strict';
 const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)},mix=(a,b,t)=>a+(b-a)*t;
 const palettes={aqua:[190,207],amber:[35,24],violet:[270,232]},textures=new Map();
 const forestFiles=['glass','backdrop'];
 const forestAssets=Object.fromEntries(forestFiles.map(name=>{const image=new Image();image.src=window.ForestAssetData?.[name]||`assets/forest-${name}.png`;return[name,image]}));
 const forestReady=Promise.all(Object.values(forestAssets).map(image=>image.complete&&image.naturalWidth?Promise.resolve():new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error(`无法加载森林图层：${image.src}`))})));
 function disk(c,x,y,r,fill){c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}
 function ellipse(c,x,y,rx,ry,fill,rot=0){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fill()}
 function radial(c,x,y,r,stops){const g=c.createRadialGradient(x,y,0,x,y,r);for(const [p,v]of stops)g.addColorStop(p,v);return g}
 function softLight(c,x,y,rx,ry,rotation,stops){
  c.save();c.translate(x,y);c.rotate(rotation);c.scale(rx,ry);disk(c,0,0,1,radial(c,-.12,-.16,1.15,stops));c.restore();
 }
 function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
 function texture(color){
  if(textures.has(color))return textures.get(color);
  const can=document.createElement('canvas');can.width=can.height=640;
  const c=can.getContext('2d'),[h,h2]=palettes[color]||palettes.aqua,rnd=random(5193);
  c.translate(320,320);c.beginPath();c.arc(0,0,312,0,TAU);c.clip();
  const body=c.createLinearGradient(0,-312,0,312);
  body.addColorStop(0,`hsl(${h2} 94% 15%)`);body.addColorStop(.38,`hsl(${h2} 93% 28%)`);body.addColorStop(.75,`hsl(${h} 95% 44%)`);body.addColorStop(1,`hsl(${h} 92% 62%)`);disk(c,0,0,312,body);
  // Broad curved facets and translucent clouds, without anatomical fibers.
  for(let i=0;i<36;i++){
   const a=rnd()*TAU,r=160+rnd()*140;
   c.save();c.translate(Math.cos(a)*r,Math.sin(a)*r);c.rotate(a);
   c.scale(.5+rnd()*.4,.5+rnd());disk(c,0,0,28+rnd()*55,radial(c,0,0,83,[[0,`hsla(${h},92%,${45+rnd()*35}%,${.09+rnd()*.15})`],[1,'transparent']]));c.restore();
  }
  for(let i=0;i<28;i++){
   const a=rnd()*TAU,r=245+rnd()*47;c.lineCap='round';c.lineWidth=3+rnd()*5;c.strokeStyle=`hsla(${h},92%,85%,${.08+rnd()*.16})`;
   c.beginPath();c.arc(0,0,r,a,a+.03+rnd()*.09);c.stroke();
  }
  disk(c,0,0,312,radial(c,0,0,312,[[0,'#0000'],[.79,'#0000'],[.93,'#03456222'],[.985,'#063449d9'],[1,'#102c3e']]));
  textures.set(color,can);return can;
 }
 function blink(t,start,amount=1,slow=1){const x=(t-start)/slow;if(x<0||x>.43)return 0;if(x<.105)return smooth(x/.105)*amount;if(x<.135)return amount;return(1-smooth((x-.135)/.295))*amount}
 function forestBlink(t,start,amount=1,slow=1){const x=(t-start)/slow;if(x<0||x>.58)return 0;if(x<.15)return smooth(x/.15)*amount;if(x<.21)return amount;if(x<.3)return mix(amount,amount*.9,smooth((x-.21)/.09));return(1-smooth((x-.3)/.28))*amount}
 function gaze(t,points){let a=points[0];for(let i=1;i<points.length;i++){const b=points[i];if(t<b[0]){const distance=Math.hypot(b[1]-a[1],b[2]-a[2]),u=clamp((t-a[0])/Math.min(.62+distance*.003,b[0]-a[0])),k=smooth(u);
   // A small curved route and a soft follow-through replace mechanical straight slides.
   const lift=Math.sin(Math.PI*u)**2,settle=Math.sin(TAU*u)*lift*.025;
   return[mix(a[1],b[1],k+settle),mix(a[2],b[2],k)-Math.min(3,distance*.055)*lift]}a=b}return[a[1],a[2]]}
 function state(time,mode='idle',side=0){
  const t=((time%12)+12)%12,bt=t-side*.014;
  const s={x:0,y:0,pupil:1,close:0,top:-17,bottom:377,tilt:0,arc:0,lowerArc:0,t,mode,side};
  [s.x,s.y]=gaze(t,[[0,0,0],[1,0,0],[3,24,-13],[5,-29,8],[7,-10,-12],[9.3,19,1],[11.1,0,0],[12,0,0]]);
  for(const at of [2.15,6.4,6.86,10.7])s.close=Math.max(s.close,blink(bt,at,at===6.86?.8:1));
  if(mode==='heart'){s.x=3*Math.sin(t*TAU/6);s.y=2*Math.sin(t*TAU/4);s.close=0}
  else if(mode==='happy'){
   // Keep the smile readable while leaving a little iris visible. The old
   // hard-coded close=1 made this expression look permanently asleep.
   const giggle=((1-Math.cos(t*TAU/4))/2)**6;
   s.close=Math.max(.68*giggle,blink(bt,4.6),blink(bt,10.65));
   s.top=14;s.bottom=294-7*giggle;s.arc=-7;s.lowerArc=-40;
   s.x*=.48;s.y=-8-5*giggle;s.pupil=1.035;
  }else if(mode==='angry'){
   s.top=104;s.tilt=side?-30:30;s.arc=-7;s.bottom=289;s.lowerArc=-12;
   s.x=(side?-7:7)+3*Math.sin(t*TAU/3);s.y=1;s.pupil=.95;
  }else if(mode==='hot'){
   s.top=133;s.arc=0;s.x=7*Math.sin(t*TAU/6);s.y=-7;s.pupil=.98;s.close=Math.max(.08,blink(bt,5.2,1,1.8));
  }else if(mode==='sleepy'){
   s.top=202+8*Math.sin(t*TAU/6);s.bottom=301;s.lowerArc=3;s.y=46+8*Math.sin(t*TAU/6);s.x=8*Math.sin(t*TAU/12);
   s.close=Math.max(blink(bt,3.2,1,3.7),blink(bt,9.2,1,3.7));
  }else if(mode==='superhappy'){
   s.x=12*Math.sin(t*TAU/6);s.y=-12-6*Math.sin(t*TAU/3)**2;s.pupil=1.04;s.bottom=247+6*Math.sin(t*TAU/3);s.lowerArc=-14;
   s.close=Math.max(blink(bt,4.3,.93,1.3),blink(bt,10.3,.93,1.3));
  }else if(mode==='cry'){
   s.top=120;s.tilt=side?32:-32;s.arc=3;s.bottom=349;s.y=28;s.x=4*Math.sin(t*TAU/4);s.pupil=1.06;
   s.close=Math.max(blink(bt,4.4,.95,1.5),blink(bt,10.4,.95,1.5));
  }else if(mode==='cross'){
   s.x=(side?-1:1)*(53+5*Math.sin(t*TAU/6));s.y=7+4*Math.sin(t*TAU/4);s.pupil=.96;
  }else if(mode.startsWith('forest')){
   s.forestScale=1;s.forestEnergy=1;s.forestMotion=1;
   [s.x,s.y]=gaze(t,[[0,0,0],[1.2,0,0],[3.2,13,-7],[5.3,-11,6],[7.5,9,7],[9.6,-8,-5],[11.1,0,0],[12,0,0]]);
   s.close=Math.max(forestBlink(bt,3.6),forestBlink(bt,9.25));
   if(mode==='forest-blink'){
    s.close=Math.max(s.close,...[1.15,3.35,5.7,8.05,10.35].map(at=>forestBlink(bt,at,1,1.08)));
   }else if(mode==='forest-look'){
    [s.x,s.y]=gaze(t,[[0,0,0],[.8,0,0],[1.35,-38,-8],[2.65,-38,-8],[2.95,-43,-7],[3.28,-38,-8],[4.05,38,-5],[5.55,38,-5],[5.85,43,-4],[6.18,38,-5],[7.05,0,18],[8.5,0,18],[9.25,0,0],[12,0,0]]);
    s.forestMotion=.82;
   }else if(mode==='forest-surprise'){
    const phase=t%4;let pulse=0,anticipation=0;
    if(phase<.42)anticipation=smooth(phase/.42);
    else if(phase<.68)pulse=smooth((phase-.42)/.26);
    else if(phase<1.75)pulse=1-smooth((phase-.68)/1.07);
    s.forestScale=1-.035*anticipation+.145*pulse;s.forestEnergy=1+1.25*pulse;s.forestMotion=1+.42*pulse;s.forestFocus=pulse;
    s.x=4*Math.sin(t*TAU/6)*(1-pulse);s.y=2*anticipation-9*pulse;s.close=0;
   }else if(mode==='forest-sleepy'){
    s.close=.38+.065*Math.sin(t*TAU/6);s.close=Math.max(s.close,forestBlink(bt,3.1,1,2.45),forestBlink(bt,9.1,1,2.45));
    s.x=7*Math.sin(t*TAU/12);s.y=14+3*Math.sin(t*TAU/6);s.forestMotion=.55;
   }else if(mode==='forest-tremor'){
    const phase=side*.43,burst=Math.pow(.5+.5*Math.sin(t*TAU/4-1.1+phase*.12),8);
    s.x=3.5*Math.sin(t*TAU/12);s.y=1.5*Math.sin(t*TAU/6);
    s.forestTremorX=.72*Math.sin(t*TAU*7.25+phase)+.38*Math.sin(t*TAU*10.5+.7+phase)+burst*1.45*Math.sin(t*TAU*3.25+phase);
    s.forestTremorY=.58*Math.sin(t*TAU*8.5+.9+phase)+.3*Math.sin(t*TAU*12.25+phase)+burst*1.05*Math.sin(t*TAU*4.25+.4+phase);
    s.forestMotion=.68;
   }
  }else if(mode==='curious'){
   [s.x,s.y]=gaze(t,[[0,0,0],[.7,0,0],[2.7,-42,-24],[4.6,42,-12],[6.2,26,25],[8.1,-33,9],[9.8,0,-25],[11.2,0,0],[12,0,0]]);
  }else if(mode==='surprise'){
   s.pupil=1.1+.05*Math.sin(t*TAU/6);s.y=-14;s.x=12*Math.sin(t*TAU/6);
  }else if(mode==='playful'){
   s.bottom=289;s.lowerArc=-13;s.x=23*Math.sin(t*TAU/6);s.y=-8;s.close=Math.max(blink(bt,side?2.5:8.5,1,2),blink(bt,5.5));
  }
  // Tiny phase-shifted offsets keep the pair alive even when the gaze is still.
  s.pupil+=.017*Math.sin(t*TAU/4)+.008*Math.sin(t*TAU/2+side*.8);
  s.x+=.65*Math.sin(t*TAU/6+side*.35);s.y+=1.3*Math.sin(t*TAU/3)-(mode.startsWith('forest')?0:s.close*5);
  return s;
 }
 // Project three different optical depths on a rotating globe. The recessed pupil
 // travels less than the iris; reflections belong to the front cornea / light source.
 function optics(s){
  const yaw=clamp(s.x/100,-.66,.66),pitch=clamp(s.y/108,-.53,.53);
  const sx=Math.sin(yaw),sy=Math.sin(pitch),cx=Math.cos(yaw),cy=Math.cos(pitch);
  const ix=180+115*sx,iy=182+110*sy;
  // The pupil sits deeper and eases toward the iris center, strengthening
  // parallax without the pasted-on feel of a flat translation.
  const depthEase=.84+.08*cx;
  const pupil={x:180+87*sx*depthEase,y:182+82*sy*depthEase};
  let hx=(46-(ix-180)*.76)/cx,hy=(-68-(iy-182)*.78)/cy;
  const len=Math.hypot(hx,hy),limit=84;if(len>limit){hx*=limit/len;hy*=limit/len}
  return {yaw,pitch,iris:{x:ix,y:iy},pupil,glint:{x:ix+hx*cx-hy*sx*sy,y:iy+hy*cy},
   matrix:[cx,0,-sx*sy,cy],squeeze:cx*cy};
 }
 function plane(c,o,center){c.translate(center.x,center.y);c.transform(o.matrix[0]*.96,o.matrix[1],o.matrix[2],o.matrix[3]*1.035,0,0)}
 function iris(c,s,color){
  const R=114,[h,h2]=palettes[color]||palettes.aqua,o=optics(s),lag=s.lag||[0,0];
  const px=(o.pupil.x-o.iris.x)/o.matrix[0],py=(o.pupil.y-o.iris.y)/o.matrix[3];
  // Narrow contact shadow follows the rotated rim, never an untranslated round disk.
  c.save();plane(c,o,{x:o.iris.x-2*Math.sin(o.yaw),y:o.iris.y+3});
  disk(c,0,0,120,radial(c,0,0,120,[[0,'#153e5058'],[.94,'#153e5058'],[1,'#153e5000']]));c.restore();
  c.save();plane(c,o,o.iris);
  c.drawImage(texture(color),-R*1.026,-R*1.026,R*2.052,R*2.052);
  c.beginPath();c.arc(0,0,R,0,TAU);c.clip();
  // Iris bowl shading changes sides when the gaze turns. This is independent of texture.
  const rim=c.createLinearGradient(-114,0,114,0);
  rim.addColorStop(0,`rgba(0,15,40,${.06+Math.max(0,o.yaw)*.4})`);
  rim.addColorStop(.48,'#00152700');rim.addColorStop(1,`rgba(0,15,40,${.06+Math.max(0,-o.yaw)*.4})`);
  disk(c,0,0,R,rim);
  const p=74*s.pupil;
  // Recessed pupil and translucent inner lip have their own center.
  disk(c,px,py,p+9,radial(c,px,py,p+9,[[0,'#001728'],[.82,'#00293ddd'],[1,'#00495e00']]));
  disk(c,px,py,p,radial(c,px-16,py-32,p*1.8,[[0,'#001426'],[.43,'#02283e'],[.8,'#07516b'],[1,`hsl(${h} 86% 32%)`]]));
  c.save();c.beginPath();c.arc(px,py,p,0,TAU);c.clip();
  for(let i=0;i<6;i++){
   const depth=.35+i*.16,xx=px-Math.sin(o.yaw)*20*depth+Math.sin(i*2.9+s.t*TAU/12)*20+lag[0]*depth*.18;
   const yy=py-Math.sin(o.pitch)*17*depth-40+i*16+lag[1]*depth*.18;
   c.save();c.translate(xx,yy);c.rotate(i*.9+.2*Math.sin(s.t*TAU/6));c.scale(1.1,.65);
   disk(c,0,0,43,radial(c,0,0,43,[[0,`hsla(${h2},88%,${i%2?12:57}%,.21)`],[1,'transparent']]));c.restore();
  }
  // A restrained deep caustic follows refraction, not the painted iris.
  c.save();c.translate(px-Math.sin(o.yaw)*17+lag[0]*.12,py+49-Math.sin(o.pitch)*14);c.scale(1,.38);
  disk(c,0,0,43,radial(c,0,0,43,[[0,'#81e9ec45'],[.5,'#4fd6e321'],[1,'#4fd6e300']]));c.restore();
  c.restore();
  c.lineCap='round';c.strokeStyle=`hsla(${h},90%,80%,.38)`;c.lineWidth=2;
  c.beginPath();c.arc(px,py,p+4,.18*Math.PI,.8*Math.PI);c.stroke();
  c.strokeStyle=`hsla(${h},90%,78%,.42)`;c.lineWidth=3;
  c.beginPath();c.arc(-Math.sin(o.yaw)*7,-Math.sin(o.pitch)*6,103,.2*Math.PI,.78*Math.PI);c.stroke();
  if(s.mode==='superhappy')for(const [a,b,col]of [[-.73,.16,'#ee6fd4aa'],[2.67,3.48,'#61e8bca6']]){
   c.strokeStyle=col;c.lineWidth=7;c.beginPath();c.arc(0,0,111,a,b);c.stroke();
  }
  const beads=[[-84,-46,3.4],[-68,-73,2.6],[-36,-95,2.8],[5,-103,2.5],[84,-26,3.5],[92,8,2.8],[82,47,4],[56,78,3.4],[-65,76,2.8],[-91,26,2.4]];
  for(let i=0;i<beads.length;i++){const [xx,yy,r]=beads[i],a=.16+.08*Math.sin(s.t*TAU/3+i);disk(c,xx,yy,r*.75,`rgba(215,255,255,${a})`)}
  c.restore();
  // Front cornea stays rounder than the iris. Lighting uses screen coordinates,
  // so highlights slide across the lens while the deeper eye rotates underneath.
  c.save();c.save();plane(c,o,o.iris);c.beginPath();c.arc(0,0,114,0,TAU);c.restore();c.clip();
  const hx=o.glint.x+lag[0]*.1,hy=o.glint.y+lag[1]*.1,lightAngle=.27-o.yaw*.25;
  // Broad reflected light, a luminous center, and a feathered boundary form
  // one curved reflection rather than three opaque white decals.
  c.save();c.globalAlpha=.96+.04*Math.sin(s.t*TAU/4);
  softLight(c,hx-3,hy+3,32,42,lightAngle,[[0,'#dfffff55'],[.5,'#c4f5ff20'],[1,'#a6e8ff00']]);
  softLight(c,hx,hy,18,24,lightAngle,[[0,'#fffffff5'],[.36,'#f7ffffec'],[.64,'#dcffff9c'],[.86,'#c5efff35'],[1,'#b8eaff00']]);
  softLight(c,hx+20,hy+17,8,12,lightAngle-.4,[[0,'#faffffcc'],[.35,'#e1ffff99'],[.76,'#c8f5ff30'],[1,'#b8eaff00']]);
  softLight(c,hx-22,hy-2,5,6,-.2,[[0,'#f7ffffaf'],[.5,'#d5f9ff64'],[1,'#b8eaff00']]);
  // A faint curved softbox reflection gives the upper lens volume.
  c.lineCap='round';c.lineWidth=12;c.strokeStyle='#e0faff0d';c.shadowColor='#c2efff28';c.shadowBlur=8;
  c.beginPath();c.ellipse(o.iris.x+2,o.iris.y+4,89,101,-o.yaw*.2,Math.PI*1.2,Math.PI*1.56);c.stroke();c.restore();
  const wetx=180+(o.iris.x-180)*.46+lag[0]*.2,wety=247+(o.iris.y-182)*.38+lag[1]*.2;
  c.save();c.translate(wetx,wety);c.rotate(-o.yaw*.22);c.scale(1,.4);
  disk(c,0,0,50,radial(c,0,0,50,[[0,'#9cfaff47'],[.6,'#61dcf718'],[1,'transparent']]));c.restore();
  c.lineWidth=2.1;c.lineCap='round';c.strokeStyle='#b1f9ff62';c.beginPath();
  c.ellipse(180+(o.iris.x-180)*.72,183+(o.iris.y-182)*.64,105,111,0,.27*Math.PI,.73*Math.PI);c.stroke();
  c.restore();
  return o;
 }
 function heart(c,x,y,t){
  const k=1+.045*Math.sin(t*TAU/1.5);c.save();c.translate(x,y);c.scale(k,k);
  const path=()=>{c.beginPath();c.moveTo(0,113);c.bezierCurveTo(-22,109,-126,45,-123,-32);c.bezierCurveTo(-122,-101,-49,-118,0,-65);c.bezierCurveTo(52,-117,124,-98,123,-32);c.bezierCurveTo(123,38,31,106,0,113);c.closePath()};
  path();const g=c.createLinearGradient(-45,-100,45,120);g.addColorStop(0,'#ff6897');g.addColorStop(.38,'#ff5263');g.addColorStop(.7,'#ed3156');g.addColorStop(1,'#b91c69');c.fillStyle=g;c.fill();
  c.save();path();c.clip();disk(c,47,-48,100,radial(c,47,-48,100,[[0,'#ffbd755b'],[1,'transparent']]));
  ellipse(c,-65,-63,28,13,'#ffc6d63b',-.38);disk(c,-43,76,74,radial(c,-43,76,74,[[0,'#7d178145'],[1,'transparent']]));c.restore();c.restore();
 }
 function flame(c,x,y,t){
  const sway=Math.sin(t*TAU*2)*6;c.save();c.translate(x,y);c.scale(1,1+.05*Math.sin(t*TAU*3));
  c.beginPath();c.moveTo(0,36);c.bezierCurveTo(-47,33,-43,1,-27,-21);c.bezierCurveTo(-30,-5,-10,0,-13,-26);c.bezierCurveTo(-17,-47,-2,-54,-9+sway,-72);c.bezierCurveTo(22,-62,25,-29,16,-17);c.bezierCurveTo(26,-22,32,-37,30,-42);c.bezierCurveTo(64,0,39,41,0,36);
  const g=c.createLinearGradient(0,-72,0,38);g.addColorStop(0,'#ff4a11');g.addColorStop(.6,'#ff7714');g.addColorStop(1,'#ffc31c');c.fillStyle=g;c.fill();
  c.beginPath();c.moveTo(0,34);c.bezierCurveTo(-23,20,-13,1,0,-14);c.bezierCurveTo(5,-22,7,-29,5,-39);c.bezierCurveTo(29,-15,26,22,0,34);c.fillStyle='#ffe943';c.fill();c.restore();
 }
 function droplet(c,x,y,size,alpha=1){
  c.save();c.globalAlpha=alpha;c.translate(x,y);c.scale(size/24,size/24);
  c.beginPath();c.moveTo(0,-29);c.bezierCurveTo(-4,-12,-19,0,-16,13);c.bezierCurveTo(-12,34,17,31,18,12);c.bezierCurveTo(19,-1,6,-15,0,-29);c.closePath();
  const g=c.createLinearGradient(-16,-10,16,25);g.addColorStop(0,'#d4fbffd9');g.addColorStop(.4,'#8ddff5c9');g.addColorStop(1,'#2b98c3ed');c.fillStyle=g;c.fill();c.strokeStyle='#e3fbff9c';c.lineWidth=1.5;c.stroke();ellipse(c,-7,7,3,9,'#fff9',.35);c.restore();
 }
 function tears(c,s){
  const wave=Math.sin(s.t*TAU/3)*3;
  const water=c.createLinearGradient(0,265,0,358);water.addColorStop(0,'#c5f8ff77');water.addColorStop(.6,'#65d7f4b0');water.addColorStop(1,'#ebffffdd');
  c.beginPath();c.moveTo(47,328);c.bezierCurveTo(74,280+wave,94,320,126,301);c.bezierCurveTo(162,280,184,329,218,308);c.bezierCurveTo(255,279-wave,289,301,316,328);c.lineTo(317,365);c.lineTo(43,365);c.closePath();c.fillStyle=water;c.fill();
  for(const [x,y,r]of [[78,321,24],[130,326,34],[230,324,39],[282,329,24]]){
   ellipse(c,x,y+wave,r,r*.6,radial(c,x-4,y-8,r,[[0,'#e9ffffa8'],[.5,'#94e7f57d'],[1,'#54c3e49c']]));
   c.strokeStyle='#f2ffffee';c.lineWidth=3;c.beginPath();c.ellipse(x,y+wave,r*.82,r*.5,-.15,Math.PI*1.12,Math.PI*1.8);c.stroke();
  }
  const phase=(s.t%3)/3;droplet(c,s.side?306:54,251+phase*81,15,Math.sin(phase*Math.PI)*.8);
 }
 function confetti(c,s){
  const rnd=random(3841+s.side*53),colors=['#ff4879','#ffdb3a','#b8f845','#40dce1','#d86cff','#ff9b38'];
  for(let i=0;i<27;i++){
   const base=rnd(),speed=1+(i%3),phase=(base+s.t*speed/12)%1;
   const x=26+rnd()*307+9*Math.sin(s.t*TAU/3+i),y=-20+phase*402;
   c.save();c.translate(x,y);c.rotate(rnd()*TAU+s.t*TAU/3*(i%2?1:-1));c.fillStyle=colors[i%colors.length];c.globalAlpha=.95;
   if(i%4===0){c.beginPath();c.ellipse(0,0,4,7,0,0,TAU);c.fill()}else{c.fillRect(-2,-7,4,12+rnd()*9)}c.restore();
  }
 }
 function leaf(c,x,y,len,width,angle,color,glow=0){
  c.save();c.translate(x,y);c.rotate(angle);if(glow){c.shadowColor=color;c.shadowBlur=glow}
  c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-width,-len*.32,-width*.72,-len*.78,0,-len);c.bezierCurveTo(width*.62,-len*.72,width*.5,-len*.25,0,0);c.fillStyle=color;c.fill();c.restore();
 }
 function stem(c,x,y,height,bend,color,width=4){
  c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+bend*.18,y-height*.35,x+bend*.72,y-height*.72,x+bend,y-height);c.stroke();
 }
 function flower(c,x,y,scale,wind){
  c.save();c.translate(x,y);c.rotate(wind*.012);c.scale(scale,scale);c.shadowColor='#eaff37';c.shadowBlur=11;
  const petals=[[0,-17,9,17,0],[-15,-6,10,17,-1.02],[-9,13,10,17,-2.42],[10,13,10,18,2.43],[16,-6,10,18,1.02]];
  for(const [px,py,rx,ry,r]of petals){const g=c.createRadialGradient(px-3,py-5,1,px,py,ry);g.addColorStop(0,'#fbff48');g.addColorStop(.58,'#e8ef26');g.addColorStop(1,'#a6c719');ellipse(c,px,py,rx,ry,g,r)}
  c.shadowBlur=7;ellipse(c,-2,-1,8,12,'#fff',.35);ellipse(c,1,-1,5,9,'#ffffd7',.35);c.restore();
 }
 function wing(c,path,fill,flap,shadow){
  c.save();c.scale(flap,1);c.shadowColor=shadow;c.shadowBlur=17;c.beginPath();path(c);c.closePath();c.fillStyle=fill;c.fill();c.restore();
 }
 function butterfly(c,x,y,scale,t,side){
  const phase=t*TAU*1.55+side*.45,flap=.62+.38*Math.abs(Math.sin(phase)),bob=Math.sin(t*TAU/3+side*.5)*2.2;
  c.save();c.translate(x,y+bob);c.rotate(-.19+.025*Math.sin(t*TAU/4));c.scale(scale,scale);
  const left=c.createLinearGradient(-46,-55,8,23);left.addColorStop(0,'#fff');left.addColorStop(.5,'#f4ffbf');left.addColorStop(1,'#d8ff4d');
  const right=c.createLinearGradient(0,-42,57,24);right.addColorStop(0,'#ecff62');right.addColorStop(.68,'#f8ffd0');right.addColorStop(1,'#fff');
  c.save();c.translate(-3,0);
  wing(c,p=>{p.moveTo(0,0);p.bezierCurveTo(-15,-18,-50,-61,-65,-50);p.bezierCurveTo(-78,-38,-53,4,-10,12)},left,flap,'#dfff70');
  wing(c,p=>{p.moveTo(-3,4);p.bezierCurveTo(-26,6,-48,26,-36,42);p.bezierCurveTo(-24,58,-4,29,4,12)},left,.7+.3*flap,'#dfff70');c.restore();
  c.save();c.translate(3,0);
  wing(c,p=>{p.moveTo(0,0);p.bezierCurveTo(12,-21,35,-60,50,-55);p.bezierCurveTo(69,-48,62,-10,12,12)},right,flap,'#efffa0');
  wing(c,p=>{p.moveTo(2,5);p.bezierCurveTo(24,4,47,18,42,35);p.bezierCurveTo(36,55,12,33,-4,13)},right,.7+.3*flap,'#efffa0');c.restore();
  const body=c.createLinearGradient(0,-12,0,34);body.addColorStop(0,'#ecff62');body.addColorStop(1,'#fff');ellipse(c,0,8,7,20,body,-.12);ellipse(c,1,30,4,13,'#fff',-.16);
  c.strokeStyle='#f6ffd8';c.lineWidth=1.2;c.beginPath();c.moveTo(-2,-8);c.quadraticCurveTo(-12,-23,-19,-25);c.moveTo(3,-8);c.quadraticCurveTo(15,-22,22,-20);c.stroke();c.restore();
 }
 function forestParticles(c,s,depth){
  const energy=s.forestEnergy||1,rnd=random(7421+s.side*97+depth*211);for(let i=0;i<(depth?15:10);i++){
   const base=rnd(),phase=(base+s.t*(.018+rnd()*.025))%1,x=38+rnd()*284+Math.sin(s.t*.8+i)*5+ s.x*(depth?.22:.08),y=55+((rnd()*260-phase*28+360)%290),r=1+rnd()*(depth?2.4:1.5);
   const pulse=.42+.58*Math.sin((s.t*.7+i*.31)*TAU)**2;c.save();c.globalAlpha=Math.min(1,pulse*energy);c.shadowColor=i%3?'#efff42':'#a8ffe4';c.shadowBlur=(7+r*3)*energy;disk(c,x,y,r*(.9+.1*energy),i%3?'#f4ff68':'#d8fff1');c.restore();
  }
 }
 function forestFallback(c,s){
  const px=s.x,py=s.y,wind=Math.sin(s.t*TAU/3)+.32*Math.sin(s.t*TAU/1.4+s.side),tilt=px*.0012;
  const outer=c.createLinearGradient(0,18,0,350);outer.addColorStop(0,'#052d88');outer.addColorStop(.18,'#006ea0');outer.addColorStop(.58,'#37dcb1');outer.addColorStop(.82,'#b8f898');outer.addColorStop(1,'#79b75c');disk(c,180,180,171,outer);
  disk(c,180,180,162,radial(c,143,110,190,[[0,'#16bfd2'],[.38,'#087b9e'],[.7,'#45e2aa'],[1,'#ceffa3']]));
  c.save();c.beginPath();c.arc(180,184,126,0,TAU);c.clip();c.translate(px*.07,py*.055);c.rotate(tilt);
  disk(c,180,184,129,radial(c,145,129,155,[[0,'#063945'],[.38,'#001c2c'],[.78,'#00121f'],[1,'#04332d']]));
  softLight(c,110,257,115,70,-.12,[[0,'#d9ff8b3d'],[.55,'#7ff58f1b'],[1,'transparent']]);
  c.save();c.translate(px*.08,py*.06);for(let i=0;i<7;i++){const x=58+i*44,b=wind*(3+i%3);stem(c,x,334,120+i%2*34,b,`rgba(${i%2?87:34},${i%2?145:119},${i%2?78:104},.34)`,5+i%3)}c.restore();
  c.save();c.translate(px*.15,py*.12);c.globalAlpha=.56;stem(c,182,340,196,wind*7,'#2e846f',7);leaf(c,166,257,75,11,-.8+wind*.02,'#3e8e67aa');leaf(c,193,235,77,11,.7+wind*.02,'#398a71a8');stem(c,107,329,139,wind*9,'#5a8f57',7);leaf(c,99,278,65,13,-1.03+wind*.03,'#88ae5f88');stem(c,247,335,159,wind*8,'#799f49',7);leaf(c,251,277,70,12,.78+wind*.03,'#a1c55488');c.restore();
  forestParticles(c,s,0);c.restore();
  c.save();c.beginPath();c.arc(180,180,164,0,TAU);c.clip();
  c.save();c.translate(px*.27,py*.2);stem(c,76,305,118,wind*5,'#80a831',5);flower(c,80+wind*5,185,1.05,wind);leaf(c,75,251,47,10,-.85+wind*.03,'#89b63b');c.restore();
  c.save();c.translate(px*.34,py*.28);butterfly(c,229,126,1.22,s.t,s.side);c.restore();
  forestParticles(c,s,1);c.restore();
  c.save();c.beginPath();c.arc(180,180,165,0,TAU);c.clip();
  softLight(c,91,259,140,83,-.22,[[0,'#d9ff9c3b'],[.55,'#a2ff9430'],[1,'transparent']]);
  const shine=c.createLinearGradient(55,53,243,271);shine.addColorStop(0,'#ffffff9a');shine.addColorStop(.13,'#dfffff3b');shine.addColorStop(.36,'#ffffff00');c.strokeStyle=shine;c.lineWidth=7;c.lineCap='round';c.beginPath();c.arc(180,180,151,3.58,5.08);c.stroke();
  softLight(c,269,198,35,84,-.2,[[0,'#b5fff23c'],[1,'transparent']]);c.restore();
  const rim=c.createLinearGradient(50,50,310,315);rim.addColorStop(0,'#6fa7ff80');rim.addColorStop(.34,'#ffffff18');rim.addColorStop(.7,'#d9ffb56e');rim.addColorStop(1,'#7cbd5ac4');c.strokeStyle=rim;c.lineWidth=8;c.beginPath();c.arc(180,180,166,0,TAU);c.stroke();
  disk(c,180,180,171,radial(c,136,104,203,[[0,'transparent'],[.83,'transparent'],[.96,'#003b6430'],[1,'#001d5154']]));
 }
 function drawForestAsset(c,name,tx,ty,sx,sy,rotation=0){
  const image=forestAssets[name];if(!image.complete||!image.naturalWidth)return false;
  c.save();c.translate(tx,ty);c.rotate(rotation);c.scale(sx,sy);c.translate(-tx,-ty);c.drawImage(image,0,0,360,360);c.restore();return true;
 }
 function forestPetal(c,angle,length,width,inner,outer){
  c.save();c.rotate(angle);const g=c.createLinearGradient(0,2,0,-length);g.addColorStop(0,inner);g.addColorStop(.58,outer);g.addColorStop(1,outer);
  c.beginPath();c.moveTo(-2,3);c.bezierCurveTo(-width*.82,-length*.23,-width*.78,-length*.7,-width*.2,-length*.95);c.quadraticCurveTo(0,-length*1.08,width*.2,-length*.95);c.bezierCurveTo(width*.78,-length*.7,width*.82,-length*.23,2,3);c.closePath();c.fillStyle=g;c.fill();c.restore();
 }
 function forestVectorFlower(c,x,y,wind){
  c.save();c.translate(x,y);c.rotate(wind*.022);c.shadowColor='#edff28';c.shadowBlur=12;
  const petals=[[-.62,33,17,'#f5f12a','#a9cb21'],[.48,34,17,'#fcf335','#bed92a'],[1.38,32,17,'#fff231','#dce92c'],[2.78,34,17,'#ffed2b','#f1da20'],[-1.72,32,16,'#ffef31','#d1df24']];
  for(const p of petals)forestPetal(c,...p);
  c.shadowColor='#fffbd7';c.shadowBlur=9;const center=c.createLinearGradient(-7,-10,8,11);center.addColorStop(0,'#fff');center.addColorStop(.65,'#ffffed');center.addColorStop(1,'#f4f58e');ellipse(c,-1,0,8,13,center,.36);c.restore();
 }
 function forestWing(c,path,gradient,transform,glow){
  c.save();transform(c);c.shadowColor=glow;c.shadowBlur=18;c.beginPath();path(c);c.closePath();c.fillStyle=gradient(c);c.fill();c.restore();
 }
 function forestVectorButterfly(c,x,y,flap,bob){
  c.save();c.translate(x,y+bob);c.rotate(-.02);c.scale(.88,.88);const fold=.93+.07*flap;
  c.save();c.shadowColor='#efff9a';c.shadowBlur=14;
  c.fillStyle='#fff';c.beginPath();c.moveTo(62,7);c.bezierCurveTo(83,0,94,5,94,15);c.bezierCurveTo(93,28,76,26,61,19);c.closePath();c.fill();
  c.beginPath();c.moveTo(-5,51);c.bezierCurveTo(-14,67,-14,82,-5,89);c.bezierCurveTo(5,96,10,78,4,58);c.closePath();c.fill();c.restore();
  forestWing(c,p=>{p.moveTo(0,5);p.bezierCurveTo(-16,-3,-39,-45,-83,-56);p.bezierCurveTo(-101,-61,-110,-57,-109,-44);p.bezierCurveTo(-106,-17,-72,9,-19,15)},ctx=>{const g=ctx.createLinearGradient(-92,-58,-3,11);g.addColorStop(0,'#fff');g.addColorStop(.42,'#fbffd8');g.addColorStop(1,'#ddff52');return g},ctx=>ctx.scale(fold,1),'#eaff8c');
  forestWing(c,p=>{p.moveTo(-1,4);p.bezierCurveTo(-19,-27,-17,-69,8,-99);p.bezierCurveTo(15,-108,23,-107,30,-99);p.bezierCurveTo(53,-74,48,-34,18,5)},ctx=>{const g=ctx.createLinearGradient(14,-103,8,8);g.addColorStop(0,'#fff');g.addColorStop(.4,'#fcfff0');g.addColorStop(1,'#dfff42');return g},ctx=>ctx.scale(1,fold),'#edff9b');
  forestWing(c,p=>{p.moveTo(3,5);p.bezierCurveTo(28,-20,56,-35,76,-23);p.bezierCurveTo(98,-10,100,24,77,42);p.bezierCurveTo(55,61,28,42,9,21)},ctx=>{const g=ctx.createLinearGradient(5,5,91,24);g.addColorStop(0,'#dcff4c');g.addColorStop(.54,'#f5ffb0');g.addColorStop(1,'#fff');return g},ctx=>ctx.scale(fold,1),'#eeffa2');
  forestWing(c,p=>{p.moveTo(-1,5);p.bezierCurveTo(-24,18,-35,40,-22,58);p.bezierCurveTo(-8,78,15,70,25,48);p.bezierCurveTo(32,31,23,16,7,7)},ctx=>{const g=ctx.createLinearGradient(0,3,1,69);g.addColorStop(0,'#dcff47');g.addColorStop(.56,'#f2ff9a');g.addColorStop(1,'#fff');return g},ctx=>ctx.scale(1,.94+.06*flap),'#eaff87');
  c.save();c.shadowColor='#e7ff5d';c.shadowBlur=16;ellipse(c,1,8,9,16,radial(c,-2,0,20,[[0,'#f3ff79'],[.68,'#dfff45'],[1,'#efffb8']]),-.1);c.restore();c.restore();
 }
 function forestEye(c,s){
  if(!forestFiles.every(name=>forestAssets[name].complete&&forestAssets[name].naturalWidth)){forestFallback(c,s);return}
  const motion=s.forestMotion||1,wind=(Math.sin(s.t*TAU/3)+.3*Math.sin(s.t*TAU/1.5+s.side*.7))*motion,px=s.x,py=s.y;
  const tremorX=s.forestTremorX||0,tremorY=s.forestTremorY||0,breath=1+.018*Math.sin(s.t*TAU/4+s.side*.28),expressionScale=(s.forestScale||1)*breath,coreX=182+px*.18+tremorX,coreY=185+py*.14+tremorY,coreScale=(1-Math.abs(px)/1250)*expressionScale;
  c.drawImage(forestAssets.backdrop,0,0,360,360);
  c.save();c.beginPath();c.ellipse(coreX,coreY,114*coreScale,114*expressionScale,0,0,TAU);c.clip();c.translate(tremorX,tremorY);
  c.save();c.translate(px*.035,py*.03);
  const dark=c.createRadialGradient(151,145,5,182,185,116);dark.addColorStop(0,'#06343c');dark.addColorStop(.48,'#001827');dark.addColorStop(.82,'#00131f');dark.addColorStop(.93,'#062a2ad9');dark.addColorStop(1,'#0c56521c');disk(c,182,185,116,dark);
  softLight(c,158,268,112,52,-.08,[[0,'#b6dc7350'],[.55,'#6c9d4c18'],[1,'transparent']]);
  c.lineCap='round';
  c.strokeStyle='#1e687078';c.lineWidth=6;c.beginPath();c.moveTo(180,299);c.bezierCurveTo(177,247,151,177,111,132);c.stroke();
  c.strokeStyle='#446e4d8c';c.lineWidth=12;c.beginPath();c.moveTo(164,302);c.bezierCurveTo(147,261,111,213,75,190);c.stroke();
  c.strokeStyle='#4f855b70';c.lineWidth=10;c.beginPath();c.moveTo(173,296);c.bezierCurveTo(143,253,104,239,74,221);c.stroke();
  c.fillStyle='#6a96564a';c.beginPath();c.moveTo(177,301);c.bezierCurveTo(147,248,105,202,72,186);c.bezierCurveTo(116,221,158,270,184,301);c.closePath();c.fill();
  c.fillStyle='#2a6d6660';c.beginPath();c.moveTo(181,300);c.bezierCurveTo(171,230,137,166,111,131);c.bezierCurveTo(151,173,183,244,188,300);c.closePath();c.fill();
  c.strokeStyle='#236056b0';c.lineWidth=7;c.beginPath();c.moveTo(183,300);c.bezierCurveTo(180,252,180+wind*1.3,194,217+wind*2.2,143);c.stroke();
  c.strokeStyle='#6c8f3c99';c.lineWidth=11;c.beginPath();c.moveTo(235,299);c.bezierCurveTo(242,253,240+wind*1.8,203,218+wind*2.6,165);c.stroke();
  c.strokeStyle='#80a84b62';c.lineWidth=8;c.beginPath();c.moveTo(234,299);c.bezierCurveTo(247,264,254+wind*2,229,249+wind*3,202);c.stroke();
  c.restore();
  forestParticles(c,s,0);c.restore();
  c.drawImage(forestAssets.glass,0,0,360,360);
  if(s.forestFocus){c.save();c.globalAlpha=s.forestFocus*.42;c.strokeStyle='#dfff9a';c.lineWidth=3;c.shadowColor='#baff76';c.shadowBlur=14;c.beginPath();c.ellipse(coreX,coreY,116*coreScale,116*expressionScale,0,0,TAU);c.stroke();c.restore()}
  c.save();c.beginPath();c.arc(180,180,177,0,TAU);c.clip();
  c.save();c.translate(px*.2,py*.16);forestVectorFlower(c,66,162,wind);c.restore();
  const flap=Math.sin(s.t*TAU*(.32+.1*motion)+s.side*.18)**2;
  forestVectorButterfly(c,227+px*.31,113+py*.25,flap,Math.sin(s.t*TAU/6+s.side*.4)*.7);
  forestParticles(c,s,1);
  c.save();c.globalCompositeOperation='screen';softLight(c,181-px*.04,296-py*.03,150,38,0,[[0,'#f4ffcb30'],[.6,'#baff9720'],[1,'transparent']]);c.restore();
  c.restore();
  c.save();c.beginPath();c.arc(180,180,176,0,TAU);c.clip();c.strokeStyle='#ffffff42';c.lineWidth=2.4;c.lineCap='round';c.beginPath();c.arc(181,181,165,2.44,3.77);c.stroke();c.restore();
 }
 function forestLids(c,s){
  const close=smooth(clamp(s.close));if(close<.002)return;
  const lowerProgress=Math.pow(close,1.28),top=-18+close*208,bottom=378-lowerProgress*188;
  const arch=30*(1-close)+3,tilt=Math.sin(s.t*TAU/6+s.side*.65)*2.2*(1-close);
  const upperEdge=()=>{c.beginPath();c.moveTo(-14,top+tilt);c.bezierCurveTo(76,top+arch*1.1,132,top+arch*1.7,180,top+arch*1.55);c.bezierCurveTo(232,top+arch*1.4,289,top+arch*.62,374,top-tilt)};
  const lowerEdge=()=>{c.beginPath();c.moveTo(-14,bottom-tilt*.3);c.bezierCurveTo(76,bottom-arch*.35,132,bottom-arch*.65,180,bottom-arch*.72);c.bezierCurveTo(235,bottom-arch*.68,292,bottom-arch*.28,374,bottom+tilt*.3)};
  const upper=c.createLinearGradient(0,10,0,top+arch);upper.addColorStop(0,'#020f19');upper.addColorStop(.68,'#07232f');upper.addColorStop(1,'#17454c');
  c.save();c.shadowColor='#001018';c.shadowBlur=13;c.shadowOffsetY=5;c.fillStyle=upper;c.beginPath();c.moveTo(-14,-14);c.lineTo(374,-14);c.lineTo(374,top-tilt);c.bezierCurveTo(289,top+arch*.62,232,top+arch*1.4,180,top+arch*1.55);c.bezierCurveTo(132,top+arch*1.7,76,top+arch*1.1,-14,top+tilt);c.closePath();c.fill();c.restore();
  const lower=c.createLinearGradient(0,bottom-arch,0,374);lower.addColorStop(0,'#17434a');lower.addColorStop(.26,'#082630');lower.addColorStop(1,'#020e18');
  c.save();c.shadowColor='#001018';c.shadowBlur=9;c.shadowOffsetY=-3;c.fillStyle=lower;c.beginPath();c.moveTo(-14,374);c.lineTo(374,374);c.lineTo(374,bottom+tilt*.3);c.bezierCurveTo(292,bottom-arch*.28,235,bottom-arch*.68,180,bottom-arch*.72);c.bezierCurveTo(132,bottom-arch*.65,76,bottom-arch*.35,-14,bottom-tilt*.3);c.closePath();c.fill();c.restore();
  c.save();c.globalAlpha=.16+.24*close;c.lineCap='round';c.lineWidth=1.5;c.strokeStyle='#78a6a3';upperEdge();c.stroke();c.globalAlpha*=.65;lowerEdge();c.stroke();c.restore();
  if(close>.86){const contact=smooth((close-.86)/.14);c.save();c.globalAlpha=contact;c.strokeStyle='#2d626488';c.lineWidth=2;c.shadowColor='#4b8582';c.shadowBlur=7;c.beginPath();c.moveTo(22,189);c.bezierCurveTo(112,193,246,193,338,188);c.stroke();c.restore()}
 }
 function lidPath(c,y,tilt,arc,upper){
  c.beginPath();c.moveTo(-12,upper?-12:372);c.lineTo(372,upper?-12:372);c.lineTo(372,y+tilt);c.quadraticCurveTo(180,y+arc*2,-12,y-tilt);c.closePath();
 }
 let lidTexture;
 function velvet(){
  if(lidTexture)return lidTexture;
  lidTexture=document.createElement('canvas');lidTexture.width=lidTexture.height=360;
  const c=lidTexture.getContext('2d'),rnd=random(9047);
  // Cached, fixed grain: tiny tonal variation, never animated noise or glitter.
  for(let i=0;i<6500;i++){
   const x=rnd()*360,y=rnd()*360,a=.015+rnd()*.035;
   c.strokeStyle=i%2?`rgba(240,235,224,${a})`:`rgba(25,32,36,${a})`;
   c.lineWidth=.45+rnd()*.5;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.lineTo(x+.3+rnd()*.7,y-.4-rnd()*1.2);c.stroke();
  }return lidTexture;
 }
 function lidEdge(c,y,tilt,arc){c.beginPath();c.moveTo(-12,y-tilt);c.quadraticCurveTo(180,y+arc*2,372,y+tilt)}
 function paintLid(c,y,tilt,arc,upper,close){
  c.save();
  c.fillStyle=radial(c,125,upper?87:268,310,[[0,'#a8a9a5'],[.29,'#979c98'],[.64,'#737e7b'],[1,'#455353']]);
  c.shadowColor='#182a3042';c.shadowBlur=11;c.shadowOffsetY=upper?4:-3;
  lidPath(c,y,tilt,arc,upper);c.fill();c.shadowColor='transparent';
  lidPath(c,y,tilt,arc,upper);c.clip();
  softLight(c,101,upper?y+arc-42:y+arc+49,130,58,-.13,[[0,'#eee6d523'],[.55,'#e5e4d812'],[1,'#e5e4d800']]);
  softLight(c,309,180,87,155,0,[[0,'#34485430'],[1,'#34485400']]);
  // The fine nap travels with the lid, maintaining a fabric-like surface.
  const shift=Math.round(y+(upper?-180:-300));c.drawImage(velvet(),0,shift);c.drawImage(velvet(),0,shift-360);c.drawImage(velvet(),0,shift+360);
  c.lineCap='round';
  const edge=c.createLinearGradient(0,0,360,0);edge.addColorStop(0,'#203a4300');edge.addColorStop(.3,'#263d434a');edge.addColorStop(.72,'#233d4659');edge.addColorStop(1,'#203a4300');
  c.strokeStyle=edge;c.lineWidth=12;c.shadowColor='#263d4324';c.shadowBlur=6;
  lidEdge(c,y+(upper?-1:1),tilt,arc);c.stroke();c.shadowColor='transparent';
  const sheen=c.createLinearGradient(0,0,360,0);sheen.addColorStop(0,'#e5eeeb00');sheen.addColorStop(.37,'#e5eeeb58');sheen.addColorStop(.7,'#d5e1de26');sheen.addColorStop(1,'#d5e1de00');
  c.strokeStyle=sheen;c.lineWidth=1.5;
  lidEdge(c,y+(upper?-6:6),tilt,arc);c.stroke();
  // A subdued crease follows the upper curve and relaxes as the eye closes.
  if(upper){c.globalAlpha=.55*(1-close*.65);c.strokeStyle='#374c5038';c.lineWidth=1.3;lidEdge(c,y-18,tilt*.85,arc*.87);c.stroke()}
  c.restore();
 }
 function render(canvas,time,options={}){
  const c=canvas.getContext('2d',{alpha:false}),s=state(time,options.mode,options.side||0);
  const scriptedForest=['forest-look','forest-surprise','forest-sleepy','forest-tremor'].includes(s.mode);
  if(options.gaze&&s.mode!=='cross'&&!scriptedForest){s.x=options.gaze[0];s.y=options.gaze[1]}
  s.x=clamp(s.x,-66,66);s.y=clamp(s.y,-57,57);
  const before=state(time-.07,options.mode,options.side||0);
  s.lag=options.lag||(options.gaze?[0,0]:[clamp(before.x-s.x,-14,14),clamp(before.y-s.y,-14,14)]);
  s.pupil+=clamp(options.attention||0)*.045;
  if(options.blink!=null)s.close=Math.max(s.close,options.blink);
  c.setTransform(canvas.width/360,0,0,canvas.height/360,0,0);c.fillStyle='#000';c.fillRect(0,0,360,360);c.save();c.beginPath();c.arc(180,180,179.5,0,TAU);c.clip();
  if(s.mode.startsWith('forest')){
   forestEye(c,s);forestLids(c,s);c.restore();c.setTransform(1,0,0,1,0,0);return s;
  }
  // Neutral white sclera with subtle edge shading, no blue surround or robot shell.
  disk(c,180,180,180,radial(c,176,175,204,[[0,'#fff'],[.61,'#fdfdfc'],[.79,'#f3f4f3'],[.92,'#d9dddc'],[1,'#a2abaa']]));
  const projection=optics(s),x=projection.iris.x,y=projection.iris.y;
  if(s.mode==='heart')heart(c,x,y-1,s.t);
  else{
   iris(c,s,options.color||'aqua');
   if(s.mode==='angry')flame(c,x+5,y+67,s.t);
   if(s.mode==='hot'){
    const heat=c.createLinearGradient(0,100,0,350);heat.addColorStop(0,'#ff618b00');heat.addColorStop(.45,'#ff698b59');heat.addColorStop(1,'#ffa8b730');c.fillStyle=heat;c.fillRect(0,0,360,360);
    droplet(c,300,230+12*Math.sin(s.t*TAU/6),21,.85);
   }
   if(s.mode==='cry')tears(c,s);
  }
  // Soft cast shadows ground the curved lids in the globe instead of a flat mask.
  const b=clamp(s.close),smiling=s.mode==='happy',seam=smiling?202+3*Math.sin(s.t*TAU/3):204;
  const lidFollow=clamp(s.y*.1,-4,4);
  const top=mix(s.top+lidFollow,seam,b),bottom=mix(s.bottom+lidFollow*.5,seam,b),tilt=s.tilt*(1-b);
  const smileArc=smiling?30+3*Math.sin(s.t*TAU/3):8;
  const arc=mix(s.arc,-smileArc,b),lowerArc=mix(s.lowerArc,-smileArc,b);
  paintLid(c,top,tilt,arc,true,b);paintLid(c,bottom,0,lowerArc,false,b);
  c.lineCap='round';c.lineWidth=1.35;c.strokeStyle='#233a3f88';
  c.beginPath();c.moveTo(-12,top-tilt);c.quadraticCurveTo(180,top+arc*2,372,top+tilt);c.stroke();
  if(b<.995){c.beginPath();c.moveTo(-12,bottom);c.quadraticCurveTo(180,bottom+lowerArc*2,372,bottom);c.stroke()}
  if(s.mode==='superhappy')confetti(c,s);
  disk(c,180,180,180,radial(c,180,180,180,[[0,'#0000'],[.965,'#0000'],[1,'#23302e50']]));
  c.restore();c.setTransform(1,0,0,1,0,0);return s;
 }
 window.Eyes={render,state,blink,smooth,optics,ready:forestReady};
})();
