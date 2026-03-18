// Kociemba two-phase algorithm — adapted from cubejs (MIT) as pure ESM.
// No CJS wrappers, no require(), no this.Cube pattern.

// ─── Face / cubie indices ────────────────────────────────────────────────────
const U=0, R=1, F=2, D=3, L=4, B=5;
const URF=0, UFL=1, ULB=2, UBR=3, DFR=4, DLF=5, DBL=6, DRB=7;
const UR=0, UF=1, UL=2, UB=3, DR=4, DF=5, DL=6, DB=7, FR=8, FL=9, BL=10, BR=11;

// ─── Facelet tables ──────────────────────────────────────────────────────────
const _U=x=>x-1, _R=x=>8+x, _F=x=>17+x, _D=x=>26+x, _L=x=>35+x, _Bx=x=>44+x;
const centerFacelet = [4,13,22,31,40,49];
const cornerFacelet = [
  [_U(9),_R(1),_F(3)],[_U(7),_F(1),_L(3)],[_U(1),_L(1),_Bx(3)],[_U(3),_Bx(1),_R(3)],
  [_D(3),_F(9),_R(7)],[_D(1),_L(9),_F(7)],[_D(7),_Bx(9),_L(7)],[_D(9),_R(9),_Bx(7)]
];
const edgeFacelet = [
  [_U(6),_R(2)],[_U(8),_F(2)],[_U(4),_L(2)],[_U(2),_Bx(2)],
  [_D(6),_R(8)],[_D(2),_F(8)],[_D(4),_L(8)],[_D(8),_Bx(8)],
  [_F(6),_R(4)],[_F(4),_L(6)],[_Bx(6),_L(4)],[_Bx(4),_R(6)]
];
const centerColor = ['U','R','F','D','L','B'];
const cornerColor = [
  ['U','R','F'],['U','F','L'],['U','L','B'],['U','B','R'],
  ['D','F','R'],['D','L','F'],['D','B','L'],['D','R','B']
];
const edgeColor = [
  ['U','R'],['U','F'],['U','L'],['U','B'],
  ['D','R'],['D','F'],['D','L'],['D','B'],
  ['F','R'],['F','L'],['B','L'],['B','R']
];

// ─── parseAlg (closure over full 18-move map) ────────────────────────────────
const parseAlg = (() => {
  const nums = {U:0,R:1,F:2,D:3,L:4,B:5,E:6,M:7,S:8,x:9,y:10,z:11,u:12,r:13,f:14,d:15,l:16,b:17};
  const names = {0:'U',1:'R',2:'F',3:'D',4:'L',5:'B',6:'E',7:'M',8:'S',9:'x',10:'y',11:'z',12:'u',13:'r',14:'f',15:'d',16:'l',17:'b'};
  return function parseAlg(arg) {
    if (typeof arg === 'string') {
      return arg.split(/\s+/).filter(p=>p.length>0).map(part=>{
        if (part.length>2) throw new Error('Invalid move: '+part);
        const move = nums[part[0]];
        if (move===undefined) throw new Error('Invalid move: '+part);
        const power = part.length===1 ? 0 : part[1]==='2' ? 1 : part[1]==="'" ? 2 : (() => { throw new Error('Invalid move: '+part); })();
        return move*3+power;
      });
    } else if (arg.length!=null) {
      return arg;
    } else {
      return [arg];
    }
  };
  void names; // used in Cube.inverse below via the outer closure
})();

// ─── Cube class ──────────────────────────────────────────────────────────────
class Cube {
  constructor(other) {
    if (other!=null) { this.init(other); } else { this.identity(); }
    this.newCenter=new Array(6).fill(0);
    this.newCp=new Array(8).fill(0);
    this.newEp=new Array(12).fill(0);
    this.newCo=new Array(8).fill(0);
    this.newEo=new Array(12).fill(0);
  }
  init(state) {
    this.center=state.center.slice(); this.co=state.co.slice();
    this.ep=state.ep.slice(); this.cp=state.cp.slice(); this.eo=state.eo.slice();
  }
  identity() {
    this.center=[0,1,2,3,4,5];
    this.cp=[0,1,2,3,4,5,6,7]; this.co=new Array(8).fill(0);
    this.ep=[0,1,2,3,4,5,6,7,8,9,10,11]; this.eo=new Array(12).fill(0);
  }
  toJSON() { return {center:this.center,cp:this.cp,co:this.co,ep:this.ep,eo:this.eo}; }
  clone() { return new Cube(this.toJSON()); }

