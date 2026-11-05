export default function ScrambleBanner({seq}) {
  if(!seq?.length) return null;
  return <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 16px",marginBottom:14}}><div style={{fontSize:11,color:"#444",letterSpacing:1,marginBottom:8,textAlign:"center"}}>🎲 SCRAMBLE ({seq.length} MOVES)</div><div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>{seq.map((m,i)=><span key={i} style={{fontFamily:"var(--font-mono)",fontWeight:900,fontSize:"0.85rem",color:m.includes("'")?"var(--orange)":m.includes("2")?"#aaa":"var(--accent)",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:4,padding:"2px 7px"}}>{m}</span>)}</div></div>;
}
