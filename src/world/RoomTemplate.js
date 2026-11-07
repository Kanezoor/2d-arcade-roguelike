/** Immutable geometry-only room template. */
export default class RoomTemplate {
  constructor({ id, shape = id, outlineGenerator, wallMode = "polygon", portStrategy = "boundary", description = "" } = {}) {
    if (typeof id !== "string" || !id.trim()) throw new TypeError("RoomTemplate requires a non-empty id.");
    if (typeof outlineGenerator !== "function") throw new TypeError(`RoomTemplate "${id}" requires an outlineGenerator.`);
    if (!["polygon", "circle"].includes(wallMode)) throw new TypeError(`Unsupported wallMode "${wallMode}".`);
    if (!["boundary", "corner-vestibule"].includes(portStrategy)) throw new TypeError(`Unsupported portStrategy "${portStrategy}" for template "${id}".`);
    this.id=id; this.shape=shape; this.wallMode=wallMode; this.portStrategy=portStrategy; this.description=description; this._outlineGenerator=outlineGenerator;
    Object.freeze(this);
  }
  getOutline({width,height,segments=64}) {
    if (!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0) throw new TypeError(`Template "${this.id}" requires positive dimensions.`);
    const points=this._outlineGenerator({width,height,segments});
    if (!Array.isArray(points)||points.length<3||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) throw new Error(`Template "${this.id}" generated an invalid outline.`);
    return points.map(p=>({x:p.x,y:p.y}));
  }
}
