import { bodyAnchor, distance, faceAnchor, midpoint, point, visible, type FilterId, type Point, type TrackingFrame } from "./camera";
import type { CameraArtwork, CameraSprite } from "./camera-artwork";

type Context = CanvasRenderingContext2D;
export type DrawOptions = { artwork?: CameraArtwork; fit?: number };

function sprite(ctx: Context, asset: CameraSprite, x: number, y: number, width: number, height = width*asset.height/asset.width) {
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(asset.image,asset.x,asset.y,asset.width,asset.height,x,y,width,height);
}

function shape(ctx: Context, points: number[][], fill: string, stroke = "") {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function ellipse(ctx: Context, x: number, y: number, rx: number, ry: number, color: string | CanvasGradient, rotation = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
}

function line(ctx: Context, a: Point, b: Point, width: number, color: string) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.stroke();
}

function sparkle(ctx: Context, x: number, y: number, size: number, color: string) {
  shape(ctx, [[x, y-size], [x+size*.25, y-size*.25], [x+size, y], [x+size*.25,y+size*.25], [x,y+size], [x-size*.25,y+size*.25], [x-size,y], [x-size*.25,y-size*.25]], color);
}

function sleeve(ctx: Context, shoulder: Point, elbow: Point, wrist: Point, width: number, color: string, hanbok: boolean) {
  // Tapered cloth panels with light across the fabric, rather than round line caps.
  const segment = (start: Point,end: Point,w1: number,w2: number) => {
    const length=distance(start,end); if(length<3) return;
    ctx.save();ctx.translate(start.x,start.y);ctx.rotate(Math.atan2(end.y-start.y,end.x-start.x));
    const grad=ctx.createLinearGradient(0,-w1/2,0,w1/2);
    grad.addColorStop(0,hanbok?"#bcb5a9":"#842c31");grad.addColorStop(.2,color);grad.addColorStop(.43,hanbok?"#faf7ef":"#ed6666");grad.addColorStop(.64,color);grad.addColorStop(1,hanbok?"#d2cabb":"#a1323a");
    ctx.beginPath();ctx.moveTo(-w1*.13,-w1*.5);ctx.bezierCurveTo(length*.3,-w1*.48,length*.75,-w2*.55,length,-w2*.5);ctx.lineTo(length,w2*.5);ctx.bezierCurveTo(length*.7,w2*.55,length*.3,w1*.58,-w1*.13,w1*.5);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.save();ctx.clip();ctx.strokeStyle=hanbok?"#aa977429":"#59182025";ctx.lineWidth=.8;
    for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(length*.12+i*length*.11,-w1*.5);ctx.quadraticCurveTo(length*.4+i*length*.065,0,length*.18+i*length*.12,w2*.5);ctx.stroke();}
    ctx.restore();ctx.restore();
  };
  const end = hanbok ? { x: elbow.x + (wrist.x-elbow.x)*.9, y: elbow.y + (wrist.y-elbow.y)*.9 } : {x:shoulder.x+(elbow.x-shoulder.x)*.58,y:shoulder.y+(elbow.y-shoulder.y)*.58};
  if(!hanbok) {segment(shoulder,end,width,width*.88); return;}
  segment(shoulder,elbow,width,width*1.1);
  segment(elbow,end,width*1.1,width*.82);
  const length = distance(elbow, end);
  if (length < 8) return;
  ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(Math.atan2(end.y-elbow.y, end.x-elbow.x));
  const band = Math.min(width*.16, length/5);
  ["#ddb958", "#80aaa1", "#d99294", "#f7ead1"].forEach((c, i) => {
    ctx.fillStyle = c; ctx.fillRect(-band*(i+1), -width*.46, band+1, width*.92);
  }); ctx.restore();
}

function princessSleeve(ctx: Context, shoulder: Point, elbow: Point, width: number) {
  const length = distance(shoulder,elbow)*.5;
  if(length<3) return;
  ctx.save();ctx.translate(shoulder.x,shoulder.y);ctx.rotate(Math.atan2(elbow.y-shoulder.y,elbow.x-shoulder.x));
  const silk=ctx.createLinearGradient(0,-width*.55,0,width*.55);
  silk.addColorStop(0,"#b777a6");silk.addColorStop(.3,"#f9d9e8");silk.addColorStop(.52,"#fff0f5");silk.addColorStop(1,"#c892b8");
  ellipse(ctx,length*.4,0,Math.max(length*.62,width*.48),width*.58,silk);
  ctx.strokeStyle="#fff3f5aa";ctx.lineWidth=1;
  for(const v of [-.3,0,.3]) {ctx.beginPath();ctx.moveTo(-length*.2,width*v);ctx.quadraticCurveTo(length*.4,width*(v+.16),length,width*v*.65);ctx.stroke();}
  ctx.fillStyle="#f8e8f0";ctx.fillRect(length*.82,-width*.32,width*.12,width*.64);
  ctx.restore();
}

