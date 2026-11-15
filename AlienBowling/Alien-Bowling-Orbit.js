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
  const themes={
    "Oort Gate":{shell:0x25485e,trim:0x9ae8fa,ceiling:0x3b6079,key:0xc8edff,grain:"#6ba8c1",style:"ice"},
    Jupiter:{shell:0x48313e,trim:0xffc986,ceiling:0x66444b,key:0xffd4a0,grain:"#70472f",style:"storm"},
    Mars:{shell:0x6a433b,trim:0xff9f72,ceiling:0x50322b,key:0xffc19f,grain:"#a66249",style:"stone"},
    Earth:{shell:0x233b3e,trim:0xa8edd5,ceiling:0x374c50,key:0xffe2ba,grain:"#af784d",style:"wood"},
  };
  const laneSkins={};
  for(const [name,theme] of Object.entries(themes)){
    if(theme.style==="wood"){laneSkins[name]=wood;continue;}
    laneSkins[name]=makeTexture(256,1024,c=>{
      c.fillStyle=theme.grain;c.fillRect(0,0,256,1024);
      const glaze=c.createLinearGradient(0,0,256,0);
      glaze.addColorStop(0,"#0d182449");
      glaze.addColorStop(.5,theme.style==="ice"?"#cadff572":"#f6d0a34c");
      glaze.addColorStop(1,"#0d182460");
      c.fillStyle=glaze;c.fillRect(0,0,256,1024);
      let seed=417;
      const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
      for(let i=0;i<2200;i++){
        c.fillStyle=i%2?"#15112220":"#fff4e220";
        c.fillRect(random()*256,random()*1024,1+random()*1.5,1+random()*4);
      }
      if(theme.style==="ice"){
        for(let i=0;i<33;i++){
          const x=random()*256,y=random()*1024;
          c.strokeStyle=i%3?"#edfaff58":"#21446c52";
          c.beginPath();c.moveTo(x,y);c.lineTo(x-14,y+28);c.lineTo(x+5,y+54);c.lineTo(x-12,y+96);
          c.stroke();
        }
      }else if(theme.style==="storm"){
        for(let i=1;i<16;i++){
          c.strokeStyle=i%2?"#fae2b04d":"#301a1969";
          c.beginPath();c.moveTo(i*16,0);c.lineTo(i*16,1024);c.stroke();
        }
        for(let i=0;i<75;i++){
          const x=random()*256, y=random()*1024;
          c.strokeStyle="#efb77f35";c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+3,y+53,x-4,y+75,x+1,y+146);c.stroke();
        }
      }else{
        c.strokeStyle="#4b22234d";
        for(let y=64;y<1024;y+=128){
          c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();
        }
        for(let i=0;i<40;i++){
          const x=random()*256,y=random()*1024;
          c.strokeStyle="#e69b7865";c.beginPath();c.moveTo(x,y);c.lineTo(x+12,y+3);c.lineTo(x+31,y+21);c.stroke();
        }
      }
    });
  }
  const deckGeometry=new THREE.PlaneGeometry(2.26,20.8);
  deckGeometry.rotateX(-Math.PI/2);
  const deckMaterial=new THREE.MeshStandardMaterial({map:wood,roughness:.64});
  const inlay=new THREE.MeshStandardMaterial({color:0xd8bc91,roughness:.61});
  const alignmentMarks=[];
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
    alignmentMarks.push(marker);
  }

  box(scene,0x19242b,0,2.45,-19.1,17,4.9,.35);
  box(scene,0x394b50,0,2.66,-18.91,16.8,1.51,.09);
  box(scene,0x25343a,0,1.82,-18.85,16.8,.12,.13);
  box(scene,0x617d79,0,3.44,-18.83,16.8,.072,.085);
  const interior=new THREE.Group();
  scene.add(interior);
  for(const [name,theme] of Object.entries(themes)){
    const room=new THREE.Group();
    room.visible=false;
    room.name=name;
    interior.add(room);
    box(room,theme.ceiling,0,4.59,-8,17,.29,23);
    for(let i=0;i<7;i++){
      const z=-17.5+i*3.05;
      if(theme.style==="ice"){
        box(room,0x7597aa,0,4.25,z,16,.24,.42);
        for(const side of [-1,1]){
          const brace=box(room,0x5c8095,side*6.25,2.98,z,.27,3.72,.32);
          brace.rotation.z=side*-.39;
          box(room,theme.trim,side*2.9,4.09,z,2.65,.025,.14,true);
        }
      }else if(theme.style==="storm"){
        const arch=new THREE.TorusGeometry(6.55,.15,8,30,Math.PI);
        piece(room,arch,0x875b54,0,0,z,1,.66,1);
        box(room,theme.trim,0,4.13,z,1.35,.03,.35,true);
      }else if(theme.style==="stone"){
        box(room,0x74443a,0,3.96,z,16,.47,.57);
        for(const side of [-1,1]){
          box(room,0x855449,side*6.35,1.95,z,.82,4,.63);
          box(room,theme.trim,side*4.4,3.71,z,1.28,.025,.26,true);
        }
      }else{
        box(room,0x4d5658,0,4.26,z,16,.22,.36);
        for(const x of [-5.8,-2.8,0,2.8,5.8]) {
          box(room,0x293a43,x,4.13,z,1.1,.14,.53);
          box(room,0xffe5c2,x,4.05,z,1,.025,.37,true);
        }
      }
      for(const side of [-1,1]){
        box(room,theme.shell,side*7.9,1.94,z,.21,4.12,3.2);
        box(room,theme.trim,side*7.78,1.14,z,.045,.047,3.05,true);
      }
    }
    const vista=makeTexture(640,190,c=>{
      const gradients={
        ice:["#101f40","#91bed7"],storm:["#502c50","#f1a775"],
        stone:["#482c44","#d38a69"],wood:["#1b3740","#517c71"],
      };
      const fade=c.createLinearGradient(0,0,0,190);
      gradients[theme.style].forEach((color,i)=>fade.addColorStop(i,color));
      c.fillStyle=fade;c.fillRect(0,0,640,190);
      if(theme.style==="storm"){
        for(let i=0;i<13;i++){
          const y=i*15;
          c.strokeStyle=i%2?"#f9c0928c":"#6f3b568b";c.lineWidth=9+i%4;
          c.beginPath();c.moveTo(0,y);c.bezierCurveTo(190,y+46,330,y-45,640,y+12);c.stroke();
        }
      }else if(theme.style==="wood"){
        for(let i=0;i<26;i++){
          const x=i*26,y=70+(i*67)%80;
          c.fillStyle="#13232d";c.fillRect(x,y,21,190-y);
          for(let wy=y+9;wy<181;wy+=15){
            c.fillStyle=i%3?"#e4bf8289":"#a9dbc5a8";
            c.fillRect(x+5,wy,3,4);c.fillRect(x+13,wy,3,4);
          }
        }
      }else{
        c.fillStyle=theme.style==="ice"?"#c3e9f0":"#ffd9a7";
        c.beginPath();c.arc(432,70,theme.style==="ice"?64:27,0,2*Math.PI);c.fill();
        for(let band=0;band<3;band++){
          c.fillStyle=(theme.style==="ice"?["#7198b3","#52738d","#263f58"]:["#b6776c","#92524c","#663c45"])[band];
          c.beginPath();c.moveTo(0,190);
          for(let x=0;x<=640;x+=32)c.lineTo(x,115+band*17+Math.sin(x*.036+band*3)*(.7-band*.12)*27+Math.sin(x*.017)*18);
          c.lineTo(640,190);c.fill();
        }
      }
    });
    for(const side of [-1,1]){
      const windowPanel=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.57),new THREE.MeshBasicMaterial({map:vista}));
      box(room,theme.shell,side*5.14,2.9,-18.93,4.88,1.83,.16);
      windowPanel.position.set(side*5.14,2.9,-18.83);room.add(windowPanel);
    }
  }
  let activeTheme=null;
  function applyTheme(world){
    if(activeTheme===world.name)return;
    activeTheme=world.name;
    const theme=themes[activeTheme]||themes.Earth;
    for(const room of interior.children)room.visible=room.name===activeTheme;
    deckMaterial.map=laneSkins[activeTheme]||wood;
    deckMaterial.roughness=theme.style==="ice"?.56:theme.style==="stone"?.82:.64;
    const onIce=theme.style==="ice";
    inlay.color.setHex(onIce?0x17364d:0xd8bc91);
    for(const mark of alignmentMarks)mark.scale.setScalar(onIce?1.24:1);
    deckMaterial.needsUpdate=true;
    key.color.setHex(theme.key);
    fill.color.setHex(theme.trim);
    scene.background.setHex(theme.shell);
    scene.fog.color.setHex(theme.shell);
  }
  const screenWidth=5.45, screenHeight=2.2;
  const screenGroup=new THREE.Group();
  scene.add(screenGroup);
  box(screenGroup,0x101519,0,2.66,-18.68,screenWidth+.19,screenHeight+.15,.16);
  const screenMaterial=new THREE.MeshBasicMaterial({map:signArt,toneMapped:false});
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(screenWidth,screenHeight),screenMaterial);
  screen.position.set(0,2.66,-18.59);
  screenGroup.add(screen);
  const pinMapCanvas=document.createElement("canvas");
  pinMapCanvas.width=336;pinMapCanvas.height=230;
  const pinMapInk=pinMapCanvas.getContext("2d");
  const pinMapTexture=new THREE.CanvasTexture(pinMapCanvas);
  pinMapTexture.encoding=THREE.sRGBEncoding;
  const pinMonitorMaterial=new THREE.MeshBasicMaterial({map:pinMapTexture,toneMapped:false});
  const pinMonitorShape=new THREE.PlaneGeometry(2.18,1.49);
  for(const side of [-1,1]){
    box(scene,0x101519,side*4.04,2.61,-18.59,2.30,1.60,.13);
    const monitor=new THREE.Mesh(pinMonitorShape,pinMonitorMaterial);
    monitor.position.set(side*4.04,2.61,-18.51);
    scene.add(monitor);
  }
  let currentRack=-1;
  function updatePinMonitors(pins){
    let mask=0;
    for(const pin of pins)if(!pin.down)mask|=1<<pin.index;
    if(mask===currentRack)return;
    currentRack=mask;
    const ink=pinMapInk;
    ink.fillStyle="#111b27";ink.fillRect(0,0,336,230);
    ink.fillStyle="#d2efe8";ink.font="800 24px system-ui";
    ink.textAlign="center";ink.textBaseline="middle";ink.fillText("PINS LEFT",168,24);
    for(let row=0;row<4;row++)for(let column=0;column<=row;column++){
      const index=row*(row+1)/2+column;
      const x=168+(column-row/2)*62,y=192-row*44;
      const up=Boolean(mask&(1<<index));
      ink.fillStyle=up?"#b2f0d7":"#273644";
      ink.beginPath();ink.arc(x,y,18,0,Math.PI*2);ink.fill();
      ink.fillStyle=up?"#162934":"#8192a1";ink.font="800 19px system-ui";
      ink.fillText(String(index+1),x,y+.5);
    }
    pinMapTexture.needsUpdate=true;
  }
  const pinFeed=new THREE.WebGLRenderTarget(768,310);
  pinFeed.texture.encoding=renderer.outputEncoding;
  const pinCamera=new THREE.PerspectiveCamera(34,screenWidth/screenHeight,.1,45);
  pinCamera.position.set(1.44,2.16,-11.12);
  pinCamera.lookAt(0,.24,-14.86);
  const reactionCamera=new THREE.PerspectiveCamera(29,screenWidth/screenHeight,.08,35);
  const captionArt=document.createElement("canvas");
  captionArt.width=768;captionArt.height=92;
  const captionInk=captionArt.getContext("2d");
  const captionMap=new THREE.CanvasTexture(captionArt);
  captionMap.encoding=THREE.sRGBEncoding;
  const caption=new THREE.Mesh(new THREE.PlaneGeometry(screenWidth,.61),
    new THREE.MeshBasicMaterial({map:captionMap,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  caption.position.set(0,4.09,-18.58);
  caption.renderOrder=10;
  screenGroup.add(caption);
  let lastCaption="";
  function showCaption(name,text){
    caption.visible=Boolean(text);
    const key=name+"\n"+text;
    if(!caption.visible||key===lastCaption)return;
    lastCaption=key;
    captionInk.clearRect(0,0,768,92);
    captionInk.fillStyle="#111d29ee";
    captionInk.fillRect(0,0,768,92);
    if(name){
      captionInk.font="700 24px system-ui";
      captionInk.fillStyle="#a6edcf";
      captionInk.fillText(name,21,29,725);
    }
    captionInk.fillStyle="#fff7dc";
    captionInk.font="800 39px system-ui";
    captionInk.fillText(text,21,name?71:58,726);
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
  const guideMarks=[...aimDots,targetDot];
  const borderRing=new THREE.RingGeometry(.056,.103,24);
  borderRing.rotateX(-Math.PI/2);
  const guideBorders=guideMarks.map((_,i)=>{
    const border=floorMark(i===guideMarks.length-1?borderRing:discShape,0x122b40,0,0);
    if(i<aimDots.length)border.scale.set(1.46,1,1.46);
    border.position.y=.019;
    return border;
  });
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
    applyTheme(world);
    updatePinMonitors(pins);
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
    const onIce=world.name==="Oort Gate";
    for(const [i,dot] of guideMarks.entries()){
      const point=guide[i];
      const border=guideBorders[i];
      dot.visible=Boolean(point);
      border.visible=dot.visible&&onIce;
      if(point){
        dot.position.x=point.x;
        dot.position.z=-point.y;
        border.position.x=dot.position.x;
        border.position.z=dot.position.z;
        dot.material=material(point.hook?0xffd196:onIce?0xe1fff5:0xeaffab,true);
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
        arrow.material=material(onIce?0x18445c:0xe9faff,true);
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