  asString() {
    const result=[];
    for (let i=0;i<=5;i++) result[9*i+4]=centerColor[this.center[i]];
    for (let i=0;i<=7;i++) { const c=this.cp[i],o=this.co[i]; for (let n=0;n<=2;n++) result[cornerFacelet[i][(n+o)%3]]=cornerColor[c][n]; }
    for (let i=0;i<=11;i++) { const e=this.ep[i],o=this.eo[i]; for (let n=0;n<=1;n++) result[edgeFacelet[i][(n+o)%2]]=edgeColor[e][n]; }
    return result.join('');
  }

  static fromString(str) {
    const cube=new Cube;
    for (let i=0;i<=5;i++) for (let j=0;j<=5;j++) if (str[9*i+4]===centerColor[j]) cube.center[i]=j;
    for (let i=0;i<=7;i++) {
      let ori; for (ori=0;ori<=2;ori++) { const c=str[cornerFacelet[i][ori]]; if (c==='U'||c==='D') break; }
      const col1=str[cornerFacelet[i][(ori+1)%3]], col2=str[cornerFacelet[i][(ori+2)%3]];
      for (let j=0;j<=7;j++) if (col1===cornerColor[j][1]&&col2===cornerColor[j][2]) { cube.cp[i]=j; cube.co[i]=ori%3; }
    }
    for (let i=0;i<=11;i++) {
      for (let j=0;j<=11;j++) {
        if (str[edgeFacelet[i][0]]===edgeColor[j][0]&&str[edgeFacelet[i][1]]===edgeColor[j][1]) { cube.ep[i]=j; cube.eo[i]=0; break; }
        if (str[edgeFacelet[i][0]]===edgeColor[j][1]&&str[edgeFacelet[i][1]]===edgeColor[j][0]) { cube.ep[i]=j; cube.eo[i]=1; break; }
      }
    }
    return cube;
  }

  isSolved() {
    const clone=this.clone(); clone.move(clone.upright());
    for (let c=0;c<=5;c++) if (clone.center[c]!==c) return false;
    for (let c=0;c<=7;c++) if (clone.cp[c]!==c||clone.co[c]!==0) return false;
    for (let e=0;e<=11;e++) if (clone.ep[e]!==e||clone.eo[e]!==0) return false;
    return true;
  }

  centerMultiply(other) {
    for (let to=0;to<=5;to++) this.newCenter[to]=this.center[other.center[to]];
    [this.center,this.newCenter]=[this.newCenter,this.center]; return this;
  }
  cornerMultiply(other) {
    for (let to=0;to<=7;to++) { const from=other.cp[to]; this.newCp[to]=this.cp[from]; this.newCo[to]=(this.co[from]+other.co[to])%3; }
    [this.cp,this.newCp]=[this.newCp,this.cp]; [this.co,this.newCo]=[this.newCo,this.co]; return this;
  }
  edgeMultiply(other) {
    for (let to=0;to<=11;to++) { const from=other.ep[to]; this.newEp[to]=this.ep[from]; this.newEo[to]=(this.eo[from]+other.eo[to])%2; }
    [this.ep,this.newEp]=[this.newEp,this.ep]; [this.eo,this.newEo]=[this.newEo,this.eo]; return this;
  }
  multiply(other) { this.centerMultiply(other); this.cornerMultiply(other); this.edgeMultiply(other); return this; }

  move(arg) {
    for (const mv of parseAlg(arg)) {
      const face=mv/3|0, power=mv%3;
      for (let x=0;x<=power;x++) this.multiply(Cube.moves[face]);
    }
    return this;
  }

  upright() {
    const clone=this.clone(); const result=[];
    let i; for (i=0;i<=5;i++) if (clone.center[i]===F) break;
    if (i===D) result.push('x'); else if (i===U) result.push("x'"); else if (i===B) result.push('x2'); else if (i===R) result.push('y'); else if (i===L) result.push("y'");
    if (result.length) clone.move(result[0]);
    let j; for (j=0;j<=5;j++) if (clone.center[j]===U) break;
    if (j===L) result.push('z'); else if (j===R) result.push("z'"); else if (j===D) result.push('z2');
    return result.join(' ');
  }