function princessGown(ctx: Context, asset: CameraSprite, fit: number) {
  const waist=.28,rows=72;
  const rowWidth=(t:number)=>asset.rowWidths?.[Math.min(asset.image.naturalHeight-1,Math.round(asset.y+t*asset.height))] ?? asset.width*.55;
  const shoulderScale=210*asset.width/Math.max(rowWidth(.1),asset.width*.3);
  const waistWidth=rowWidth(waist)*shoulderScale/asset.width;
  for(let row=0;row<rows;row++) {
    const t=row/rows,next=(row+1)/rows;
    const toY=(v:number)=>v<waist?-26+v/waist*190:164+(v-waist)/(1-waist)*275;
    // Start the skirt at the bodice's actual width so the waist never jumps outward.
    const silhouette=waistWidth+(358-waistWidth)*Math.pow(Math.max(0,(t-waist)/(1-waist)),.85);
    const w=(t<waist?shoulderScale:silhouette*asset.width/Math.max(rowWidth(Math.min(t,.9)),asset.width*.3))*fit;
    ctx.drawImage(asset.image,asset.x,asset.y+t*asset.height,asset.width,asset.height/rows,-w/2,toY(t),w,toY(next)-toY(t)+.5);
  }
}

function drawClothes(ctx: Context, frame: TrackingFrame, filter: FilterId, width: number, height: number, mirror: boolean, pink: boolean, options: DrawOptions) {
  const anchor = bodyAnchor(frame.pose, width, height, mirror);
  if (!anchor) return false;
  const hanbok = filter === "hanbok";
  const princess = filter === "princess";
  const jacket = hanbok ? "#eee9dd" : "#d94f50";
  const cloth = pink ? "#b85373" : "#417987";
  for (const [s, e, w] of [[11,13,15], [12,14,16]]) {
    if (!visible(frame.pose[e])) continue;
    const shoulder = point(frame.pose[s], width, height, mirror);
    const elbow = point(frame.pose[e], width, height, mirror);
    const wrist = visible(frame.pose[w]) ? point(frame.pose[w], width, height, mirror) : elbow;
    if(princess) princessSleeve(ctx,shoulder,elbow,anchor.width*.28);
    else sleeve(ctx, shoulder, elbow, wrist, anchor.width * (hanbok ? .34 : .28), jacket, hanbok);
  }
  ctx.save(); ctx.translate(anchor.center.x, anchor.center.y); ctx.rotate(anchor.angle);
  ctx.scale(anchor.width / 200, anchor.height / 250);
  const asset = options.artwork?.[filter];
  if(asset) {
    const fit=options.fit ?? 1;
    ctx.save();
    if(hanbok && pink) ctx.filter="hue-rotate(150deg)";
    // Torso textures sit between articulated sleeves, leaving the camera's face and hands visible.
    if(princess) princessGown(ctx,asset,fit);
    else if(hanbok) {
      // Fit the narrow bodice to the shoulders independently from the full skirt.
      // Horizontal strips keep the embroidered waist continuous across both shapes.
      const rows=64;
      for(let row=0;row<rows;row++) {
        const t=row/rows, next=(row+1)/rows;
        const toY=(v:number)=>v<.22?-28+v/.22*176:148+(v-.22)/.78*275;
        const silhouette=198+130*Math.pow(Math.max(0,(t-.22)/.78),.7);
        // Keep the curved, narrowing hem intact instead of expanding its last rows.
        const widthSample=Math.min(t+.5/rows,.9);
        const inkWidth=asset.rowWidths?.[Math.min(asset.image.naturalHeight-1,Math.round(asset.y+widthSample*asset.height))] ?? asset.width;
        const garmentWidth=(t<.22?665:silhouette*asset.width/Math.max(inkWidth,asset.width*.25))*fit;
        ctx.drawImage(asset.image,asset.x,asset.y+t*asset.height,asset.width,asset.height/rows, -garmentWidth/2,toY(t),garmentWidth,toY(next)-toY(t)+.6);
      }
    }
    else sprite(ctx,asset,-110*fit,-28,220*fit,293);
    ctx.restore();ctx.restore(); return true;
  }
  if(princess) {
    const satin=ctx.createLinearGradient(-130,0,130,0);satin.addColorStop(0,"#b779b0");satin.addColorStop(.45,"#efd0e6");satin.addColorStop(1,"#b779b0");
    ctx.beginPath();ctx.moveTo(-80,115);ctx.quadraticCurveTo(-130,230,-175,425);ctx.quadraticCurveTo(0,450,175,425);ctx.quadraticCurveTo(130,230,80,115);ctx.closePath();ctx.fillStyle=satin;ctx.fill();
    shape(ctx,[[-98,0],[-35,-18],[0,7],[35,-18],[98,0],[80,145],[-80,145]],"#f4d3e6");
    sparkle(ctx,0,50,14,"#eabb67");ctx.restore();return true;
  }
  if (hanbok) {
    const grad = ctx.createLinearGradient(-145,0,145,0);
    grad.addColorStop(0, cloth); grad.addColorStop(.5, pink ? "#d57590" : "#619dab"); grad.addColorStop(1, cloth);
    ctx.beginPath(); ctx.moveTo(-77,110); ctx.quadraticCurveTo(-100,220,-139,330); ctx.quadraticCurveTo(0,356,139,330); ctx.quadraticCurveTo(100,220,77,110); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "#ffffff30"; ctx.lineWidth = 2;
    for (const x of [-95,-60,-28,28,60,95]) { ctx.beginPath(); ctx.moveTo(x*.65,140); ctx.quadraticCurveTo(x,230,x*1.2,326); ctx.stroke(); }
    shape(ctx, [[-98,-10],[-35,-25],[0,5],[35,-25],[98,-10],[83,140],[-83,140]], jacket, "#d5c49e");
    shape(ctx, [[-35,-25],[4,7],[52,106],[38,116],[-46,-19]], "#fffaf0");
    shape(ctx, [[35,-25],[-2,9],[-35,76],[-23,87],[46,-19]], "#fffaf0");
    shape(ctx, [[-83,131],[83,131],[86,150],[-86,150]], cloth);
    // Otgoreum, the two tied ribbons of the jeogori.
    shape(ctx, [[21,61],[65,48],[70,73],[23,77]], cloth);
    shape(ctx, [[21,65],[-18,51],[-27,75],[20,80]], cloth);
    shape(ctx, [[15,76],[28,77],[51,139],[32,143]], cloth);
    shape(ctx, [[15,77],[27,80],[18,125],[3,121]], cloth);
    ellipse(ctx,22,73,9,10,"#deb65b");
    sparkle(ctx,-53,104,8,"#d3b45c");
  } else {
    const grad = ctx.createLinearGradient(-100,0,100,0); grad.addColorStop(0,"#b93c45"); grad.addColorStop(.5,"#ec6460"); grad.addColorStop(1,"#ba3d46");
    ctx.beginPath(); [[-100,-8],[-35,-22],[0,3],[35,-22],[100,-8],[91,262],[-91,262]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.closePath(); ctx.fillStyle=grad;ctx.fill();
    shape(ctx,[[-37,-23],[0,3],[37,-23],[31,-8],[0,20],[-31,-8]],"#fff4dc");
    shape(ctx,[[-98,13],[-80,17],[-83,251],[-94,250]],"#293f50");
    shape(ctx,[[98,13],[80,17],[83,251],[94,250]],"#293f50");
    ctx.fillStyle="#fff9e9"; ctx.textAlign="center";ctx.font="bold 17px system-ui";ctx.fillText("FOREST FC",0,80);
    ctx.font="900 116px system-ui"; ctx.fillText("7",0,200);
    shape(ctx,[[44,23],[69,23],[67,47],[56,56],[46,47]],"#f5d881");
    sparkle(ctx,56,37,7,"#c05753");
  }
  ctx.restore(); return true;
}

function drawCharacterHood(ctx: Context, frame: TrackingFrame, filter: "dinosaur" | "robot", width: number, height: number, mirror: boolean, time: number, options: DrawOptions) {
  const a=faceAnchor(frame.face,width,height,mirror);
  if(!a) return false;
  const center=midpoint(a.top,a.chin);
  const faceHeight=distance(a.top,a.chin);
  const fit=options.fit ?? 1;
  ctx.save();ctx.translate(center.x,center.y);ctx.rotate(a.angle);
  ctx.transform(1-Math.abs(a.yaw)*.15,a.yaw*.035,a.yaw*.07,1,0,0);
  const asset=options.artwork?.[filter];
  if(asset) {
    // The transparent face aperture is aligned to the wearer's forehead and chin.
    // Measured from the enclosed transparent region, relative to the trimmed PNG.
    const opening=filter==="dinosaur"?{x:.5,y:.6409,w:.5287,h:.4718}:{x:.4991,y:.5291,w:.5521,h:.6295};
    const w=a.width*.87/opening.w*fit,h=faceHeight*1.14/opening.h*fit;
    sprite(ctx,asset,-w*opening.x,-h*opening.y,w,h);
  } else {
    ctx.strokeStyle=filter==="dinosaur"?"#5b9b72":"#bdd1e1";ctx.lineWidth=a.width*.18;
    ctx.beginPath();ctx.ellipse(0,0,a.width*.56,faceHeight*.65,0,0,Math.PI*2);ctx.stroke();
  }
  if(filter==="robot") {
    ctx.globalAlpha=.55+.2*Math.sin(time/750);
    const glow=ctx.createRadialGradient(a.width*.63,0,0,a.width*.63,0,a.width*.06);
    glow.addColorStop(0,"#d3fdff");glow.addColorStop(1,"#73ddff00");
    ellipse(ctx,a.width*.63,0,a.width*.06,a.width*.06,glow);
  }
  ctx.restore();return true;
}

function drawFaceFilter(ctx: Context, frame: TrackingFrame, filter: FilterId, width: number, height: number, mirror: boolean, time: number, options: DrawOptions) {
  const a = faceAnchor(frame.face, width, height, mirror);
  if (!a) return false;
  const origin = filter === "glasses" ? a.eyes : a.top;
  ctx.save(); ctx.translate(origin.x, origin.y); ctx.rotate(a.angle); ctx.scale(a.width/200,a.width/200);
  ctx.scale(options.fit ?? 1, options.fit ?? 1);
  // Perspective compresses the far side gently as the face turns.
  ctx.transform(1-Math.abs(a.yaw)*.2,a.yaw*.045,a.yaw*.09,1,0,0);
  const asset=options.artwork?.[filter];
  if(asset) {
    const w=filter==="glasses"?224:filter==="bunny"?220:230;
    const h=w*asset.height/asset.width;
    const y=filter==="glasses"?-h*.46:filter==="bunny"?-h*.8:-h+10;
    sprite(ctx,asset,-w/2,y,w,h);
    if(filter==="crown") {
      ctx.globalAlpha=.4+.25*Math.sin(time/650);
      sparkle(ctx,-79,-h*.5,3.5,"#fffce9");sparkle(ctx,48,-h*.7,2.5,"#fffce9");
    }
  } else if (filter === "crown") {
    const gold = ctx.createLinearGradient(0,-105,0,20); gold.addColorStop(0,"#ffed9a"); gold.addColorStop(.5,"#edc65c"); gold.addColorStop(1,"#c99b3f");
    ctx.beginPath(); [[-91,10],[-104,-68],[-54,-38],[0,-104],[54,-38],[104,-68],[91,10]].forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=gold;ctx.fill();ctx.lineWidth=3;ctx.strokeStyle="#af8435";ctx.stroke();
    shape(ctx,[[-92,0],[92,0],[89,23],[-89,23]],"#dfb446","#af8435");
    for (const [x,y] of [[-104,-68],[0,-104],[104,-68]]) ellipse(ctx,x,y,9,9,"#f9e79b");
    shape(ctx,[[0,-57],[15,-38],[0,-18],[-15,-38]],"#bc5e73","#fff2c8");
    ellipse(ctx,-57,-17,7,9,"#63a497");ellipse(ctx,57,-17,7,9,"#63a497");
    sparkle(ctx,-132,-35,11+Math.sin(time/250)*3,"#fcebb1");sparkle(ctx,132,-82,13,"#fcebb1");
  } else if (filter === "bunny") {
    ellipse(ctx,-56,-68,29,91,"#fff8ed",-.17);ellipse(ctx,56,-68,29,91,"#fff8ed",.17);
    ellipse(ctx,-56,-73,14,66,"#edb1b5",-.17);ellipse(ctx,56,-73,14,66,"#edb1b5",.17);
    ctx.strokeStyle="#fff8ed";ctx.lineWidth=20;ctx.beginPath();ctx.arc(0,43,72,Math.PI,Math.PI*2);ctx.stroke();
  } else {
    ctx.fillStyle="#e2c899";ctx.beginPath();ctx.roundRect(-114,-30,101,72,22);ctx.roundRect(13,-30,101,72,22);ctx.fill();
    const lens=ctx.createLinearGradient(0,-25,0,35);lens.addColorStop(0,"#254458");lens.addColorStop(1,"#59818a");
    ctx.fillStyle=lens;ctx.beginPath();ctx.roundRect(-104,-21,82,51,16);ctx.roundRect(22,-21,82,51,16);ctx.fill();
    line(ctx,{x:-17,y:-9},{x:17,y:-9},9,"#e2c899");
    line(ctx,{x:-111,y:-16},{x:-127,y:-30},9,"#e2c899");line(ctx,{x:111,y:-16},{x:127,y:-30},9,"#e2c899");
    line(ctx,{x:-85,y:12},{x:-57,y:-10},5,"#cce0de99");line(ctx,{x:46,y:12},{x:73,y:-10},5,"#cce0de99");
  }
  ctx.restore();
  if (filter === "bunny") {
    ctx.save(); ctx.translate(a.eyes.x,a.eyes.y);ctx.rotate(a.angle);ctx.scale(a.width/200,a.width/200);
    for(const x of [-63,63]) {
      const blush=ctx.createRadialGradient(x,42,0,x,42,22);blush.addColorStop(0,"#ef82964a");blush.addColorStop(1,"#ef829600");ellipse(ctx,x,42,22,13,blush);
    }
    ctx.restore();
  }
  return true;
}

export function drawFilter(ctx: Context, frame: TrackingFrame, filter: FilterId, width: number, height: number, mirror = true, pink = false, time = 0, options: DrawOptions = {}) {
  ctx.save();
  let found: boolean;
  if(filter === "dinosaur" || filter === "robot") found=drawCharacterHood(ctx,frame,filter,width,height,mirror,time,options);
  else if(filter === "princess") {
    const body=drawClothes(ctx,frame,filter,width,height,mirror,false,options);
    const head=drawFaceFilter(ctx,frame,"crown",width,height,mirror,time,{...options,fit:.85});
    // A partial costume can be previewed, but a complete pose is required for capture.
    found=body && head;
  } else found = filter === "hanbok" || filter === "football"
    ? drawClothes(ctx,frame,filter,width,height,mirror,pink,options)
    : drawFaceFilter(ctx,frame,filter,width,height,mirror,time,options);
  ctx.restore(); return found;
}

export function drawDemo(ctx: Context, frame: TrackingFrame, width: number, height: number) {
  const gradient=ctx.createLinearGradient(0,0,width,height);gradient.addColorStop(0,"#e4ebe0");gradient.addColorStop(1,"#f0e2d4");ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle="#ffffff55";ctx.lineWidth=2;
  for(let x=30;x<width;x+=60) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  ellipse(ctx,width*.5,height*.98,width*.29,height*.035,"#3e5f4015");
  const a=bodyAnchor(frame.pose,width,height)!;
  const head=faceAnchor(frame.face,width,height)!;
  const center=midpoint(head.top,head.chin);
  for(const [s,e,w] of [[11,13,15],[12,14,16]]) {
    line(ctx,point(frame.pose[s],width,height),point(frame.pose[e],width,height),a.width*.26,"#ecd2b2");
    line(ctx,point(frame.pose[e],width,height),point(frame.pose[w],width,height),a.width*.21,"#ecd2b2");
    const hand=point(frame.pose[w],width,height);ellipse(ctx,hand.x,hand.y,a.width*.12,a.width*.14,"#ecd2b2");
  }
  ctx.fillStyle="#839886";ctx.beginPath();ctx.roundRect(a.center.x-a.width*.51,a.center.y,a.width*1.02,a.height*1.1,a.width*.2);ctx.fill();
  line(ctx,{x:center.x,y:head.chin.y-8},{x:center.x,y:a.center.y+15},head.width*.38,"#ecd2b2");
  ellipse(ctx,center.x,center.y,head.width*.53,distance(head.top,head.chin)*.52,"#ecd2b2");
  ctx.fillStyle="#454b40";ctx.beginPath();ctx.ellipse(center.x,center.y-head.width*.13,head.width*.54,head.width*.55,0,Math.PI,Math.PI*2);ctx.fill();
  ellipse(ctx,center.x-head.width*.24,head.eyes.y,head.width*.026,head.width*.04,"#454b40");
  ellipse(ctx,center.x+head.width*.24,head.eyes.y,head.width*.026,head.width*.04,"#454b40");
  ctx.strokeStyle="#af7e6b";ctx.lineWidth=3;ctx.beginPath();ctx.arc(center.x,head.eyes.y+head.width*.18,head.width*.13,.1,Math.PI-.1);ctx.stroke();
  sparkle(ctx,width*.17,height*.21,12,"#ffffffaa");sparkle(ctx,width*.83,height*.3,9,"#ffffffaa");
}
