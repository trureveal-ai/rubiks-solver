import { PAL, NAMES } from './cube.js';

export function validateCube(cube) {
  const errors=[];
  const counts={}; PAL.forEach(p=>counts[p]=0);
  Object.values(cube).flat().forEach(s=>{if(counts[s]!==undefined)counts[s]++;});
  PAL.forEach(col=>{if(counts[col]!==9)errors.push(`${NAMES[col]}: ${counts[col]}/9 stickers`);});
  const centers=Object.values(cube).map(f=>f[4]);
  if(new Set(centers).size<6) errors.push("Two faces share the same center color");
  const EDGE_PAIRS=[[['U',7],['F',1]],[['U',5],['R',1]],[['U',1],['B',1]],[['U',3],['L',1]],[['D',1],['F',7]],[['D',5],['R',7]],[['D',7],['B',7]],[['D',3],['L',7]],[['F',5],['R',3]],[['F',3],['L',5]],[['B',3],['R',5]],[['B',5],['L',3]]];
  EDGE_PAIRS.forEach(([[f1,i1],[f2,i2]])=>{if(cube[f1][i1]===cube[f2][i2])errors.push(`Illegal edge: ${f1}+${f2}`);});
  return errors;
}
