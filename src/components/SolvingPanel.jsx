// The "solving in progress" screen: spinner, live solver progress, cancel.
export default function SolvingPanel({ solver, onCancel }) {
  return (
    <div style={{textAlign:"center",padding:"60px 0",maxWidth:400,margin:"0 auto"}}>
      <div style={{width:60,height:60,margin:"0 auto 20px",borderRadius:"50%",border:"3px solid #1a1a2e",borderTop:"3px solid #FFD600",borderRight:"3px solid #E65100",animation:"spin .8s linear infinite"}}/>
      <div style={{fontSize:10,letterSpacing:6,color:"#444",animation:"pulse 1.4s ease infinite",marginBottom:16}}>SOLVING...</div>
      {solver.solveProgress && (
        <div style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:10,padding:16,marginBottom:16}}>
          {solver.solveProgress.orientation && (
            <div style={{fontSize:8,color:"#FFD600",letterSpacing:2,marginBottom:8}}>
              ORIENTATION {solver.solveProgress.orientation} / {solver.solveProgress.totalOrientations}
              {solver.solveProgress.bestLen < Infinity && (
                <span style={{color:"#2E7D32",marginLeft:8}}>BEST: {solver.solveProgress.bestLen} MOVES</span>
              )}
            </div>
          )}
          {solver.solveProgress.iters && (
            <div style={{fontSize:8,color:"#555",letterSpacing:1}}>
              {(solver.solveProgress.iters / 1000).toFixed(0)}K iterations
            </div>
          )}
        </div>
      )}
      <button onClick={onCancel} style={{background:"transparent",border:"1px solid #C62828",borderRadius:8,padding:"10px 24px",color:"#C62828",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,cursor:"pointer"}}>✕ CANCEL</button>
    </div>
  );
}