  static inverse(arg) {
    const faceNames={0:'U',1:'R',2:'F',3:'D',4:'L',5:'B',6:'E',7:'M',8:'S',9:'x',10:'y',11:'z',12:'u',13:'r',14:'f',15:'d',16:'l',17:'b'};
    const moves=parseAlg(arg);
    const result=moves.map(mv=>{ const face=mv/3|0, power=mv%3; return face*3+(-(power-1)+1); }).reverse();
    if (typeof arg==='string') {
      return result.map(mv=>{ const face=mv/3|0, power=mv%3; return faceNames[face]+(power===1?'2':power===2?"'":""); }).join(' ');
    } else if (arg.length!=null) { return result; } else { return result[0]; }
  }
}

Cube.moves = [
  { center:[0,1,2,3,4,5], cp:[UBR,URF,UFL,ULB,DFR,DLF,DBL,DRB], co:[0,0,0,0,0,0,0,0], ep:[UB,UR,UF,UL,DR,DF,DL,DB,FR,FL,BL,BR], eo:[0,0,0,0,0,0,0,0,0,0,0,0] }, // U
  { center:[0,1,2,3,4,5], cp:[DFR,UFL,ULB,URF,DRB,DLF,DBL,UBR], co:[2,0,0,1,1,0,0,2], ep:[FR,UF,UL,UB,BR,DF,DL,DB,DR,FL,BL,UR], eo:[0,0,0,0,0,0,0,0,0,0,0,0] }, // R
  { center:[0,1,2,3,4,5], cp:[UFL,DLF,ULB,UBR,URF,DFR,DBL,DRB], co:[1,2,0,0,2,1,0,0], ep:[UR,FL,UL,UB,DR,FR,DL,DB,UF,DF,BL,BR], eo:[0,1,0,0,0,1,0,0,1,1,0,0] }, // F
  { center:[0,1,2,3,4,5], cp:[URF,UFL,ULB,UBR,DLF,DBL,DRB,DFR], co:[0,0,0,0,0,0,0,0], ep:[UR,UF,UL,UB,DF,DL,DB,DR,FR,FL,BL,BR], eo:[0,0,0,0,0,0,0,0,0,0,0,0] }, // D
  { center:[0,1,2,3,4,5], cp:[URF,ULB,DBL,UBR,DFR,UFL,DLF,DRB], co:[0,1,2,0,0,2,1,0], ep:[UR,UF,BL,UB,DR,DF,FL,DB,FR,UL,DL,BR], eo:[0,0,0,0,0,0,0,0,0,0,0,0] }, // L
  { center:[0,1,2,3,4,5], cp:[URF,UFL,UBR,DRB,DFR,DLF,ULB,DBL], co:[0,0,1,2,0,0,2,1], ep:[UR,UF,UL,BR,DR,DF,DL,BL,FR,FL,UB,DB], eo:[0,0,0,1,0,0,0,1,0,0,1,1] }, // B
  { center:[U,F,L,D,B,R], cp:[URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB], co:[0,0,0,0,0,0,0,0], ep:[UR,UF,UL,UB,DR,DF,DL,DB,FL,BL,BR,FR], eo:[0,0,0,0,0,0,0,0,1,1,1,1] }, // E
  { center:[B,R,U,F,L,D], cp:[URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB], co:[0,0,0,0,0,0,0,0], ep:[UR,UB,UL,DB,DR,UF,DL,DF,FR,FL,BL,BR], eo:[0,1,0,1,0,1,0,1,0,0,0,0] }, // M
  { center:[L,U,F,R,D,B], cp:[URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB], co:[0,0,0,0,0,0,0,0], ep:[UL,UF,DL,UB,UR,DF,DR,DB,FR,FL,BL,BR], eo:[1,0,1,0,1,0,1,0,0,0,0,0] }, // S
];

// Compound moves: x, y, z, u, r, f, d, l, b
Cube.moves.push(new Cube().move("R M' L'").toJSON()); // x
Cube.moves.push(new Cube().move("U E' D'").toJSON()); // y
Cube.moves.push(new Cube().move("F S B'").toJSON());  // z
Cube.moves.push(new Cube().move("U E'").toJSON());    // u
Cube.moves.push(new Cube().move("R M'").toJSON());    // r
Cube.moves.push(new Cube().move("F S").toJSON());     // f
Cube.moves.push(new Cube().move("D E").toJSON());     // d
Cube.moves.push(new Cube().move("L M").toJSON());     // l
Cube.moves.push(new Cube().move("B S'").toJSON());    // b

