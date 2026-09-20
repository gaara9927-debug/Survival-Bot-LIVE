export type ResourceKind = 'tree' | 'rock' | 'berry';
export type BuildKind = 'wall' | 'campfire';

export type Vec = { x:number; y:number };

export type Player = Vec & {
  hp:number; hunger:number; wood:number; stone:number; berries:number;
  facing:Vec; attackCd:number; interactCd:number;
};

export type Companion = Vec & {
  hp:number; mode:'follow'|'stay'|'gather'; attackCd:number;
};

export type Enemy = Vec & { id:number; hp:number; speed:number; damage:number };
export type Resource = Vec & { id:number; kind:ResourceKind; hp:number };
export type Building = Vec & { id:number; kind:BuildKind; hp:number };

export type Snapshot = {
  hp:number; hunger:number; wood:number; stone:number; berries:number;
  day:number; time:number; score:number; companionMode:string;
};

const W=1600,H=1000;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const norm=(x:number,y:number)=>{const d=Math.hypot(x,y)||1;return{x:x/d,y:y/d}};

export class EchoWildsGame {
  width=W; height=H;
  player:Player={x:W/2,y:H/2,hp:100,hunger:100,wood:0,stone:0,berries:2,facing:{x:1,y:0},attackCd:0,interactCd:0};
  companion:Companion={x:W/2+55,y:H/2+30,hp:100,mode:'follow',attackCd:0};
  resources:Resource[]=[];
  enemies:Enemy[]=[];
  buildings:Building[]=[];
  score=0; elapsed=0; day=1; time=0.25; nextEnemy=2; nextId=1;
  keys=new Set<string>();
  touch={x:0,y:0};
  log:string[]=['Bem-vindo a Echo Wilds.'];

  constructor(){
    for(let i=0;i<90;i++) this.resources.push(this.makeResource(i%3===0?'rock':i%5===0?'berry':'tree'));
    this.load();
  }

  private makeResource(kind:ResourceKind):Resource{
    return {id:this.nextId++,kind,x:60+Math.random()*(W-120),y:60+Math.random()*(H-120),hp:kind==='tree'?3:kind==='rock'?4:2};
  }

  private addLog(s:string){this.log.unshift(s);this.log=this.log.slice(0,5)}

  setKey(k:string,on:boolean){on?this.keys.add(k):this.keys.delete(k)}
  setTouch(x:number,y:number){this.touch={x,y}}
  setCompanionMode(mode:Companion['mode']){this.companion.mode=mode;this.addLog('Companion: '+(mode==='follow'?'seguindo':mode==='stay'?'esperando':'coletando'))}

  eatBerry(){
    if(this.player.berries>0){
      this.player.berries--; this.player.hunger=clamp(this.player.hunger+26,0,100); this.player.hp=clamp(this.player.hp+4,0,100);
      this.addLog('Você comeu uma fruta.');
    }
  }

  build(kind:BuildKind){
    if(kind==='wall'){
      if(this.player.wood<3){this.addLog('Faltam 3 madeiras.');return}
      this.player.wood-=3;
      this.buildings.push({id:this.nextId++,kind,x:this.player.x+this.player.facing.x*42,y:this.player.y+this.player.facing.y*42,hp:80});
      this.addLog('Parede construída.');
    }else{
      if(this.player.wood<4||this.player.stone<2){this.addLog('Faltam 4 madeiras e 2 pedras.');return}
      this.player.wood-=4;this.player.stone-=2;
      this.buildings.push({id:this.nextId++,kind,x:this.player.x+this.player.facing.x*48,y:this.player.y+this.player.facing.y*48,hp:100});
      this.addLog('Fogueira construída.');
    }
  }

  attack(){
    if(this.player.attackCd>0)return;
    this.player.attackCd=.38;
    let hit=false;
    for(const e of this.enemies){
      const d=dist(this.player,e);
      if(d<68){
        const to=norm(e.x-this.player.x,e.y-this.player.y);
        if(to.x*this.player.facing.x+to.y*this.player.facing.y>.05){
          e.hp-=34; hit=true;
        }
      }
    }
    if(hit)this.addLog('Ataque acertou.');
  }

  interact(){
    if(this.player.interactCd>0)return;
    this.player.interactCd=.25;
    let best:Resource|undefined,bd=70;
    for(const r of this.resources){const d=dist(this.player,r);if(d<bd){bd=d;best=r}}
    if(!best){this.addLog('Nada para coletar por perto.');return}
    best.hp--;
    if(best.hp<=0){
      if(best.kind==='tree'){this.player.wood+=3;this.score+=8;this.addLog('+3 madeira')}
      if(best.kind==='rock'){this.player.stone+=2;this.score+=10;this.addLog('+2 pedra')}
      if(best.kind==='berry'){this.player.berries+=3;this.score+=6;this.addLog('+3 frutas')}
      this.resources=this.resources.filter(r=>r.id!==best!.id);
      setTimeout(()=>this.resources.push(this.makeResource(best!.kind)),2500);
    }
  }

