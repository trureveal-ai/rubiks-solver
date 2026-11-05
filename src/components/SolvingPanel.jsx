// The "solving in progress" screen: spinner, live solver progress, cancel.
export default function SolvingPanel({ solver, onCancel }) {
  return (
    <div style={{textAlign:"center",padding:"60px 0",maxWidth:400,margin:"0 auto"}}>
      <div style={{width:60,height:60,margin:"0 auto 20px",borderRadius:"50%",border:"3px solid var(--border)",borderTop:"3px solid var(--accent)",borderRight:"3px solid var(--accent-2)",animation:"spin .8s linear infinite"}}/>
      <div style={{fontSize:10,letterSpacing:6,color:"#444",animation:"pulse 1.4s ease infinite",marginBottom:16}}>SOLVING...</div>
      {solver.solveProgress && (
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:16,marginBottom:16}}>
          {solver.solveProgress.orientation && (
            <div style={{fontSize:8,color:"var(--accent)",letterSpacing:2,marginBottom:8}}>
              ORIENTATION {solver.solveProgress.orientation} / {solver.solveProgress.totalOrientations}
              {solver.solveProgress.bestLen < Infinity && (
                <span style={{color:"var(--green)",marginLeft:8}}>BEST: {solver.solveProgress.bestLen} MOVES</span>
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
      <button onClick={onCancel} style={{background:"transparent",border:"1px solid var(--red)",borderRadius:8,padding:"10px 24px",color:"var(--red)",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,cursor:"pointer"}}>✕ CANCEL</button>
    </div>
  );
}
