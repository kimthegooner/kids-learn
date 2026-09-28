const test = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./load-ts.cjs');
const camera = loader()('lib/camera.ts');

test('camera anchors follow position, scale, tilt, and mirror consistently', () => {
  const sample = camera.demoFrame(0);
  const original = camera.faceAnchor(sample.face, 720, 600, false);
  const mirrored = camera.faceAnchor(sample.face, 720, 600, true);
  assert.ok(Math.abs(original.width - mirrored.width) < 1e-8);
  assert.ok(Math.abs(original.eyes.x + mirrored.eyes.x - 720) < 1e-8);
  assert.ok(Math.abs(original.angle + mirrored.angle) < 1e-8);
  const larger = camera.faceAnchor(sample.face, 1440, 1200, false);
  assert.equal(larger.width, original.width * 2);
  const shifted = sample.pose.map(p => ({ ...p, x: p.x + .1 }));
  const before = camera.bodyAnchor(sample.pose, 720, 600, false);
  const after = camera.bodyAnchor(shifted, 720, 600, false);
  assert.ok(Math.abs(after.center.x - before.center.x - 72) < 1e-8);
  assert.ok(Math.abs(after.width - before.width) < 1e-8);
});

test('missing and unreliable tracking never attaches clothing to invented anchors', () => {
  assert.equal(camera.faceAnchor([], 720, 600), null);
  assert.equal(camera.bodyAnchor([], 720, 600), null);
  const { pose, face } = camera.demoFrame(0);
  pose[11].visibility = .2;
  assert.equal(camera.bodyAnchor(pose, 720, 600), null);
  pose[11].visibility = 1; pose[23].visibility = .1; pose[24].visibility = .1;
  assert.ok(Number.isFinite(camera.bodyAnchor(pose, 720, 600).height));
  face[33].x = NaN;
  assert.equal(camera.faceAnchor(face, 720, 600), null);
});

test('all three face accessories accept real MediaPipe landmarks with unset visibility = 0', () => {
  const draw = loader()('lib/camera-draw.ts');
  const sample = camera.demoFrame(0);
  sample.face = sample.face.map(p => ({ ...p, visibility: 0 }));
  assert.ok(camera.faceAnchor(sample.face, 720, 600));
  let painted = 0;
  const context = new Proxy({}, { get: (_, name) => String(name).includes('Gradient') ? () => ({ addColorStop() {} }) : () => { if (name === 'fill') painted++; }, set: () => true });
  for (const filter of ['crown', 'bunny', 'glasses']) {
    assert.equal(draw.drawFilter(context, sample, filter, 720, 600), true, filter);
  }
  assert.ok(painted >= 3);
  const previous = [{ x: .1, y: .3, visibility: 0 }];
  const smoothed = camera.smoothLandmarks(previous, [{ x: .2, y: .4, visibility: 0 }], .65, false);
  assert.ok(smoothed[0].x > .1 && smoothed[0].x < .2);
  assert.equal(camera.faceAnchor([], 720, 600), null);
});

test('adaptive tracking follows quickly without overshoot and clears on loss', () => {
  const target=[{x:.4,y:.3,visibility:0}];
  let rendered=[{x:.3,y:.3,visibility:0}];
  for(let i=0;i<8;i++) {
    const before=rendered[0].x;
    rendered=camera.followLandmarks(rendered,target,16,false);
    assert.ok(rendered[0].x>before && rendered[0].x<.4);
  }
  assert.ok(rendered[0].x>.38);
  assert.equal(camera.followLandmarks(rendered,[],16,false).length,0);
  assert.equal(camera.followLandmarks(rendered,[{x:.9,y:.3,visibility:0}],16,false)[0].x,.9);
});

test('landmark smoothing drops lost tracks and resets across large movements', () => {
  const previous = [{ x: .1, y: .3, visibility: 1 }];
  const result = camera.smoothLandmarks(previous, [{ x: .2, y: .4, visibility: 1 }]);
  assert.ok(result[0].x > .1 && result[0].x < .2);
  assert.equal(camera.smoothLandmarks(previous, []).length, 0);
  assert.equal(camera.smoothLandmarks(previous, [{ x: .9, y: .4, visibility: 1 }])[0].x, .9);
});

test('camera cleanup stops every track and explains permission or device failures', () => {
  let stopped = 0;
  camera.stopStream({ getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] });
  camera.stopStream(null);
  assert.equal(stopped, 2);
  assert.match(camera.cameraError({ name: 'NotAllowedError' }), /권한/);
  assert.match(camera.cameraError({ name: 'NotFoundError' }), /카메라/);
  assert.match(camera.cameraError({ name: 'NotReadableError' }), /다른 앱/);
});

test('all eight dress-up effects have the correct tracking model and local assets', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  assert.equal(camera.CAMERA_FILTERS.length, 8);
  for (const filter of camera.CAMERA_FILTERS) {
    assert.equal(camera.filterMode(filter.id), filter.mode);
    const png=fs.readFileSync(path.join(__dirname, '../public/camera/artwork', `${filter.id}-v2.png`));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png[25],6,`${filter.id}: preserve RGBA transparency`);
  }
  for (const file of ['tracker.js', 'mediapipe/vision_bundle.js', 'mediapipe/wasm/vision_wasm_internal.wasm', 'mediapipe/wasm/vision_wasm_nosimd_internal.wasm', 'models/face_landmarker.task', 'models/pose_landmarker_lite.task']) {
    assert.ok(fs.statSync(path.join(__dirname, '../public/camera', file)).size > 1000, file);
  }
});

test('character hoods accept face tracking; princess capture needs both head and body', () => {
  const draw=loader()('lib/camera-draw.ts');
  const frame=camera.demoFrame(0);
  frame.face=frame.face.map(p=>({...p,visibility:0}));
  let images=0;
  const ctx=new Proxy({}, {get:(_,name)=>String(name).includes('Gradient')?()=>({addColorStop(){}}):()=>{if(name==='drawImage')images++;},set:()=>true});
  const sprite={image:{naturalHeight:1000},x:0,y:0,width:600,height:900};
  const artwork={dinosaur:sprite,robot:sprite,princess:sprite,crown:sprite};
  for(const id of ['dinosaur','robot']) {
    assert.equal(draw.drawFilter(ctx,{face:frame.face,pose:[]},id,720,600,true,false,0,{artwork}),true);
    assert.equal(draw.drawFilter(ctx,{face:[],pose:frame.pose},id,720,600,true,false,0,{artwork}),false);
  }
  assert.equal(draw.drawFilter(ctx,frame,'princess',720,600,true,false,0,{artwork}),true);
  assert.equal(draw.drawFilter(ctx,{face:frame.face,pose:[]},'princess',720,600,true,false,0,{artwork}),false);
  assert.equal(draw.drawFilter(ctx,{face:[],pose:frame.pose},'princess',720,600,true,false,0,{artwork}),false);
  assert.ok(images>=5);
  assert.equal(camera.filterMode('princess'),'costume');
  assert.match(camera.trackingHint('princess',false),/얼굴과 어깨/);
});
