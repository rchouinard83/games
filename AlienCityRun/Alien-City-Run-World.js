/* Rendering for the three Alien City Run environments and their course props. */
"use strict";

function createAlienRunWorld({scene, renderer, mesh, box, sphere, coinShape, palettes, hazards}) {
  const crystal = new THREE.LatheGeometry(
    [[0,0],[0.73,0],[0.94,0.16],[0.8,0.79],[0,1]].map(([r,y]) => new THREE.Vector2(r,y)),6);
  const rock = new THREE.DodecahedronGeometry(1,0);
  const shardMaterials = new Map();
  function mineral(parent,color,x,y,z,radius,height,rotation){
    const shard = mesh(parent,crystal,color,x,y,z,radius,height,radius);
    if (!shardMaterials.has(color)) {
      shardMaterials.set(color,new THREE.MeshStandardMaterial({
        color,roughness:0.24,metalness:0.28,flatShading:true,emissive:color,emissiveIntensity:0.13,
      }));
    }
    shard.material = shardMaterials.get(color);
    shard.rotation.set(...rotation);
    return shard;
  }
  const rootArch = new THREE.TorusGeometry(5.8, 0.26, 6, 18, Math.PI);
  const trackTop = new THREE.PlaneGeometry(8.3, 14);
  trackTop.rotateX(-Math.PI / 2);
  const colors = [
    {road:[87,65,44], shoulder:[42,56,38], overhead:0x172c38, horizon:0x788f75, fog:0.016},
    {road:[102,91,80], shoulder:[83,53,50], overhead:0x322e55, horizon:0xd29880, fog:0.012},
    {road:[72,77,67], shoulder:[46,89,88], overhead:0x194457, horizon:0x8fbcb1, fog:0.02},
  ];

  function randomSource(seed) {
    return () => {
      seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function groundMaterial(base, world, shoulder) {
    const size = 256;
    const art = document.createElement('canvas');
    art.width = art.height = size;
    const ink = art.getContext('2d');
    const pixels = ink.createImageData(size,size);
    const sheen = world === 2 ? ink.createImageData(size,size) : null;
    const random = randomSource(319 + world * 31 + Number(shoulder));
    const field = Array.from({length:256},random);
    function noise(x,y) {
      const ix=Math.floor(x), iy=Math.floor(y), u=x-ix, v=y-iy;
      const a=field[(iy&15)*16+(ix&15)], b=field[(iy&15)*16+((ix+1)&15)];
      const c=field[((iy+1)&15)*16+(ix&15)], d=field[((iy+1)&15)*16+((ix+1)&15)];
      return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
    }
    for (let y=0;y<size;y++) {
      for (let x=0;x<size;x++) {
        const i=(y*size+x)*4;
        let tone=(noise(x/32,y/32)-0.5)*29+(noise(x/7,y/7)-0.5)*17+(random()-0.5)*17;
        if (world===2) {
          const wet = Math.max(0, Math.min(1,(noise(x/33,y/54)-0.42)*3.2));
          const ripple=Math.abs(Math.sin(y*0.10+4*noise(x/32,y/36)));
          tone += -18*wet + Math.pow(ripple,16)*wet*14;
          for(let c=0;c<3;c++) sheen.data[i+c]=228-wet*178;
          sheen.data[i+3]=255;
        }
        for(let c=0;c<3;c++) pixels.data[i+c]=base[c]+tone;
        pixels.data[i+3]=255;
      }
    }
    ink.putImageData(pixels,0,0);
    const count = world === 1 ? 620 : shoulder ? 270 : 155;
    for(let i=0;i<count;i++) {
      const x=random()*size, y=random()*size;
      const radius=world===1 ? 0.7+random()*3.1 : 0.35+random()*1.9;
      const angle=random()*Math.PI;
      if (world===1) {
        const stone=['#534a43a9','#a59886ad','#78675ca9','#bcaa9690'][i%4];
        ink.fillStyle='#332e2b63';
        ink.fillRect(x,y+0.9,radius*1.35,radius*0.78);
        ink.fillStyle=stone;
        ink.beginPath();
        for(let side=0;side<5;side++){
          const phi=angle+side*2*Math.PI/5;
          const px=x+Math.cos(phi)*radius*(side%2 ? 0.69 : 1);
          const py=y+Math.sin(phi)*radius*0.68;
          if(side===0) ink.moveTo(px,py);
          else ink.lineTo(px,py);
        }
        ink.fill();
      } else {
        ink.fillStyle=world===0 ? ['#34221674','#97814d82','#5c613e85'][i%3] : '#c0b29731';
        ink.beginPath();
        ink.ellipse(x,y,radius,radius*0.36,angle,0,Math.PI*2);
        ink.fill();
      }
    }
    if (world===0 && !shoulder) {
      for (const divide of [85,171]) {
        const edge=ink.createLinearGradient(divide-14,0,divide+14,0);
        edge.addColorStop(0,'#22251600');
        edge.addColorStop(0.5,'#3d422e49');
        edge.addColorStop(1,'#22251600');
        ink.fillStyle=edge;
        ink.fillRect(divide-14,0,28,size);
      }
    }
    let roughnessMap=null;
    if (sheen) {
      const wetMap=document.createElement('canvas');
      wetMap.width=wetMap.height=size;
      wetMap.getContext('2d').putImageData(sheen,0,0);
      roughnessMap=new THREE.CanvasTexture(wetMap);
    }
    const map=new THREE.CanvasTexture(art);
    map.encoding=THREE.sRGBEncoding;
    map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    return new THREE.MeshStandardMaterial({map,roughnessMap,roughness:world===2 ? 0.9 : 0.98});
  }

  const surfaces=colors.map((entry,index) => ({
    road:groundMaterial(entry.road,index,false),
    shoulder:groundMaterial(entry.shoulder,index,true),
  }));
  const shoulderTop = new THREE.PlaneGeometry(8.8,14);
  shoulderTop.rotateX(-Math.PI/2);
  const mudflat = new THREE.PlaneGeometry(42,14);
  mudflat.rotateX(-Math.PI/2);
  const outline = new THREE.Shape();
  for(let i=0;i<18;i++){
    const angle=i*Math.PI/9;
    const edge=0.82+0.12*Math.sin(i*3.3)+0.07*Math.cos(i*1.9);
    const x=Math.cos(angle)*edge, y=Math.sin(angle)*edge;
    if(i===0) outline.moveTo(x,y);
    else outline.lineTo(x,y);
  }
  outline.closePath();
  const poolShape=new THREE.ShapeGeometry(outline);
  poolShape.rotateX(-Math.PI/2);
  const poolMaterial=new THREE.MeshStandardMaterial({
    color:0x597f7e,roughness:0.24,metalness:0.12,transparent:true,opacity:0.32,depthWrite:false,
  });
  function tidalPools(section,index){
    const flat=new THREE.Mesh(mudflat,surfaces[2].road);
    flat.position.y=0.008;
    section.add(flat);
    for(let i=0;i<6;i++){
      const pool=new THREE.Mesh(poolShape,poolMaterial);
      const x=(i%2 ? -1 : 1)*((index*13+i*19)%17*0.62);
      pool.position.set(x,0.012,-5.2+i*2.05);
      pool.rotation.y=i*1.1+index*0.7;
      pool.scale.set(0.85+(i+index)%4*0.47,1,0.57+(index+i*11)%5*0.38);
      section.add(pool);
    }
  }

  const sky = new THREE.Mesh(new THREE.SphereGeometry(95,24,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color()},horizon:{value:new THREE.Color()},sun:{value:new THREE.Color()}},
    vertexShader:`
      varying vec3 ray;
      void main(){
        ray=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      varying vec3 ray;
      uniform vec3 top,horizon,sun;
      void main(){
        vec3 direction=normalize(ray);
        float h=max(0.0,direction.y);
        vec3 color=mix(horizon,top,smoothstep(-0.035,0.78,h));
        float facing=max(0.0,dot(direction,normalize(vec3(-0.38,0.24,-0.89))));
        float cloud=sin(direction.x*34.0+sin(direction.z*16.0)*1.7+direction.y*45.0);
        color+=sun*(0.15*pow(facing,8.0)+0.54*pow(facing,350.0));
        color+=sun*0.035*smoothstep(0.4,1.0,cloud)*(1.0-smoothstep(0.03,0.32,h));
        gl_FragColor=vec4(color,1.0);
        #include <encodings_fragment>
      }`,
  }));
  sky.renderOrder=-10;
  scene.add(sky);
  const shadeCanvas=document.createElement('canvas');
  shadeCanvas.width=shadeCanvas.height=64;
  const shadeInk=shadeCanvas.getContext('2d');
  const shadeGradient=shadeInk.createRadialGradient(32,32,0,32,32,32);
  shadeGradient.addColorStop(0,'#121725aa');
  shadeGradient.addColorStop(0.45,'#1217257a');
  shadeGradient.addColorStop(1,'#12172500');
  shadeInk.fillStyle=shadeGradient;
  shadeInk.fillRect(0,0,64,64);
  const shadeShape=new THREE.PlaneGeometry(1,1);
  shadeShape.rotateX(-Math.PI/2);
  const shadeMaterial=new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(shadeCanvas),transparent:true,depthWrite:false,
  });
  function contactShadow(parent,x,y,z,width,length){
    const shadow=new THREE.Mesh(shadeShape,shadeMaterial);
    shadow.position.set(x,y,z);
    shadow.scale.set(width,1,length);
    parent.add(shadow);
  }

  const branchShape = new THREE.CylinderGeometry(0.09,0.19,1,8);
  const leafShape = new THREE.SphereGeometry(1,12,8);
  function growBranch(parent, color, start, tip, width) {
    const from = new THREE.Vector3(...start), to = new THREE.Vector3(...tip);
    const delta = to.clone().sub(from);
    const middle = from.addScaledVector(delta,0.5);
    const branch = mesh(parent, branchShape, color, middle.x,middle.y,middle.z,width,delta.length(),width);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  }
  function crystalOutcrop(section,x,z,side,index){
    for (let i=0;i<5;i++) {
      const offset = i-2;
      const stone = mesh(section,rock,[0x554761,0x6d5572,0x483c57][i%3],
        x+offset*0.68,0.18,z+Math.cos(i*3)*1.28,1.19,0.59+0.18*(i%3),1.11);
      stone.rotation.set(i*0.43,i*0.71,i*0.29);
    }
    for (let i=0;i<6;i++) {
      const tall = i===2;
      const height = tall ? 4.5+index%3*0.52 : 0.9+(i*11+index)%5*0.42;
      const colors = [0x796aa7,0xa48cba,0x95bbc9,0x778eb0,0x6ba3aa,0x937caa];
      mineral(section,colors[i],x+(i-2)*side*0.49,0.22,z+Math.sin(i*2)*1.22,
        tall ? 0.8 : 0.34+i*0.034,height,[Math.cos(i*2)*0.2,i*0.68,side*(i-2)*0.11]);
    }
  }

  function coralColony(section,x,z,side,index){
    const base = mesh(section,rock,0x56787a,x,0.12,z,2,0.6,1.55);
    base.rotation.y = index*0.63;
    const colors = [0xba6973,0xd99583,0x956d90];
    for (let i=0;i<3;i++) {
      const origin=[x+(i-1)*0.65,0.25,z+Math.cos(i*2)*0.9];
      const color=colors[(i+index)%colors.length];
      const crown=[origin[0]+side*0.19,1.27+i*0.33,origin[2]-0.18];
      growBranch(section,color,origin,crown,1.72-i*0.26);
      for (const fork of [-1,1]) {
        const elbow=[crown[0]+fork*0.4,crown[1]+0.35,crown[2]+0.16];
        const tip=[elbow[0]+fork*0.34,elbow[1]+0.55,elbow[2]-0.14];
        growBranch(section,color,crown,elbow,1.18);
        growBranch(section,color,elbow,tip,0.75);
        growBranch(section,color,elbow,[elbow[0]-fork*0.1,elbow[1]+0.62,elbow[2]+0.21],0.56);
        mesh(section,leafShape,0xffbbb3,...tip,0.09,0.11,0.09);
      }
    }
    for (let i=0;i<4;i++) {
      const px=x+side*(1.42+Math.sin(i)*0.36), pz=z-1.55+i*0.35;
      mesh(section,sphere,0x8aa49b,px,0.16+i*0.04,pz,0.38,0.27+i*0.04,0.41);
      mesh(section,sphere,0x4e7775,px,0.38+i*0.07,pz,0.24,0.042,0.24);
    }
  }

  const track = [];
  let trackOffset=0;
  function update(travel){
    trackOffset=(trackOffset+travel)%98;
    track.forEach((section,index)=>{
      section.position.z=(trackOffset+index*14)%98-84;
    });
  }

  function reset(){
    trackOffset=0;
  }

  function buildTrack(world){
    for (const section of track) scene.remove(section);
    track.length = 0;
    const palette = palettes[world];
    const atmosphere=colors[world];
    scene.background.setHex(palette.sky);
    scene.fog.color.setHex(atmosphere.horizon);
    scene.fog.density=atmosphere.fog;
    sky.material.uniforms.top.value.setHex(atmosphere.overhead);
    sky.material.uniforms.horizon.value.setHex(atmosphere.horizon);
    sky.material.uniforms.sun.value.setHex(world===1 ? 0xfab379 : 0xe2ebbe);
    for (let index = 0; index < 7; index++) {
      const section = new THREE.Group();
      track.push(section);
      scene.add(section);
      if (world===2) {
        tidalPools(section,index);
      } else {
        box(section,palette.ground,0,-0.24,0,8.3,0.48,14);
        const pavement=new THREE.Mesh(trackTop,surfaces[world].road);
        pavement.position.y=0.008;
        section.add(pavement);
        for(const x of [-1.325,1.325]){
          for(let z=-5.25;z<7;z+=3.5){
            box(section,[0x9a9d76,0xbb9475][world],x,0.014,z,0.042,0.018,0.94);
          }
        }
      }
      for (const side of [-1,1]) {
        if (world!==2) {
          const shoulder=new THREE.Mesh(shoulderTop,surfaces[world].shoulder);
          shoulder.position.set(side*8.55,-0.17,0);
          section.add(shoulder);
          const [r,g,b]=colors[world].shoulder;
          box(section,r*0x10000+g*0x100+b,side*13.9,-0.43,0,14,0.38,14);
          box(section,[0x47533d,0x634947][world],side*4.09,-0.035,0,0.19,0.16,14);
        }
        const x=side*(6.0+(index*17%7)*0.26);
        const z=side*(1.5+(index*11%9)*0.48)-1.2;
        contactShadow(section,x,world===2 ? 0.017 : -0.153,z,4.2,5.1);
        for(let i=0;i<5;i++){
          const stone=mesh(section,rock,[0x42483d,0x634c4b,0x537b78][world],
            side*(4.65+(i*19%7)*0.17),-0.08,z+i*1.33,0.28+i*0.06,0.12,0.39);
          stone.rotation.y=i*1.7+index;
        }
        for(let i=0;i<2;i++){
          const rise=world===1 ? 4.1+index%4*1.7 : 1.6+index%3*1.15;
          const ridge=mesh(section,rock,[0x394d40,0x74565f,0x40716f][world],
            side*(12.6+i*4.5),rise*0.23,z-i*5.2,4.3+i*1.1,rise,5.2);
          ridge.rotation.set(0.12,index*0.53+i,side*0.16);
        }
        if (world === 0) {
          growBranch(section,0x523d31,[x,0,z],[x+side*0.21,5.5,z-0.26],4.8);
          for(let i=0;i<5;i++){
            const angle=i*1.24+index;
            const tip=[x+Math.cos(angle)*1.38,-0.11,z+Math.sin(angle)*1.58];
            growBranch(section,0x624839,[x,1.14,z],tip,2.05);
          }
          for (let i=0;i<5;i++) {
            const spread = ((i%3)-1)*1.32;
            const tip = [x+side*(spread+0.4), 5.2+(i%3)*0.47,z+(i-2)*0.8];
            growBranch(section,0x7a5960,[x,2.35,z],tip,1.42);
            mesh(section,leafShape,[0x426c61,0x679275,0x8bb480][i%3],
              tip[0],tip[1],tip[2],1.32,0.46,1.48).rotation.z = side*spread*0.17;
          }
          mesh(section, sphere, 0xffc88b, x - side, 4.6, z, 0.28, 0.55, 0.29, true);
          mesh(section, sphere, 0x705063, x + side, 0.35, z + 2, 2.3, 0.57, 0.7).rotation.y = side * 0.45;
          if (side === 1 && index % 3 === 1) {
            mesh(section, rootArch, 0x6f5067, 0, 0, z, 1, 1, 1);
          }
        } else if (world === 1) {
          crystalOutcrop(section,x,z,side,index);
          if (index%3!==1) crystalOutcrop(section,x+side*4.1,-z,side,index+3);
        } else {
          coralColony(section,x,z,side,index);
          if (index%3!==0) coralColony(section,x+side*3.8,-z,side,index+2);
          for(let i=0;i<3;i++){
            const anchor=x+side*(1.3+i*0.4);
            const kelpZ=z-2+i*0.76;
            const tip=[anchor+side*0.41,1.15+i*0.42,kelpZ-0.47];
            growBranch(section,0x497c66,[anchor,-0.13,kelpZ],tip,0.47);
            const frond=mesh(section,leafShape,0x6b9877,...tip,0.16,0.74,0.09);
            frond.rotation.z=-side*0.29;
          }
          for (let i=0;i<6;i++){
            box(section,0x438087,side*(4.55+i*0.57),-0.278,z+Math.sin(i*4)*3.6,0.54,0.009,0.086);
          }
        }
      }
    }
  }

  function createItem(item, world) {
    const group = new THREE.Group();
    scene.add(group);
    if ('collected' in item) {
      mesh(group, coinShape, 0xffbd36, 0, 0.64, 0, 1, 1, 1);
      mesh(group, coinShape, 0xffe27a, 0, 0.64, 0.065, 0.72, 0.72, 0.12, true);
      mesh(group, coinShape, 0xffe27a, 0, 0.64, -0.065, 0.72, 0.72, 0.12, true);
    } else {
      const {height:h, length, ramp, exit = 0, cars = 1} = hazards[item.type];
      contactShadow(group,0,0.019,-length/2,2.74,length+1.22);
      if (item.type === 'gate' && world !== 0) {
        const center = -length/2;
        const support = world === 1 ? 0x5a647c : 0x438581;
        const brace = world === 1 ? 0x3a4258 : 0x396d71;
        const trim = world === 1 ? 0xf8c579 : 0xb3e5cf;
        for (const side of [-1,1]) {
          box(group,support,side*0.99,h*0.5,center,0.24,h,length);
          box(group,trim,side*0.97,0.17,center,0.35,0.34,length);
          for(let i=0;i<4;i++){
            const tint=world===1 ? [0x8c6349,0x665047] : [0x668568,0x8f9580];
            const patch=mesh(group,rock,tint[i%2],side*(0.99-i%2*0.08),
              0.08+i*0.094,0.03-i*0.11,0.13,0.06,0.13);
            patch.rotation.y=i*1.7;
          }
        }
        const clearance = hazards.gate.clearance;
        box(group,brace,0,(h+clearance)/2,center,2.19,h-clearance,length);
        box(group,trim,0,h-0.13,0.02,2.16,0.1,0.065);
        for (const x of [-0.61,0.61]) {
          const left = box(group,0xffcf80,x-0.077,1.24,0.056,0.21,0.06,0.075,true);
          const right = box(group,0xffcf80,x+0.077,1.24,0.056,0.21,0.06,0.075,true);
          left.rotation.z = -Math.PI/4;
          right.rotation.z = Math.PI/4;
        }
      } else if (item.type === 'gate') {
        const center = -length/2;
        for (const side of [-1,1]) {
          if (world === 0) {
            growBranch(group,0x875e68,[side*1.06,0,center],[side*0.8,h-0.2,center],1.35);
          } else {
            mesh(group,leafShape,0x48899c,side*1.03,h*0.44,center,0.22,h*0.55,length*0.5);
          }
        }
        const beam = world === 0 ? 0x8f6375 : 0x71d8de;
        mesh(group,sphere,beam,0,1.36,center,1.13,0.38,length*0.52);
        for (const x of [-0.62,0,0.62]) {
          mesh(group,leafShape,world===0?0xe8ffc0:0xc8ffff,x,1.07,0.01,0.15,0.07,0.12,true);
        }
      } else if (ramp !== undefined) {
        const color = palettes[world].deck;
        const carLength = (length - ramp - exit) / cars;
        for (let car = 0; car < cars; car++) {
          const center = -ramp - (car + 0.5) * carLength;
          if (world === 1) {
            box(group,0x3c475a,0,h*0.38,center,1.89,h*0.71,carLength-0.1);
            box(group,0x8ca6ac,0,h-0.1,center,2.05,0.2,carLength);
            for (const edge of [-0.88,0.88]) {
              box(group,0xe4a961,edge,h-0.014,center,0.12,0.028,carLength-0.18);
              box(group,0x283342,edge,h*0.23,center,0.25,0.15,carLength-0.32);
            }
            for (let rib=-1;rib<=1;rib++) {
              box(group,0x697c89,0,h*0.47,center+rib*carLength*0.27,1.98,0.25,0.16);
            }
            box(group,0xffc977,0,h*0.64,center+carLength/2,1.25,0.1,0.07,true);
          } else if (world === 2) {
            mesh(group,sphere,0x325d70,0,h*0.30,center,1.02,h*0.29,carLength*0.505);
            box(group,0x5baea3,0,h*0.65,center,2.05,h*0.27,carLength-0.06);
            box(group,0xd6c595,0,h-0.095,center,2.05,0.19,carLength);
            for (const side of [-1,1]) {
              box(group,0x28575e,side*0.95,h-0.021,center,0.085,0.042,carLength-0.12);
              for (const u of [-0.29,0.29]) {
                mesh(group,sphere,0xc49a56,side*1.025,h*0.62,center+u*carLength,0.075,0.14,0.35);
              }
            }
            const boards=Math.max(3,Math.round(carLength/0.7));
            for (let board=1;board<boards;board++) {
              box(group,0xa99775,0,h-0.012,center+carLength*(board/boards-0.5),1.83,0.025,0.026);
            }
          } else {
            if (item.type === 'petal') {
              mesh(group,sphere,0x9d648e,0,h*0.38,center,1.15,h*0.41,carLength*0.49);
            }
            box(group,color,0,h/2,center,2.05,h,carLength);
            box(group,palettes[world].trim,0,h-0.025,center,1.86,0.05,carLength-0.12,true);
            for (const side of [-1,1]) {
              mesh(group,sphere,0xa96d9e,side*1.02,h*0.42,center,0.18,h*0.27,carLength*0.47);
              for (const offset of [-0.26,0,0.26]) {
                box(group,0x344561,side*1.04,h*0.64,center+offset*carLength,0.05,0.22,0.64);
              }
            }
          }
          if (car > 0) {
            box(group, 0x4c536e, 0,h-0.035,center+carLength/2,2.05,0.07,0.16);
          }
        }
        group.userData.ramps = [];
        for (const [span, start, descending] of [[ramp,0,false],[exit,length-exit,true]]) {
          if (!span) continue;
          const profile = new THREE.Shape();
          profile.moveTo(0,0);
          profile.lineTo(span,0);
          profile.lineTo(descending ? 0 : span,h);
          profile.closePath();
          const rampShape = new THREE.ExtrudeGeometry(profile, {depth:2.05, bevelEnabled:false});
          const slope = mesh(group, rampShape, color, -1.025, 0, -start, 1, 1, 1);
          slope.rotation.y = Math.PI/2;
          group.userData.ramps.push(rampShape);
          for (let i=1;i<=4;i++) {
            const height = h*(descending ? 1-i/5 : i/5);
            box(group, 0xfdf0c1, 0,height,-start-span*i/5,1.72,0.035,0.13,true);
          }
        }
      } else if (item.type === 'pillar') {
        mesh(group,rock,0x51435d,0,0.08,-length/2,1.11,0.34,length*0.53);
        mineral(group,0xa58ae6,0,0.17,-length*0.49,0.74,h-0.17,[0,0.33,0.07]);
        mineral(group,0x8fa5ec,-0.45,0.13,-length*0.59,0.37,h*0.58,[0.12,0.7,0.27]);
        mineral(group,0x8259b4,0.51,0.13,-length*0.43,0.43,h*0.7,[-0.09,0.4,-0.21]);
      } else if (item.type === 'pod' && world === 2) {
        mesh(group,sphere,0xd58586,0,h*0.43,-length/2,1.02,h*0.57,length*0.51);
        for (const rib of [-2,-1,0,1,2]) {
          const x=rib*0.25;
          mesh(group,leafShape,0xf1b28e,x,h*(0.76-Math.abs(rib)*0.095),-length/2,
            0.075,0.14,length*0.41).rotation.y=-rib*0.13;
        }
      } else if (item.type === 'pod') {
        const ends=[[-0.96,0.21,-0.7],[-0.24,h-0.17,-0.53],[0.36,h-0.19,-0.64],[0.94,0.19,-0.75]];
        for(let i=1;i<ends.length;i++){
          growBranch(group,0x75513b,ends[i-1],ends[i],1.89);
          mesh(group,leafShape,0x644433,...ends[i-1],0.21,0.2,0.19);
        }
        mesh(group,leafShape,0x8a6948,...ends[3],0.19,0.17,0.18);
        growBranch(group,0x554932,ends[1],[-0.44,0.18,-0.16],0.74);
        growBranch(group,0x607346,ends[2],[0.51,0.58,-0.52],0.4);
        mesh(group,leafShape,0xd1b478,-0.95,0.21,-0.7,0.065,0.13,0.13);
      } else {
        for(let i=0;i<5;i++){
          const height=i===2 ? 0.59 : 0.26+(i%3)*0.055;
          const fragment=mesh(group,rock,[0x8f6c5f,0x76615c,0x9d8071][i%3],
            (i-2)*0.35,height*0.6,-0.36+(i%2)*0.11,0.39,height,0.32);
          fragment.rotation.set(i*0.52,i*0.77,i*0.18);
        }
        mineral(group,0xcf9b5d,-0.17,0.27,-0.37,0.19,0.63,[0.06,0.6,-0.22]);
        mineral(group,0xc18450,0.31,0.19,-0.39,0.15,0.43,[-0.14,0.3,0.32]);
      }
    }
    return group;
  }

  return {buildTrack, createItem, update, reset};
}