// ─── Solve helpers ───────────────────────────────────────────────────────────
function Cnk(n,k) {
  if (n<k) return 0;
  if (k>n/2) k=n-k;
  let s=1,i=n,j=1;
  while (i!==n-k) { s*=i; s/=j; i--; j++; }
  return s;
}
function factorial(n) { let f=1; for (let i=2;i<=n;i++) f*=i; return f; }
function rotateLeft(arr,l,r) { const tmp=arr[l]; for (let i=l;i<r;i++) arr[i]=arr[i+1]; arr[r]=tmp; }
function rotateRight(arr,l,r) { const tmp=arr[r]; for (let i=r;i>l;i--) arr[i]=arr[i-1]; arr[l]=tmp; }

function permutationIndex(context,start,end,fromEnd=false) {
  const maxOur=end-start, maxB=factorial(maxOur+1);
  const maxAll=context==='corners'?7:11, permName=context==='corners'?'cp':'ep';
  const our=new Array(maxOur+1).fill(0);
  return function(index) {
    if (index!=null) {
      for (let i=0;i<=maxOur;i++) our[i]=i+start;
      let b=index%maxB, a=index/maxB|0;
      const perm=this[permName];
      for (let i=0;i<=maxAll;i++) perm[i]=-1;
      for (let j=1;j<=maxOur;j++) { let k=b%(j+1); b=b/(j+1)|0; while(k-->0) rotateRight(our,0,j); }
      let x=maxOur;
      if (fromEnd) { for (let j=0;j<=maxAll;j++) { const c=Cnk(maxAll-j,x+1); if (a-c>=0) { perm[j]=our[maxOur-x]; a-=c; x--; } } }
      else { for (let j=maxAll;j>=0;j--) { const c=Cnk(j,x+1); if (a-c>=0) { perm[j]=our[x]; a-=c; x--; } } }
      return this;
    } else {
      const perm=this[permName];
      for (let i=0;i<=maxOur;i++) our[i]=-1;
      let a=0,b=0,x=0;
      if (fromEnd) {
        for (let j=maxAll;j>=0;j--) { if (perm[j]>=start&&perm[j]<=end) { a+=Cnk(maxAll-j,x+1); our[maxOur-x]=perm[j]; x++; } }
      } else {
        for (let j=0;j<=maxAll;j++) { if (perm[j]>=start&&perm[j]<=end) { a+=Cnk(j,x+1); our[x]=perm[j]; x++; } }
      }
      for (let j=maxOur;j>=0;j--) { let k=0; while(our[j]!==start+j) { rotateLeft(our,0,j); k++; } b=(j+1)*b+k; }
      return a*maxB+b;
    }
  };
}

const Include = {
  twist(twist) {
    if (twist!=null) {
      let parity=0;
      for (let i=6;i>=0;i--) { const ori=twist%3; twist=(twist/3)|0; this.co[i]=ori; parity+=ori; }
      this.co[7]=(3-parity%3)%3; return this;
    } else { let v=0; for (let i=0;i<=6;i++) v=3*v+this.co[i]; return v; }
  },
  flip(flip) {
    if (flip!=null) {
      let parity=0;
      for (let i=10;i>=0;i--) { const ori=flip%2; flip=flip/2|0; this.eo[i]=ori; parity+=ori; }
      this.eo[11]=(2-parity%2)%2; return this;
    } else { let v=0; for (let i=0;i<=10;i++) v=2*v+this.eo[i]; return v; }
  },
  cornerParity() {
    let s=0;
    for (let i=DRB;i>=URF+1;i--) for (let j=i-1;j>=URF;j--) if (this.cp[j]>this.cp[i]) s++;
    return s%2;
  },
  edgeParity() {
    let s=0;
    for (let i=BR;i>=UR+1;i--) for (let j=i-1;j>=UR;j--) if (this.ep[j]>this.ep[i]) s++;
    return s%2;
  },
  URFtoDLF: permutationIndex('corners',URF,DLF),
  URtoUL:   permutationIndex('edges',UR,UL),
  UBtoDF:   permutationIndex('edges',UB,DF),
  URtoDF:   permutationIndex('edges',UR,DF),
  FRtoBR:   permutationIndex('edges',FR,BR,true),
};
for (const [k,v] of Object.entries(Include)) Cube.prototype[k]=v;

