import { PAL, NAMES } from './cube.js';

export function validateCube(cube) {
  const errors=[];
  const counts={}; PAL.forEach(p=>counts[p]=0);
  Object.values(cube).flat().forEach(s=>{if(counts[s]!==undefined)counts[s]++;});
  PAL.forEach(col=>{if(counts[col]!==9)errors.push(`${NAMES[col]}: ${counts[col]}/9 stickers`);});
  const centers=Object.values(cube).map(f=>f[4]);
  if(new Set(centers).size<6) errors.push("Two faces share the same center color");
  return errors;
}