  update(dt:number){
    dt=Math.min(dt,.05);
    this.elapsed+=dt;
    this.time=(this.time+dt/150)%1;
    this.day=1+Math.floor(this.elapsed/150);
    this.player.attackCd=Math.max(0,this.player.attackCd-dt);
    this.player.interactCd=Math.max(0,this.player.interactCd-dt);
    this.companion.attackCd=Math.max(0,this.companion.attackCd-dt);

    let dx=this.touch.x,dy=this.touch.y;
    if(this.keys.has('w')||this.keys.has('arrowup'))dy-=1;
    if(this.keys.has('s')||this.keys.has('arrowdown'))dy+=1;
    if(this.keys.has('a')||this.keys.has('arrowleft'))dx-=1;
    if(this.keys.has('d')||this.keys.has('arrowright'))dx+=1;
    if(dx||dy){
      const n=norm(dx,dy);this.player.facing=n;
      const speed=this.player.hunger>0?190:120;
      this.player.x=clamp(this.player.x+n.x*speed*dt,22,W-22);
      this.player.y=clamp(this.player.y+n.y*speed*dt,22,H-22);
    }

    this.player.hunger=clamp(this.player.hunger-dt*.55,0,100);
    if(this.player.hunger<=0)this.player.hp=clamp(this.player.hp-dt*2.5,0,100);

    for(const b of this.buildings){
      if(b.kind==='campfire'&&dist(this.player,b)<95)this.player.hp=clamp(this.player.hp+dt*2.4,0,100);
    }

    this.updateCompanion(dt);
    this.updateEnemies(dt);

    this.nextEnemy-=dt;
    const night=this.time>.72||this.time<.18;
    if(this.nextEnemy<=0&&this.enemies.length<(night?14:7)){
      this.nextEnemy=night?1.7+Math.random()*2:4+Math.random()*3;
      const side=Math.floor(Math.random()*4);
      let x=20,y=20;
      if(side===0){x=Math.random()*W;y=20}
      if(side===1){x=W-20;y=Math.random()*H}
      if(side===2){x=Math.random()*W;y=H-20}
      if(side===3){x=20;y=Math.random()*H}
      this.enemies.push({id:this.nextId++,x,y,hp:night?75:55,speed:night?75:58,damage:night?13:9});
    }

    const dead=this.enemies.filter(e=>e.hp<=0);
    if(dead.length){this.score+=dead.length*15;this.player.berries+=dead.length%2;this.enemies=this.enemies.filter(e=>e.hp>0)}

    if(this.player.hp<=0){
      this.player.hp=100;this.player.hunger=80;this.player.x=W/2;this.player.y=H/2;
      this.player.wood=Math.floor(this.player.wood/2);this.player.stone=Math.floor(this.player.stone/2);
      this.addLog('Você desmaiou e acordou no acampamento.');
    }
  }

  private updateCompanion(dt:number){
    const c=this.companion,p=this.player;
    if(c.mode==='follow'){
      const d=dist(c,p);
      if(d>75){const n=norm(p.x-c.x,p.y-c.y);c.x+=n.x*155*dt;c.y+=n.y*155*dt}
    }else if(c.mode==='gather'){
      let target:Resource|undefined,bd=9999;
      for(const r of this.resources){const d=dist(c,r);if(d<bd){bd=d;target=r}}
      if(target){
        if(bd>38){const n=norm(target.x-c.x,target.y-c.y);c.x+=n.x*125*dt;c.y+=n.y*125*dt}
        else{
          target.hp-=dt*1.8;
          if(target.hp<=0){
            if(target.kind==='tree')p.wood+=2;if(target.kind==='rock')p.stone+=1;if(target.kind==='berry')p.berries+=2;
            this.resources=this.resources.filter(r=>r.id!==target!.id);this.score+=5;
          }
        }
      }
    }
    let near:Enemy|undefined,bd=115;
    for(const e of this.enemies){const d=dist(c,e);if(d<bd){bd=d;near=e}}
    if(near){
      if(bd>42){const n=norm(near.x-c.x,near.y-c.y);c.x+=n.x*145*dt;c.y+=n.y*145*dt}
      else if(c.attackCd<=0){near.hp-=22;c.attackCd=.55}
    }
  }

