"use strict";

function createOrbitBowling(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.outputEncoding=THREE.sRGBEncoding;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x171c27);
  scene.fog=new THREE.Fog(0x171c27,20,39);
  const camera=new THREE.PerspectiveCamera(42,0.72,.1,65);
  camera.position.set(0,2.2,3.65);
  camera.lookAt(0,.25,-5.7);
  camera.updateMatrixWorld();

  const materials=new Map();
  const unit=new THREE.BoxGeometry(1,1,1);
  const round=new THREE.SphereGeometry(1,22,16);
  const capsule=new THREE.CylinderGeometry(1,1,1,12);
  function material(color,lit=false){
    const key=color+":"+lit;
    if(!materials.has(key)) materials.set(key,lit
      ? new THREE.MeshBasicMaterial({color})
      : new THREE.MeshStandardMaterial({color,roughness:.68}));
    return materials.get(key);
  }
  function piece(parent,shape,color,x,y,z,sx,sy,sz,lit){
    const object=new THREE.Mesh(shape,material(color,lit));
    object.position.set(x,y,z);
    object.scale.set(sx,sy,sz);
    parent.add(object);
    return object;
  }
  const box=(parent,color,x,y,z,w,h,d,lit)=>piece(parent,unit,color,x,y,z,w,h,d,lit);
  const oval=(parent,color,x,y,z,w,h,d,lit)=>piece(parent,round,color,x,y,z,w,h,d,lit);
  const rimLights=[];
  scene.add(new THREE.HemisphereLight(0xc5dbed,0x5a4a43,.83));
  const key=new THREE.DirectionalLight(0xffe2ba,.98);
  key.position.set(-3,7,4);
  scene.add(key);
  const fill=new THREE.DirectionalLight(0x76cadd,.29);
  fill.position.set(3,2,-17);
  scene.add(fill);

  const makeTexture=(width,height,draw)=>{
    const art=document.createElement("canvas");
    art.width=width;art.height=height;
    draw(art.getContext("2d"));
    const map=new THREE.CanvasTexture(art);
    map.encoding=THREE.sRGBEncoding;
    map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    return map;
  };
  const wood=makeTexture(256,1024,c=>{
    let seed=8123;
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    for(let i=0;i<19;i++){
      const x=i*256/19,shade=9-Math.floor(random()*18);
      c.fillStyle=`rgb(${158+shade},${104+shade},${65+shade})`;
      c.fillRect(x,0,256/19+.5,1024);
      for(let g=0;g<20;g++){
        c.strokeStyle=g%2?"#53271926":"#ffe7bc32";
        c.lineWidth=.35+random()*.8;
        const gx=x+random()*12, y=random()*930;
        c.beginPath();c.moveTo(gx,y);
        c.bezierCurveTo(gx+2,y+26,gx-2,y+63,gx+1,y+94+random()*119);c.stroke();
      }
      c.fillStyle="#291a1536";c.fillRect(x,0,.65,1024);
      for(let y=(i*137)%180;y<1024;y+=180)c.fillRect(x,y,256/19,1);
    }
  });
  const deckGeometry=new THREE.PlaneGeometry(2.26,20.8);
  deckGeometry.rotateX(-Math.PI/2);
  const deckMaterial=new THREE.MeshStandardMaterial({map:wood,roughness:.64});
  const inlay=new THREE.MeshStandardMaterial({color:0xd8bc91,roughness:.61});
  const aimArrow=new THREE.ConeGeometry(.054,.13,3);
  aimArrow.rotateX(-Math.PI/2);
  const signArt=makeTexture(640,192,c=>{
    const glow=c.createLinearGradient(0,0,640,192);
    glow.addColorStop(0,"#203442");glow.addColorStop(1,"#101824");
    c.fillStyle=glow;c.fillRect(0,0,640,192);
    c.strokeStyle="#80b5af";c.lineWidth=3;c.strokeRect(8,8,624,176);
    c.font="800 72px system-ui";c.letterSpacing="4px";
    c.textAlign="center";c.fillStyle="#e4f5ed";c.fillText("ORBIT LANES",320,116);
  });
  box(scene,0x252831,0,-.34,-8,18,.4,24);
  for(let i=-2;i<=2;i++){
    const x=i*3.02;
    const deck=new THREE.Mesh(deckGeometry,deckMaterial);
    deck.position.set(x,.002,-7.4);scene.add(deck);
    for(const side of [-1,1]){
      box(scene,0x202737,x+side*1.29,-.104,-7.47,.32,.13,20.7);
      box(scene,0x43474b,x+side*1.47,-.015,-7.47,.07,.16,20.65);
      if(i===0)rimLights.push(box(scene,0x94e8d4,x+side*1.45,.071,-8.4,.03,.016,17.9,true));
    }
    box(scene,0x181f28,x,.78,-18.15,2.83,1.67,.27);
    box(scene,0x35464f,x,1.18,-17.85,2.65,.27,.23);
    box(scene,0xa7d8c5,x,1.035,-17.71,2.45,.045,.06,true);
  }
  box(scene,0x483227,0,0,-.305,2.25,.013,.041);
  for(let i=-3;i<=3;i++){
    const marker=new THREE.Mesh(aimArrow,inlay);
    marker.position.set(i*.22,.014,-3.5-Math.abs(i)*.17);scene.add(marker);
  }

  box(scene,0x19242b,0,2.45,-19.1,17,4.9,.35);
  box(scene,0x394b50,0,2.66,-18.91,16.8,1.51,.09);
  box(scene,0x25343a,0,1.82,-18.85,16.8,.12,.13);
  box(scene,0x617d79,0,3.44,-18.83,16.8,.072,.085);
  const worldLighting=[];
  for(const side of [-1,1]){
    for(let i=0;i<8;i++){
      const x=side*(2.4+i*.58);
      box(scene,i%2?0x3b4c50:0x31454b,x,2.67,-18.81,.54,1.38,.105);
      box(scene,0x222f37,x-.26,2.67,-18.74,.044,1.39,.038);
      if(i%3===0)worldLighting.push(box(scene,0xb9e3c9,x,2.79,-18.738,.055,.56,.03,true));
    }
  }
  box(scene,0x28313a,0,4.59,-8,17,.29,23);
  const screenWidth=5.45, screenHeight=2.2;
  const screenGroup=new THREE.Group();
  scene.add(screenGroup);
  box(screenGroup,0x101519,0,2.66,-18.68,screenWidth+.19,screenHeight+.15,.16);
  const screenMaterial=new THREE.MeshBasicMaterial({map:signArt,toneMapped:false});
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(screenWidth,screenHeight),screenMaterial);
  screen.position.set(0,2.66,-18.59);
  screenGroup.add(screen);
  const pinFeed=new THREE.WebGLRenderTarget(768,310);
  pinFeed.texture.encoding=renderer.outputEncoding;
  const pinCamera=new THREE.PerspectiveCamera(34,screenWidth/screenHeight,.1,45);
  pinCamera.position.set(1.44,2.16,-11.12);
  pinCamera.lookAt(0,.24,-14.86);
  const reactionCamera=new THREE.PerspectiveCamera(29,screenWidth/screenHeight,.08,35);
  const captionArt=document.createElement("canvas");
  captionArt.width=768;captionArt.height=310;
  const captionInk=captionArt.getContext("2d");
  const captionMap=new THREE.CanvasTexture(captionArt);
  captionMap.encoding=THREE.sRGBEncoding;
  const caption=new THREE.Mesh(new THREE.PlaneGeometry(screenWidth,screenHeight),
    new THREE.MeshBasicMaterial({map:captionMap,transparent:true,depthWrite:false,toneMapped:false}));
  caption.position.set(0,2.66,-18.58);
  screenGroup.add(caption);
  let lastCaption="";
  function showCaption(name,text){
    caption.visible=Boolean(text);
    const key=name+"\n"+text;
    if(!caption.visible||key===lastCaption)return;
    lastCaption=key;
    captionInk.clearRect(0,0,768,310);
    captionInk.fillStyle="#111d29ee";
    captionInk.fillRect(0,218,768,92);
    if(name){
      captionInk.font="700 24px system-ui";
      captionInk.fillStyle="#a6edcf";
      captionInk.fillText(name,21,247,725);
    }
    captionInk.fillStyle="#fff7dc";
    captionInk.font="800 39px system-ui";
    captionInk.fillText(text,21,name?289:276,726);
    captionMap.needsUpdate=true;
  }

  function frameReaction(pins,speaker){
    const standing=pins.filter(pin=>!pin.down);
    if(!standing.length)return false;
    let x,y;
    if(speaker&&!speaker.down){
      x=speaker.x;
      y=speaker.y;
    }else{
      x=(Math.min(...standing.map(pin=>pin.x))+Math.max(...standing.map(pin=>pin.x)))/2;
      y=(Math.min(...standing.map(pin=>pin.y))+Math.max(...standing.map(pin=>pin.y)))/2;
    }
    const distance=speaker&&!speaker.down?1.68:2.13;
    reactionCamera.position.set(x,.62,-y+distance);
    reactionCamera.lookAt(x,.29,-y);
    return true;
  }
  let lastFeed=-Infinity;

  function floorMark(geometry,color,x,z){
    const mark=new THREE.Mesh(geometry,material(color,true));
    mark.position.set(x,.022,z);
    scene.add(mark);
    return mark;
  }
  const discShape=new THREE.CircleGeometry(.033,12);
  discShape.rotateX(-Math.PI/2);
  const aimDots=Array.from({length:13},()=>floorMark(discShape,0xeaffab,0,0));
  const ring=new THREE.RingGeometry(.067,.087,24);
  ring.rotateX(-Math.PI/2);
  const targetDot=floorMark(ring,0xeaffab,0,0);
  const arrowOutline=new THREE.Shape();
  arrowOutline.moveTo(-.13,-.066);
  arrowOutline.lineTo(.115,0);
  arrowOutline.lineTo(-.13,.066);
  arrowOutline.lineTo(-.065,0);
  arrowOutline.closePath();
  const flatArrow=new THREE.ShapeGeometry(arrowOutline);
  flatArrow.rotateX(-Math.PI/2);
  const driftArrows=Array.from({length:8},()=>floorMark(flatArrow,0xe9faff,0,0));
  const driftShape=new THREE.PlaneGeometry(2.25,6);
  driftShape.rotateX(-Math.PI/2);
  const driftArea=new THREE.Mesh(driftShape,new THREE.MeshBasicMaterial({
    color:0x8bedff,transparent:true,opacity:.26,depthWrite:false,
  }));
  driftArea.position.set(0,.01,-8);
  scene.add(driftArea);
  const gravityRings=[.35,.24,.13].map(radius=>{
    const shape=new THREE.RingGeometry(radius-.025,radius,24);
    shape.rotateX(-Math.PI/2);
    return floorMark(shape,0xe6acff,0,-8);
  });
  for(let z=-18;z<3;z+=3.2){
    box(scene,0x3c4248,0,4.29,z,16,.24,.38);
    for(const x of [-5.8,-2.8,0,2.8,5.8]) {
      box(scene,0x313c45,x,4.16,z,1.1,.14,.53);
      box(scene,0xffe7c0,x,4.08,z,1,.025,.37,true);
    }
    for(const side of [-1,1]){
      box(scene,0x303a40,side*7.72,1.97,z,.24,4.35,.29);
      box(scene,0x34444e,side*7.9,1.94,z,.21,4.12,3.2);
      box(scene,0x52656b,side*7.70,1.1,z,.21,.09,3.18);
    }
  }
  for(const side of [-1,1]){
    const light=new THREE.PointLight(side===1?0x8fe3ce:0xffbd8d,.27,11);
    light.position.set(side*2.25,2,-14.5);scene.add(light);
    box(scene,0x2e3b44,side*2.26,.13,1.2,.72,.66,2.4);
    box(scene,0x896547,side*2.26,.47,1.2,.75,.1,2.44);
  }

  const shadowMap=makeTexture(64,64,c=>{
    const shade=c.createRadialGradient(32,32,1,32,32,31);
    shade.addColorStop(0,"#20150dc2");shade.addColorStop(1,"#20150d00");
    c.fillStyle=shade;c.fillRect(0,0,64,64);
  });
  const shadowMat=new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false});
  const shadowGeo=new THREE.PlaneGeometry(1,1);
  shadowGeo.rotateX(-Math.PI/2);
  function makeShadow(){
    const shadow=new THREE.Mesh(shadowGeo,shadowMat);
    shadow.position.y=.016;scene.add(shadow);
    return shadow;
  }

  const pinModels=new Map();
  const pinspec={
    blip:[0x68d792,1,.91,1],runner:[0xe6be50,2,.65,.91],goo:[0xba88df,2,.90,1.08],
    jelly:[0x75bddf,2,.85,1.04],chonk:[0xef9156,3,1.16,1.07],mother:[0xe77a9b,5,1.13,1.23],
  };
  function pinModel(id){
    const [color,eyes,width,high]=pinspec[id]||pinspec.blip;
    const group=new THREE.Group();scene.add(group);
    const body=new THREE.Group();group.add(body);
    body.scale.y=1.13;
    const belly=oval(body,color,0,.235*high,0,.157*width,.227*high,.145*width);
    belly.material=material(color);
    const eye=(x,y,z,size)=>{
      oval(body,0xfff5de,x,y,z,size,size,size*.64);
      oval(body,0x202339,x+.005,y,z+size*.49,size*.57,size*.58,size*.31);
      oval(body,0xf2fffa,x-.013,y+.015,z+size*.72,size*.2,size*.22,size*.1,true);
    };
    if(id==="runner"||id==="blip"){
      for(const side of [-1,1]){
        piece(body,capsule,color,side*.074,.445*high,0,.015,.15,.015).rotation.z=side*-.23;
        if(id==="runner")eye(side*.093,.53*high,.033,.042);
        else oval(body,0xf6dd87,side*.093,.523*high,0,.025,.025,.025,true);
      }
    }
    if(id!=="runner"){
      for(let i=0;i<eyes;i++){
        const x=(i-(eyes-1)/2)*(eyes>3?.053:.075);
        eye(x,.284*high+(eyes>3?Math.cos(i*2)*.041:0),.136*width-Math.abs(x)*.26,eyes===1?.071:.037);
      }
    }
    oval(body,0x402e40,0,.192*high,.139*width,.041,.019,.018);
    if(id==="jelly"){
      for(let i=-2;i<=2;i++)oval(body,0x65aace,i*.048,.068,.022,.022,.102,.027).rotation.z=i*.15;
    }else{
      for(const side of [-1,1]) oval(body,color,side*.086*width,.034,.036,.067*width,.035,.078);
    }
    return {group,shadow:makeShadow()};
  }

  const ballMat=new THREE.MeshStandardMaterial({color:0x487d72,roughness:.31,metalness:.24});
  const rollingBall=new THREE.Mesh(round,ballMat);
  rollingBall.scale.setScalar(.185);scene.add(rollingBall);
  const ballShade=makeShadow();
  const ballMap=makeTexture(256,128,c=>{
    const image=c.createImageData(256,128);
    for(let y=0;y<128;y++)for(let x=0;x<256;x++){
      const t=x/256*Math.PI*2;
      const vein=Math.pow(.5+.5*Math.sin(t*3+y*.095+1.8*Math.sin(t+y*.10)),3);
      const index=(y*256+x)*4;
      image.data[index]=image.data[index+1]=image.data[index+2]=140+vein*112;
      image.data[index+3]=255;
    }
    c.putImageData(image,0,0);
    c.fillStyle="#171c26";
    for(const [x,y] of [[112,34],[129,35],[123,45]]){
      c.beginPath();c.ellipse(x,y,5,3.7,0,0,Math.PI*2);c.fill();
    }
  });
  ballMat.map=ballMap;ballMat.needsUpdate=true;

  const obstacles=[];
  const crystalGeo=new THREE.OctahedronGeometry(1);
  for(let index=0;index<2;index++){
    const crystal=new THREE.Group();scene.add(crystal);
    for(let j=-1;j<=1;j++)piece(crystal,crystalGeo,0xf0a578,j*.083,.19-Math.abs(j)*.055,0,.098,.28-Math.abs(j)*.09,.12).rotation.z=j*.37;
    const saucer=new THREE.Group();scene.add(saucer);
    oval(saucer,0x59bebd,0,.19,0,.23,.072,.21);
    oval(saucer,0xbacacc,0,.244,0,.102,.073,.10);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      oval(saucer,0xffd281,Math.cos(a)*.19,.195,Math.sin(a)*.17,.021,.015,.021,true);
    }
    obstacles.push({crystal,saucer});
  }

  const clip=new THREE.Vector3();
  function project(x,y,width,height){
    clip.set(x,0,-y).project(camera);
    return {x:(clip.x+1)*width*.5,y:(1-clip.y)*height*.5,scale:3.7/(y+3.7)};
  }
  function resize(w,h,ratio){
    renderer.setPixelRatio(ratio);
    renderer.setSize(w,h);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function draw({pins,ball,position,aim,live,reaction,shotResult,time,kind,events,world,guide,drift,gravityX,dialogue}){
    for(const [pin,model] of pinModels)if(!pins.includes(pin)){
      scene.remove(model.group,model.shadow);pinModels.delete(pin);
    }
    for(const pin of pins){
      if(!pinModels.has(pin))pinModels.set(pin,pinModel(pin.id));
      const {group,shadow}=pinModels.get(pin);
      const bob=pin.down?0:Math.abs(Math.sin((time+pin.seed)*(pin.walk?12:3)))*(pin.walk?.045:pin.act==="hop"?.13:.016);
      group.position.set(pin.x,pin.down?.06:bob,-pin.y);
      group.rotation.set(pin.down?pin.fall*1.44:0,pin.angle*.26,pin.down?0:Math.sin(time*4+pin.seed)*.055);
      shadow.position.set(pin.x,.017,-pin.y);
      shadow.scale.set(.51,1,pin.down?.67:.38);
    }
    const active=ball|| (aim ? {x:position,y:.52,spin:0,gutter:false} : null);
    rollingBall.visible=ballShade.visible=Boolean(active);
    if(active){
      rollingBall.position.set(active.x,active.gutter?.092:.185,-active.y);
      rollingBall.rotation.x=-active.spin;
      ballShade.position.set(active.x,.018,-active.y);
      ballShade.scale.set(.61,1,.52);
    }
    for(const lamp of worldLighting)lamp.material.color.set(world.trim);
    const rails=kind==="rails";
    for(let i=0;i<rimLights.length;i++){
      rimLights[i].material.color.set(world.trim);
      rimLights[i].position.x=(i===0?-1:1)*(rails?1.13:1.45);
      rimLights[i].scale.y=rails?.26:.016;
      rimLights[i].position.y=rails?.13:.071;
    }
    for(const [i,model] of obstacles.entries()){
      const event=events[i];
      model.crystal.visible=Boolean(event&&kind==="crystal");
      model.saucer.visible=Boolean(event&&kind==="saucer");
      if(event){
        model.crystal.position.set(event.x,0,-event.y);
        model.saucer.position.set(event.x,Math.sin(time*6)*.035,-event.y);
        model.saucer.rotation.y=time*1.4;
      }
    }
    for(const [i,dot] of [...aimDots,targetDot].entries()){
      const point=guide[i];
      dot.visible=Boolean(point);
      if(point){
        dot.position.x=point.x;
        dot.position.z=-point.y;
        dot.material=material(point.hook?0xffd196:0xeaffab,true);
      }
    }
    driftArea.visible=Boolean(drift)||kind==="gravity";
    driftArea.material.color.setHex(kind==="gravity"?0xb46ee7:kind==="ice"?0x8bedff:0xf6cd92);
    for(const [i,arrow] of driftArrows.entries()){
      arrow.visible=Boolean(drift);
      if(drift){
        arrow.position.x=((time*.65+i*.32)%1.85-.925)*drift;
        arrow.position.z=-(5.5+i*.66);
        arrow.rotation.y=drift<0?Math.PI:0;
      }
    }
    for(const mark of gravityRings){
      mark.visible=kind==="gravity";
      mark.position.x=gravityX;
    }
    if(live){
      const comment=reaction?dialogue.find(line=>!line.pin.down)||dialogue[0]:null;
      const closeUp=reaction&&frameReaction(pins,comment?.pin);
      showCaption(reaction?(comment?.name||""):"",reaction?(comment?.text||shotResult):"");
      if(lastFeed===-Infinity||time<lastFeed||time-lastFeed>=1/30){
        const hidden=[];
        screenGroup.visible=false;
        if(closeUp){
          if(rollingBall.visible)hidden.push(rollingBall,ballShade);
          // Fallen pins stay in the lane view. The TV frames the aliens still in play.
          for(const [pin,model] of pinModels)if(pin.down)hidden.push(model.group,model.shadow);
          for(const object of hidden)object.visible=false;
        }
        renderer.setRenderTarget(pinFeed);
        renderer.render(scene,closeUp?reactionCamera:pinCamera);
        renderer.setRenderTarget(null);
        for(const object of hidden)object.visible=true;
        screenGroup.visible=true;
        lastFeed=time;
      }
      screenMaterial.map=pinFeed.texture;
    }else{
      lastFeed=-Infinity;
      screenMaterial.map=signArt;
      showCaption("","");
    }
    renderer.render(scene,camera);
  }
  return {resize,draw,project,setBall:color=>ballMat.color.set(color)};
}
