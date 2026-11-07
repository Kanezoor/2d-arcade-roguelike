import assert from "node:assert/strict";
import RoomDefinition from "../world/RoomDefinition.js";
import {getRoomTemplateOutline,listRoomTemplates,registerRoomTemplate,getRoomTemplate} from "../world/RoomTemplateRegistry.js";
import {getRoomOutlinePoints,isPointInsideRoom} from "../world/RoomGeometry.js";
for(const id of ["square","rectangle","diamond","circle","octagon"]) assert.ok(listRoomTemplates().some(t=>t.id===id));
assert.deepEqual(getRoomTemplateOutline("rectangle",{width:800,height:600}),[{x:0,y:0},{x:800,y:0},{x:800,y:600},{x:0,y:600}]);
assert.deepEqual(getRoomTemplateOutline("diamond",{width:800,height:600}),[{x:400,y:0},{x:800,y:300},{x:400,y:600},{x:0,y:300}]);
assert.equal(getRoomTemplateOutline("octagon",{width:800,height:600}).length,8);
assert.equal(getRoomTemplateOutline("circle",{width:800,height:600},32).length,32);
const room=new RoomDefinition({id:"template-room",gridPosition:{x:0,y:0},shape:"octagon",width:800,height:600});
assert.equal(room.templateId,"octagon"); assert.equal(room.toJSON().templateId,"octagon"); assert.equal(getRoomOutlinePoints(room).length,8);
assert.equal(isPointInsideRoom(room,400,300),true); assert.equal(isPointInsideRoom(room,5,5),false);
registerRoomTemplate({id:"test-hexagon",shape:"hexagon",outlineGenerator:({width,height})=>[{x:width*.25,y:0},{x:width*.75,y:0},{x:width,y:height/2},{x:width*.75,y:height},{x:width*.25,y:height},{x:0,y:height/2}]});
const custom=new RoomDefinition({id:"custom",gridPosition:{x:0,y:0},templateId:"test-hexagon"});
assert.equal(getRoomTemplate(custom.templateId).shape,"hexagon"); assert.equal(getRoomOutlinePoints(custom).length,6);
assert.throws(()=>getRoomTemplate("missing"),/Unknown room template/);
console.log("room-templates.test.js passed");

// Cardinal ports are projected onto the actual template boundary, not the
// rectangular bounding box. This is essential for diamond/octagon/circle rooms.
import { deriveRoomPortAnchor, resolveRoomPortFrame } from "../world/RoomEntranceGeometry.js";
for (const shape of ["square", "rectangle", "diamond", "circle", "octagon"]) {
  const portRoom = { width: 800, height: 600, shape, templateId: shape };
  for (const direction of ["north", "east", "south", "west"]) {
    const derived = deriveRoomPortAnchor(portRoom, direction);
    const frame = resolveRoomPortFrame(portRoom, { id: `${shape}-${direction}`, direction });
    assert.ok(Number.isFinite(derived.anchor.x) && Number.isFinite(derived.anchor.y));
    assert.ok(Math.abs(Math.hypot(frame.normal.x, frame.normal.y) - 1) < 1e-8);
    assert.ok(Math.abs(frame.anchor.x - derived.anchor.x) < 1e-8);
    assert.ok(Math.abs(frame.anchor.y - derived.anchor.y) < 1e-8);
    // Outward normal must point generally toward the requested cardinal side.
    const cardinal = {north:{x:0,y:-1},east:{x:1,y:0},south:{x:0,y:1},west:{x:-1,y:0}}[direction];
    assert.ok(frame.normal.x * cardinal.x + frame.normal.y * cardinal.y > 0.4);
  }
}

const diamondPort = resolveRoomPortFrame(
  { width: 800, height: 600, shape: "diamond", templateId: "diamond" },
  { id: "diamond-east", direction: "east" }
);
assert.ok(diamondPort.anchor.x > 790);
assert.ok(Math.abs(diamondPort.anchor.y - 300) < 1e-8);
console.log("room template port derivation passed");