  private updateEnemies(dt:number){
    const night=this.time>.72||this.time<.18;
    for(const e of this.enemies){
      const target=dist(e,this.companion)<dist(e,this.player)?this.companion:this.player;
      const d=dist(e,target);
      if(d>30){const n=norm(target.x-e.x,target.y-e.y);e.x+=n.x*e.speed*dt;e.y+=n.y*e.speed*dt}
      else{
        const dmg=e.damage*(night?1.15:1)*dt;
        target.hp=clamp(target.hp-dmg,0,100);
      }
    }
    if(this.companion.hp<=0){this.companion.hp=100;this.companion.x=this.player.x+45;this.companion.y=this.player.y+30;this.addLog('Companion retornou ao acampamento.')}
  }

  snapshot():Snapshot{
    return {hp:Math.round(this.player.hp),hunger:Math.round(this.player.hunger),wood:this.player.wood,stone:this.player.stone,berries:this.player.berries,day:this.day,time:this.time,score:this.score,companionMode:this.companion.mode};
  }

  save(){
    localStorage.setItem('echo-wilds-save',JSON.stringify({player:this.player,companion:this.companion,buildings:this.buildings,score:this.score,elapsed:this.elapsed,day:this.day,time:this.time}));
    this.addLog('Jogo salvo.');
  }
  load(){
    try{const s=JSON.parse(localStorage.getItem('echo-wilds-save')||'null');if(s){Object.assign(this.player,s.player||{});Object.assign(this.companion,s.companion||{});this.buildings=s.buildings||[];this.score=s.score||0;this.elapsed=s.elapsed||0;this.day=s.day||1;this.time=s.time??.25;this.addLog('Save carregado.')}}catch{}
  }

  render(ctx:CanvasRenderingContext2D,cssW:number,cssH:number){
    const scale=Math.min(cssW/900,cssH/560);
    const viewW=cssW/scale,viewH=cssH/scale;
    const camX=clamp(this.player.x-viewW/2,0,W-viewW),camY=clamp(this.player.y-viewH/2,0,H-viewH);
    ctx.setTransform(scale,0,0,scale,0,0);
    ctx.clearRect(0,0,viewW,viewH);

    ctx.fillStyle='#173823';ctx.fillRect(0,0,viewW,viewH);
    ctx.save();ctx.translate(-camX,-camY);

    for(let x=0;x<W;x+=80)for(let y=0;y<H;y+=80){ctx.fillStyle=((x+y)/80)%2?'#1b4129':'#1d472d';ctx.fillRect(x,y,80,80)}

    for(const b of this.buildings){
      if(b.kind==='wall'){ctx.fillStyle='#76543b';ctx.fillRect(b.x-22,b.y-12,44,24)}
      else{ctx.fillStyle='#7b3f22';ctx.beginPath();ctx.arc(b.x,b.y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffb23f';ctx.beginPath();ctx.arc(b.x,b.y-3,9,0,Math.PI*2);ctx.fill()}
    }

    for(const r of this.resources){
      if(r.kind==='tree'){ctx.fillStyle='#55391f';ctx.fillRect(r.x-6,r.y-2,12,26);ctx.fillStyle='#2e7d43';ctx.beginPath();ctx.arc(r.x,r.y-13,22,0,7);ctx.fill()}
      if(r.kind==='rock'){ctx.fillStyle='#777f83';ctx.beginPath();ctx.arc(r.x,r.y,16,0,7);ctx.fill()}
      if(r.kind==='berry'){ctx.fillStyle='#286b38';ctx.beginPath();ctx.arc(r.x,r.y,14,0,7);ctx.fill();ctx.fillStyle='#e8557a';for(const o of [-6,0,6]){ctx.beginPath();ctx.arc(r.x+o,r.y-3+Math.abs(o)/3,3,0,7);ctx.fill()}}
    }

    for(const e of this.enemies){
      ctx.fillStyle='#a83d62';ctx.beginPath();ctx.arc(e.x,e.y,16,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(e.x-7,e.y-4,4,4);ctx.fillRect(e.x+3,e.y-4,4,4);
    }

    ctx.fillStyle='#63d6ff';ctx.beginPath();ctx.arc(this.companion.x,this.companion.y,14,0,7);ctx.fill();ctx.fillStyle='#baf2ff';ctx.font='12px system-ui';ctx.fillText('ECHO',this.companion.x-16,this.companion.y-22);

    ctx.fillStyle='#f3d3a1';ctx.beginPath();ctx.arc(this.player.x,this.player.y,15,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(this.player.x,this.player.y);ctx.lineTo(this.player.x+this.player.facing.x*25,this.player.y+this.player.facing.y*25);ctx.stroke();

    ctx.restore();

    const night=this.time>.72||this.time<.18;
    const darkness=night?.42:Math.max(0,Math.abs(this.time-.5)-.25)*.45;
    if(darkness>0){ctx.fillStyle='rgba(3,8,18,'+darkness+')';ctx.fillRect(0,0,viewW,viewH)}

    ctx.setTransform(1,0,0,1,0,0);
  }
}