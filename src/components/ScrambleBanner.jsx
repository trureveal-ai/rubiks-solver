export default function ScrambleBanner({seq}) {
  if(!seq?.length) return null;
  return <div style={{background:"#08080f",border:"1px solid #1a1a2e",borderRadius:10,padding:"12px 16px",marginBottom:14}}><div style={{fontSize:7,color:"#444",letterSpacing:3,marginBottom:8,textAlign:"center"}}>🎲 SCRAMBLE ({seq.length} MOVES)</div><div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>{seq.map((m,i)=><span key={i} style={{fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.78rem",color:m.includes("'")?"#FF6D00":m.includes("2")?"#aaa":"#FFD600",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:4,padding:"2px 7px"}}>{m}</span>)}</div></div>;
}