// ─── Move tables ─────────────────────────────────────────────────────────────
function computeMoveTable(context,coord,size) {
  const apply=context==='corners'?'cornerMultiply':'edgeMultiply';
  const cube=new Cube; const results=[];
  for (let i=0;i<size;i++) {
    cube[coord](i); const inner=[];
    for (let j=0;j<=5;j++) { const move=Cube.moves[j]; for (let k=0;k<=2;k++) { cube[apply](move); inner.push(cube[coord]()); } cube[apply](move); }
    results.push(inner);
  }
  return results;
}

const mergeURtoDF=(() => {
  const a=new Cube, b=new Cube;
  return function(URtoUL,UBtoDF) {
    a.URtoUL(URtoUL); b.UBtoDF(UBtoDF);
    for (let i=0;i<=7;i++) { if (a.ep[i]!==-1) { if (b.ep[i]!==-1) return -1; else b.ep[i]=a.ep[i]; } }
    return b.URtoDF();
  };
})();

const N_TWIST=2187,N_FLIP=2048,N_PARITY=2,N_FRtoBR=11880,N_SLICE1=495,N_SLICE2=24,N_URFtoDLF=20160,N_URtoDF=20160,N_URtoUL=1320,N_UBtoDF=1320;

Cube.moveTables = {
  parity:[[1,0,1,1,0,1,1,0,1,1,0,1,1,0,1,1,0,1],[0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0]],
  twist:null, flip:null, FRtoBR:null, URFtoDLF:null, URtoDF:null, URtoUL:null, UBtoDF:null, mergeURtoDF:null
};

const moveTableParams = {
  twist:['corners',N_TWIST], flip:['edges',N_FLIP], FRtoBR:['edges',N_FRtoBR],
  URFtoDLF:['corners',N_URFtoDLF], URtoDF:['edges',N_URtoDF],
  URtoUL:['edges',N_URtoUL], UBtoDF:['edges',N_UBtoDF], mergeURtoDF:[]
};

Cube.computeMoveTables = function(...tables) {
  if (!tables.length) tables=Object.keys(moveTableParams);
  for (const name of tables) {
    if (this.moveTables[name]!==null) continue;
    if (name==='mergeURtoDF') {
      const t=[];
      for (let ul=0;ul<=335;ul++) { const row=[]; for (let bf=0;bf<=335;bf++) row.push(mergeURtoDF(ul,bf)); t.push(row); }
      this.moveTables.mergeURtoDF=t;
    } else {
      const [scope,size]=moveTableParams[name];
      this.moveTables[name]=computeMoveTable(scope,name,size);
    }
  }
  return this;
};

// ─── Pruning tables ──────────────────────────────────────────────────────────
const allMoves1=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
const allMoves2=[0,1,2,4,7,9,10,11,13,16];

const nextMoves1=(() => {
  const r=[];
  for (let lf=0;lf<=5;lf++) {
    const next=[];
    for (let face=0;face<=5;face++) if (face!==lf&&face!==lf-3) for (let p=0;p<=2;p++) next.push(face*3+p);
    r.push(next);
  }
  return r;
})();

const nextMoves2=(() => {
  const r=[];
  for (let lf=0;lf<=5;lf++) {
    const next=[];
    for (let face=0;face<=5;face++) {
      if (face===lf||face===lf-3) continue;
      const powers=(face===0||face===3)?[0,1,2]:[1];
      for (const p of powers) next.push(face*3+p);
    }
    r.push(next);
  }
  return r;
})();

function pruning(table,index,value) {
  const pos=index%8, slot=index>>3, shift=pos<<2;
  if (value!=null) { table[slot]&=~(0xF<<shift); table[slot]|=value<<shift; return value; }
  return (table[slot]&(0xF<<shift))>>>shift;
}

function computePruningTable(phase,size,currentCoords,nextIndex) {
  const table=new Array(Math.ceil(size/8)).fill(0xFFFFFFFF);
  const moves=phase===1?allMoves1:allMoves2;
  let depth=0; pruning(table,0,depth); let done=1;
  while (done!==size) {
    for (let index=0;index<size;index++) {
      if (pruning(table,index)!==depth) continue;
      const current=currentCoords(index);
      for (const move of moves) {
        const next=nextIndex(current,move);
        if (pruning(table,next)===0xF) { pruning(table,next,depth+1); done++; }
      }
    }
    depth++;
  }
  return table;
}

