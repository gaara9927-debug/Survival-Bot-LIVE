import React,{useEffect,useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{EchoWildsGame,Snapshot}from'./game';
import'./style.css';

function App(){
  const canvas=useRef<HTMLCanvasElement>(null);
  const gameRef=useRef<EchoWildsGame>();
  if(!gameRef.current)gameRef.current=new EchoWildsGame();
  const game=gameRef.current;
  const[state,setState]=useState<Snapshot>(game.snapshot());
  const[logs,setLogs]=useState<string[]>(game.log);

  useEffect(()=>{
    const c=canvas.current!,ctx=c.getContext('2d')!;
    let raf=0,last=performance.now(),ui=0;
    const resize=()=>{const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c.width=Math.floor(r.width*d);c.height=Math.floor(r.height*d);ctx.setTransform(d,0,0,d,0,0)};
    resize();addEventListener('resize',resize);
    const down=(e:KeyboardEvent)=>{game.setKey(e.key.toLowerCase(),true);if(e.key===' ')game.attack();if(e.key.toLowerCase()==='e')game.interact()};
    const up=(e:KeyboardEvent)=>game.setKey(e.key.toLowerCase(),false);
    addEventListener('keydown',down);addEventListener('keyup',up);
    const loop=(now:number)=>{const dt=(now-last)/1000;last=now;game.update(dt);const rect=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);ctx.setTransform(d,0,0,d,0,0);game.render(ctx,rect.width,rect.height);ui+=dt;if(ui>.12){ui=0;setState(game.snapshot());setLogs([...game.log])}raf=requestAnimationFrame(loop)};
    raf=requestAnimationFrame(loop);
    const autosave=setInterval(()=>game.save(),20000);
    return()=>{cancelAnimationFrame(raf);clearInterval(autosave);removeEventListener('resize',resize);removeEventListener('keydown',down);removeEventListener('keyup',up)}
  },[game]);

  const move=(x:number,y:number)=>(ev:React.PointerEvent)=>{ev.preventDefault();game.setTouch(x,y);(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)};
  const stop=()=>game.setTouch(0,0);
  const clock=Math.floor(state.time*24);

  return <div className="app">
    <header>
      <div><span className="eyebrow">SURVIVAL ROGUELITE</span><h1>ECHO WILDS</h1></div>
      <div className="day">Dia {state.day} · {String(clock).padStart(2,'0')}:00</div>
    </header>

    <div className="layout">
      <aside className="panel stats">
        <h2>Explorador</h2>
        <Meter label="Vida" value={state.hp} icon="❤"/>
        <Meter label="Fome" value={state.hunger} icon="🍗"/>
        <div className="resources"><span>🪵 {state.wood}</span><span>🪨 {state.stone}</span><span>🫐 {state.berries}</span></div>
        <button onClick={()=>game.eatBerry()}>Comer fruta</button>
        <button onClick={()=>game.save()}>Salvar jogo</button>
      </aside>

      <section className="stage">
        <canvas ref={canvas}/>
        <div className="score">✦ {state.score}</div>
        <div className="mobileControls">
          <div className="dpad">
            <button className="up" onPointerDown={move(0,-1)} onPointerUp={stop} onPointerCancel={stop}>▲</button>
            <button className="left" onPointerDown={move(-1,0)} onPointerUp={stop} onPointerCancel={stop}>◀</button>
            <button className="right" onPointerDown={move(1,0)} onPointerUp={stop} onPointerCancel={stop}>▶</button>
            <button className="down" onPointerDown={move(0,1)} onPointerUp={stop} onPointerCancel={stop}>▼</button>
          </div>
          <div className="actions">
            <button className="attack" onPointerDown={()=>game.attack()}>⚔</button>
            <button className="use" onPointerDown={()=>game.interact()}>⛏</button>
          </div>
        </div>
      </section>

      <aside className="panel companion">
        <h2>Companion ECHO</h2>
        <p className="muted">IA aliada: luta, segue e coleta recursos.</p>
        <div className="segmented">
          <button onClick={()=>game.setCompanionMode('follow')}>Seguir</button>
          <button onClick={()=>game.setCompanionMode('stay')}>Ficar</button>
          <button onClick={()=>game.setCompanionMode('gather')}>Coletar</button>
        </div>
        <h3>Construção</h3>
        <button onClick={()=>game.build('wall')}>Parede · 3 🪵</button>
        <button onClick={()=>game.build('campfire')}>Fogueira · 4 🪵 2 🪨</button>
        <h3>Registro</h3>
        <div className="log">{logs.map((x,i)=><div key={i}>{x}</div>)}</div>
      </aside>
    </div>

    <footer>PC: WASD / setas · Espaço ataca · E coleta. No celular use os controles na tela.</footer>
  </div>
}

function Meter({label,value,icon}:{label:string,value:number,icon:string}){
  return <div className="meter"><div className="meterTop"><span>{icon} {label}</span><b>{value}%</b></div><div className="bar"><i style={{width:value+'%'}}/></div></div>
}

createRoot(document.getElementById('root')!).render(<App/>);