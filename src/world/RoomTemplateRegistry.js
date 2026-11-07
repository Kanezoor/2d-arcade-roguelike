import RoomTemplate from "./RoomTemplate.js";
const templates=new Map();
function register(template) { const value=template instanceof RoomTemplate?template:new RoomTemplate(template); if(templates.has(value.id)) throw new Error(`Room template "${value.id}" is already registered.`); templates.set(value.id,value); return value; }
[
 {id:"square",shape:"square",description:"Centered square.",outlineGenerator:({width,height})=>{const s=Math.min(width,height),x=(width-s)/2,y=(height-s)/2;return [{x,y},{x:x+s,y},{x:x+s,y:y+s},{x,y:y+s}];}},
 {id:"rectangle",shape:"rectangle",description:"Axis-aligned rectangle.",outlineGenerator:({width,height})=>[{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}]},
 {id:"diamond",shape:"diamond",portStrategy:"corner-vestibule",description:"Four diagonal sides.",outlineGenerator:({width,height})=>[{x:width/2,y:0},{x:width,y:height/2},{x:width/2,y:height},{x:0,y:height/2}]},
 {id:"circle",shape:"circle",wallMode:"circle",description:"Segmented circle.",outlineGenerator:({width,height,segments})=>{const r=Math.min(width,height)/2,cx=width/2,cy=height/2,n=Math.max(12,segments);return Array.from({length:n},(_,i)=>{const a=Math.PI*2*i/n;return{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};});}},
 {id:"octagon",shape:"octagon",description:"Eight-sided clipped rectangle.",outlineGenerator:({width,height})=>{const c=Math.min(width,height)*.22;return [{x:c,y:0},{x:width-c,y:0},{x:width,y:c},{x:width,y:height-c},{x:width-c,y:height},{x:c,y:height},{x:0,y:height-c},{x:0,y:c}];}},
].forEach(register);
export function getRoomTemplate(id){const t=templates.get(id);if(!t)throw new Error(`Unknown room template "${id}".`);return t;}
export function hasRoomTemplate(id){return templates.has(id);}
export function listRoomTemplates(){return [...templates.values()];}
export function registerRoomTemplate(template){return register(template);}
export function getRoomTemplateOutline(id,dimensions,segments=64){return getRoomTemplate(id).getOutline({...dimensions,segments});}
