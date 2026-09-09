'use client';
import {useEffect} from 'react';

export function NeuralHud(){
 useEffect(()=>{
  const root=document.documentElement;
  let raf=0;
  const move=(e:PointerEvent)=>{
   cancelAnimationFrame(raf);
   raf=requestAnimationFrame(()=>{
    root.style.setProperty('--hud-x',String(e.clientX/window.innerWidth-.5));
    root.style.setProperty('--hud-y',String(e.clientY/window.innerHeight-.5));
   });
  };
  window.addEventListener('pointermove',move,{passive:true});
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('pointermove',move);};
 },[]);
 return <div className="neural-hud" aria-hidden="true">
  <div className="hud-grid"/>
  <div className="hud-glow hud-glow-a"/>
  <div className="hud-glow hud-glow-b"/>
  <div className="hud-ring hud-ring-a"><i/><i/><i/><i/></div>
  <div className="hud-ring hud-ring-b"><i/><i/><i/></div>
  <div className="hud-crosshair"><span/><span/></div>
  <div className="hud-scan"/>
  <div className="hud-dots"/>
 </div>;
}