Cube.pruningTables = { sliceTwist:null, sliceFlip:null, sliceURFtoDLFParity:null, sliceURtoDFParity:null };

const pruningTableParams = {
  sliceTwist:[1,N_SLICE1*N_TWIST,
    i=>[i%N_SLICE1,i/N_SLICE1|0],
    ([slice,twist],move)=>{ const ns=Cube.moveTables.FRtoBR[slice*24][move]/24|0, nt=Cube.moveTables.twist[twist][move]; return nt*N_SLICE1+ns; }],
  sliceFlip:[1,N_SLICE1*N_FLIP,
    i=>[i%N_SLICE1,i/N_SLICE1|0],
    ([slice,flip],move)=>{ const ns=Cube.moveTables.FRtoBR[slice*24][move]/24|0, nf=Cube.moveTables.flip[flip][move]; return nf*N_SLICE1+ns; }],
  sliceURFtoDLFParity:[2,N_SLICE2*N_URFtoDLF*N_PARITY,
    i=>[i%2,(i/2|0)%N_SLICE2,(i/2|0)/N_SLICE2|0],
    ([parity,slice,URFtoDLF],move)=>{ const np=Cube.moveTables.parity[parity][move], ns=Cube.moveTables.FRtoBR[slice][move], nu=Cube.moveTables.URFtoDLF[URFtoDLF][move]; return (nu*N_SLICE2+ns)*2+np; }],
  sliceURtoDFParity:[2,N_SLICE2*N_URtoDF*N_PARITY,
    i=>[i%2,(i/2|0)%N_SLICE2,(i/2|0)/N_SLICE2|0],
    ([parity,slice,URtoDF],move)=>{ const np=Cube.moveTables.parity[parity][move], ns=Cube.moveTables.FRtoBR[slice][move], nu=Cube.moveTables.URtoDF[URtoDF][move]; return (nu*N_SLICE2+ns)*2+np; }],
};

Cube.computePruningTables = function(...tables) {
  if (!tables.length) tables=Object.keys(pruningTableParams);
  for (const name of tables) {
    if (this.pruningTables[name]!==null) continue;
    this.pruningTables[name]=computePruningTable(...pruningTableParams[name]);
  }
  return this;
};

Cube.initSolver = function() { Cube.computeMoveTables(); Cube.computePruningTables(); };

