import { C, T3D, FACE_COLOR } from "../engine/cube.js";

export default function Cube3D({cube,rotX,rotY,highlight}) {
  return <div style={{perspective:600}}><div style={{width:160,height:160,transformStyle:"preserve-3d",transform:`rotateX(${rotX}deg) rotateY(${rotY}deg)`,transition:"transform .08s linear",position:"relative"}}>{Object.entries(cube).map(([fk,stickers])=><div key={fk} style={{position:"absolute",width:160,height:160,transform:T3D[fk],display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,padding:6,background:"#111",border:`2px solid ${highlight===fk?"#FFD600":"#222"}`,backfaceVisibility:"visible",transition:"border-color .3s"}}>{stickers.map((col,i)=><div key={i} style={{background:C[col]||"#1a1a1a",borderRadius:4,border:"2px solid rgba(0,0,0,0.4)",boxShadow:"inset 0 0 4px rgba(0,0,0,0.3)",transition:"background .25s"}}/>)}</div>)}</div></div>;
}