// ─── IDA* solver ─────────────────────────────────────────────────────────────
Cube.prototype.solveUpright = function(maxDepth=22) {
  const faceName=['U','R','F','D','L','B'];
  const powerName=['','2',"'"];
  const moveNames=[];
  for (let face=0;face<=5;face++) for (let power=0;power<=2;power++) moveNames.push(faceName[face]+powerName[power]);

  let solution=null;
  const freeStates=[];

  class State {
    constructor() { this.parent=null; this.lastMove=null; this.depth=0; }
    initFrom(cube) {
      this.flip=cube.flip(); this.twist=cube.twist();
      this.slice=cube.FRtoBR()/N_SLICE2|0;
      this.parity=cube.cornerParity(); this.URFtoDLF=cube.URFtoDLF();
      this.FRtoBR=cube.FRtoBR(); this.URtoUL=cube.URtoUL(); this.UBtoDF=cube.UBtoDF();
      return this;
    }
    solution() { return this.parent ? this.parent.solution()+moveNames[this.lastMove]+' ' : ''; }
    mv(table,index,move) { return Cube.moveTables[table][index][move]; }
    pr(table,index) { return pruning(Cube.pruningTables[table],index); }
    moves1() { return this.lastMove!==null ? nextMoves1[this.lastMove/3|0] : allMoves1; }
    minDist1() { return Math.max(this.pr('sliceFlip',N_SLICE1*this.flip+this.slice), this.pr('sliceTwist',N_SLICE1*this.twist+this.slice)); }
    next1(move) {
      const n=freeStates.pop(); n.parent=this; n.lastMove=move; n.depth=this.depth+1;
      n.flip=this.mv('flip',this.flip,move); n.twist=this.mv('twist',this.twist,move);
      n.slice=this.mv('FRtoBR',this.slice*24,move)/24|0; return n;
    }
    moves2() { return this.lastMove!==null ? nextMoves2[this.lastMove/3|0] : allMoves2; }
    minDist2() {
      return Math.max(
        this.pr('sliceURtoDFParity',(N_SLICE2*this.URtoDF+this.FRtoBR)*N_PARITY+this.parity),
        this.pr('sliceURFtoDLFParity',(N_SLICE2*this.URFtoDLF+this.FRtoBR)*N_PARITY+this.parity)
      );
    }
    init2(top=true) {
      if (this.parent===null) return;
      this.parent.init2(false);
      this.URFtoDLF=this.mv('URFtoDLF',this.parent.URFtoDLF,this.lastMove);
      this.FRtoBR=this.mv('FRtoBR',this.parent.FRtoBR,this.lastMove);
      this.parity=this.mv('parity',this.parent.parity,this.lastMove);
      this.URtoUL=this.mv('URtoUL',this.parent.URtoUL,this.lastMove);
      this.UBtoDF=this.mv('UBtoDF',this.parent.UBtoDF,this.lastMove);
      if (top) this.URtoDF=this.mv('mergeURtoDF',this.URtoUL,this.UBtoDF);
    }
    next2(move) {
      const n=freeStates.pop(); n.parent=this; n.lastMove=move; n.depth=this.depth+1;
      n.URFtoDLF=this.mv('URFtoDLF',this.URFtoDLF,move); n.FRtoBR=this.mv('FRtoBR',this.FRtoBR,move);
      n.parity=this.mv('parity',this.parity,move); n.URtoDF=this.mv('URtoDF',this.URtoDF,move);
      return n;
    }
  }

  for (let x=0;x<=maxDepth+1;x++) freeStates.push(new State);

  function phase1(state,depth) {
    if (depth===0) {
      if (state.minDist1()===0) {
        if (state.lastMove===null||!allMoves2.includes(state.lastMove)) phase2search(state);
      }
    } else if (state.minDist1()<=depth) {
      for (const move of state.moves1()) {
        const next=state.next1(move); phase1(next,depth-1); freeStates.push(next);
        if (solution!==null) return;
      }
    }
  }
  function phase2search(state) {
    state.init2();
    for (let depth=1;depth<=maxDepth-state.depth;depth++) {
      phase2(state,depth); if (solution!==null) return;
    }
  }
  function phase2(state,depth) {
    if (depth===0) { if (state.minDist2()===0) { solution=state.solution(); } }
    else if (state.minDist2()<=depth) {
      for (const move of state.moves2()) {
        const next=state.next2(move); phase2(next,depth-1); freeStates.push(next);
        if (solution!==null) return;
      }
    }
  }

  const root=freeStates.pop().initFrom(this);
  for (let depth=1;depth<=maxDepth;depth++) { phase1(root,depth); if (solution!==null) break; }
  freeStates.push(root);
  return solution ? solution.trimEnd() : '';
};

const solveFaceNums={U:0,R:1,F:2,D:3,L:4,B:5};
const solveFaceNames={0:'U',1:'R',2:'F',3:'D',4:'L',5:'B'};

Cube.prototype.solve = function(maxDepth=22) {
  const clone=this.clone(), upright=clone.upright();
  clone.move(upright);
  const rotation=new Cube().move(upright).center;
  const uprightSol=clone.solveUpright(maxDepth);
  return uprightSol.split(' ').filter(Boolean).map(move=>{
    return solveFaceNames[rotation[solveFaceNums[move[0]]]]+(move.length>1?move[1]:'');
  }).join(' ');
};

// ─── App interface ───────────────────────────────────────────────────────────
const COLOR_MAP={Y:'U',R:'R',B:'F',W:'D',O:'L',G:'B'};

function cubeToFacelets(cube) {
  return ['U','R','F','D','L','B'].flatMap(f=>cube[f]).map(c=>COLOR_MAP[c]).join('');
}

export function cubeToKociemba(cube) { return cubeToFacelets(cube); }

export function initKociemba(setStatus) {
  setStatus('initializing');
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      try { Cube.initSolver(); setStatus('ready'); resolve(); }
      catch(err) { setStatus('error'); reject(err); }
    }, 0);
  });
}

export function solveKociemba(cube) {
  return new Promise((resolve,reject) => {
    try {
      const c=Cube.fromString(cubeToFacelets(cube));
      resolve(c.isSolved() ? '' : c.solve());
    } catch(err) { reject(err); }
  });
}

export function terminateKociemba() {}
