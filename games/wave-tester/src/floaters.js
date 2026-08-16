import * as THREE from "three";
import { GRAVITY } from "./waves.js";

const UP = new THREE.Vector3(0, 1, 0);
const _sample = { height: 0, normal: new THREE.Vector3(), fold: 0 };
const _wakeSample = { height: 0, normal: new THREE.Vector3() };
const _quat = new THREE.Quaternion();

function sampleSurface(waveField, ocean, x, z, time, includeWake = true) {
  waveField.surfaceAt(x, z, time, _sample);
  if (!includeWake || !ocean) return _sample;

  ocean.sampleWake(x, z, time, _wakeSample);
  _sample.height += _wakeSample.height;
  _sample.normal
    .add(_wakeSample.normal)
    .sub(UP)
    .normalize();
  return _sample;
}

/**
 * Anything that rides the surface. Sampling several points across the hull
 * instead of one gives real pitch and roll, which is what makes a wave look
 * the right size when you watch a boat move through it.
 *
 * When the hull is driven hard up a steep face, vertical momentum can carry it
 * clear of the water — then gravity takes over until it lands again.
 */
class Floater {
  constructor(object, { length = 1, width = 1, waterline = 0, response = 6, canJump = false } = {}) {
    this.object = object;
    this.length = length;
    this.width = width;
    this.waterline = waterline;
    this.response = response;
    this.canJump = canJump;
    this.heading = object.rotation.y;
    object.rotation.order = "YXZ";

    this.target = { y: 0, pitch: 0, roll: 0 };
    this.current = { y: 0, pitch: 0, roll: 0 };
    this.angularVelocity = { pitch: 0, roll: 0 };
    this.verticalVelocity = 0;
    this.airborne = false;
    this.prevSurfaceY = null;
    this.airTime = 0;
    this.landedImpact = 0;
  }

  sampleAt(waveField, ocean, localX, localZ, time) {
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    const worldX = this.object.position.x + localX * cos + localZ * sin;
    const worldZ = this.object.position.z - localX * sin + localZ * cos;
    // A vessel does not react to the wake it is creating underneath itself.
    return sampleSurface(waveField, ocean, worldX, worldZ, time, false).height;
  }

  update(waveField, ocean, time, delta, planarSpeed = 0, jumpPressed = false) {
    this.landedImpact = 0;
    const halfL = this.length * 0.5;
    const halfW = this.width * 0.5;

    const bow = this.sampleAt(waveField, ocean, halfL, 0, time);
    const stern = this.sampleAt(waveField, ocean, -halfL, 0, time);
    const port = this.sampleAt(waveField, ocean, 0, -halfW, time);
    const starboard = this.sampleAt(waveField, ocean, 0, halfW, time);

    const average = (bow + stern + port + starboard) * 0.25;
    // Climbing: bias toward the bow so the hull rides up the face instead of
    // cutting through the slope between sample points.
    const climbBias = THREE.MathUtils.clamp((bow - stern) / Math.max(this.length, 0.1), 0, 1);
    const rideHeight = THREE.MathUtils.lerp(average, Math.max(average, bow), climbBias);

    this.target.y = rideHeight + this.waterline;
    this.target.pitch = Math.atan2(bow - stern, this.length);
    this.target.roll = Math.atan2(port - starboard, this.width);

    const surfaceY = this.target.y;
    const surfaceVy =
      this.prevSurfaceY == null ? 0 : (surfaceY - this.prevSurfaceY) / Math.max(delta, 1e-4);
    this.prevSurfaceY = surfaceY;

    const faceSlope = THREE.MathUtils.clamp(this.target.pitch, -1.4, 1.4);
    const climb = Math.max(0, faceSlope);
    const speed = Math.max(0, planarSpeed);
    const climbLift = climb * speed * 0.55 + Math.max(0, surfaceVy) * 0.25;

    if (this.canJump) {
      if (!this.airborne) {
        // Stick fast when the face rises under you so you cannot tunnel in.
        const rising = Math.max(0, surfaceVy);
        const stickRate = 12 + rising * 3.5 + climb * 10;
        const stick = 1 - Math.exp(-stickRate * delta);
        this.verticalVelocity += (surfaceVy + climbLift - this.verticalVelocity) * stick;
        this.current.y += (surfaceY - this.current.y) * stick;

        // Hard deck: never go under the water while riding.
        if (this.current.y < surfaceY) {
          this.current.y = surfaceY;
          this.verticalVelocity = Math.max(this.verticalVelocity, surfaceVy);
        }

        const clearance = this.current.y - surfaceY;
        const steepFace = climb > 0.18;
        const fastEnough = speed > 8;

        if (jumpPressed && speed > 4) {
          this.airborne = true;
          this.airTime = 0;
          this.verticalVelocity = Math.max(
            4.2,
            climbLift + speed * 0.28 + Math.max(0, surfaceVy) * 0.35
          );
          this.current.y = surfaceY + 0.35;
        } else {
          const launching =
            fastEnough &&
            steepFace &&
            this.verticalVelocity > surfaceVy + 1.4 &&
            clearance > 0.12;

          const crestDrop =
            speed > 7 &&
            steepFace &&
            surfaceVy < -1.2 &&
            this.verticalVelocity > 1.0;

          if (launching || crestDrop) {
            this.airborne = true;
            this.airTime = 0;
            const kick =
              climbLift * 0.9 +
              Math.max(0, -surfaceVy) * 0.55 +
              speed * climb * 0.55 +
              1.2;
            this.verticalVelocity = Math.min(12, Math.max(this.verticalVelocity, kick));
            this.current.y = Math.max(this.current.y, surfaceY + 0.25);
          } else if (this.current.y > surfaceY + 0.08 && climb < 0.08) {
            // Bleed loft only on flat water — keep height while climbing.
            this.current.y += (surfaceY - this.current.y) * Math.min(1, delta * 4);
            if (this.current.y < surfaceY) this.current.y = surfaceY;
          }
        }
      } else {
        this.airTime += delta;
        this.verticalVelocity -= GRAVITY * delta;
        this.current.y += this.verticalVelocity * delta;

        this.target.pitch = THREE.MathUtils.clamp(
          this.target.pitch * 0.35 + this.verticalVelocity * 0.02,
          -0.9,
          0.7
        );

        if (this.current.y <= surfaceY && this.airTime > 0.12) {
          const impact = Math.max(0, surfaceVy - this.verticalVelocity);
          this.airborne = false;
          this.landedImpact = impact;
          // Land on top — no burying under the surface.
          this.current.y = surfaceY;
          this.verticalVelocity = Math.max(surfaceVy * 0.35 - impact * 0.08, surfaceVy);
          this.angularVelocity.pitch -= impact * 0.03;
        }
      }
    } else {
      const blend = 1 - Math.exp(-this.response * delta);
      this.current.y += (surfaceY - this.current.y) * blend;
      if (this.current.y < surfaceY) this.current.y = surfaceY;
    }

    const pitchStiffness = this.airborne ? 3.2 : 14;
    const rollStiffness = this.airborne ? 2.4 : 9;
    const pitchDamping = this.airborne ? 1.4 : 5.5;
    const rollDamping = this.airborne ? 1.1 : 3.5;

    const pitchAcceleration =
      (this.target.pitch - this.current.pitch) * pitchStiffness -
      this.angularVelocity.pitch * pitchDamping;
    const rollAcceleration =
      (this.target.roll - this.current.roll) * rollStiffness -
      this.angularVelocity.roll * rollDamping;
    this.angularVelocity.pitch += pitchAcceleration * delta;
    this.angularVelocity.roll += rollAcceleration * delta;
    this.current.pitch += this.angularVelocity.pitch * delta;
    this.current.roll += this.angularVelocity.roll * delta;

    if (!this.airborne && this.current.y < surfaceY) {
      this.current.y = surfaceY;
    }

    this.object.position.y = this.current.y;
    this.object.rotation.set(this.current.roll, this.heading, this.current.pitch);
  }
}

/** A single-point floater that simply aligns itself to the surface normal. */
class PointFloater {
  constructor(object, { waterline = 0, response = 5, tilt = 0.85, radius = 1, drift = 0.6 } = {}) {
    this.object = object;
    this.waterline = waterline;
    this.response = response;
    this.tilt = tilt;
    this.radius = radius;
    this.drift = drift;
    this.currentY = 0;
    this.velocity = new THREE.Vector2();
  }

  update(waveField, ocean, time, delta) {
    const { x, z } = this.object.position;
    sampleSurface(waveField, ocean, x, z, time, true);

    const blend = 1 - Math.exp(-this.response * delta);
    this.currentY += (_sample.height + this.waterline - this.currentY) * blend;
    this.object.position.y = this.currentY;

    // Gravity pulls the object down the local wave slope. A small wind term
    // and quadratic water drag produce believable drift without runaway speed.
    const windAngle = THREE.MathUtils.degToRad(waveField.params.windDirection);
    const windForce = waveField.params.windSpeed * 0.003 * this.drift;
    this.velocity.x +=
      (_sample.normal.x * 2.4 * this.drift + Math.cos(windAngle) * windForce) *
      delta;
    this.velocity.y +=
      (_sample.normal.z * 2.4 * this.drift + Math.sin(windAngle) * windForce) *
      delta;
    const speed = this.velocity.length();
    const drag = Math.exp(-(0.34 + speed * 0.12) * delta);
    this.velocity.multiplyScalar(drag);
    this.object.position.x += this.velocity.x * delta;
    this.object.position.z += this.velocity.y * delta;

    _quat.setFromUnitVectors(UP, _sample.normal);
    this.object.quaternion.slerp(_quat, blend * this.tilt);
  }
}

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.05, ...options });
}

function buildJetSki() {
  const group = new THREE.Group();
  const length = 3.4;
  const width = 1.15;
  const depth = 0.55;

  // Pointed sport hull, bow at +X.
  const outline = new THREE.Shape();
  outline.moveTo(-length * 0.48, -width * 0.42);
  outline.lineTo(length * 0.18, -width * 0.48);
  outline.quadraticCurveTo(length * 0.42, -width * 0.28, length * 0.52, 0);
  outline.quadraticCurveTo(length * 0.42, width * 0.28, length * 0.18, width * 0.48);
  outline.lineTo(-length * 0.48, width * 0.42);
  outline.quadraticCurveTo(-length * 0.52, 0, -length * 0.48, -width * 0.42);

  const hullGeo = new THREE.ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.1,
    bevelSegments: 2,
    curveSegments: 14,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.translate(0, depth * 0.55, 0);
  hullGeo.computeVertexNormals();

  const bodyColor = 0x1ec8ff;
  const accent = 0xff3b5c;
  const dark = 0x12171c;

  const hull = new THREE.Mesh(hullGeo, standard(bodyColor, { roughness: 0.28, metalness: 0.15 }));
  group.add(hull);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.92, 0.12, width * 0.98),
    standard(accent, { roughness: 0.4 })
  );
  stripe.position.set(0.05, depth * 0.55 + 0.02, 0);
  group.add(stripe);

  // Front cowling / nose.
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.42, width * 0.72),
    standard(bodyColor, { roughness: 0.25, metalness: 0.18 })
  );
  nose.position.set(length * 0.22, depth * 0.55 + 0.28, 0);
  nose.rotation.z = -0.18;
  group.add(nose);

  const windscreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.38, width * 0.55),
    standard(0xa8e8ff, { roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.55 })
  );
  windscreen.position.set(length * 0.08, depth * 0.55 + 0.55, 0);
  windscreen.rotation.z = -0.35;
  group.add(windscreen);

  // Seat / saddle.
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.28, width * 0.48),
    standard(dark, { roughness: 0.85 })
  );
  seat.position.set(-0.35, depth * 0.55 + 0.32, 0);
  group.add(seat);

  const seatBump = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.34, width * 0.42),
    standard(dark, { roughness: 0.85 })
  );
  seatBump.position.set(-0.95, depth * 0.55 + 0.42, 0);
  group.add(seatBump);

  // Handlebars.
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, width * 0.7, 8),
    standard(0xd0d5db, { roughness: 0.3, metalness: 0.65 })
  );
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0.35, depth * 0.55 + 0.72, 0);
  group.add(bar);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.42, 8),
    standard(0xd0d5db, { roughness: 0.3, metalness: 0.65 })
  );
  stem.position.set(0.35, depth * 0.55 + 0.52, 0);
  group.add(stem);

  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.18, 8),
      standard(dark, { roughness: 0.9 })
    );
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0.35, depth * 0.55 + 0.72, side * width * 0.32);
    group.add(grip);

    const mirror = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      standard(0xe8eef4, { roughness: 0.15, metalness: 0.5 })
    );
    mirror.position.set(0.42, depth * 0.55 + 0.82, side * width * 0.38);
    group.add(mirror);
  }

  // Jet nozzle / pump at the stern.
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.35, 10),
    standard(0x2a3038, { roughness: 0.4, metalness: 0.5 })
  );
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-length * 0.48, depth * 0.2, 0);
  group.add(nozzle);

  const intake = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.12, width * 0.55),
    standard(0x0b0e12, { roughness: 0.7 })
  );
  intake.position.set(-0.1, 0.08, 0);
  group.add(intake);

  // Rider-scale hint: small front pad.
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.06, width * 0.4),
    standard(0x22282f, { roughness: 0.9 })
  );
  pad.position.set(0.75, depth * 0.55 + 0.12, 0);
  group.add(pad);

  return {
    group,
    length,
    width,
    waterline: depth * 0.28,
    sternOffset: length * 0.45,
    cameraSeat: { x: -0.15, y: 1.15, z: 0 },
    cameraLook: { x: 18, y: 0.6, z: 0 },
  };
}

function buildNpcBoat(hullColor = 0xf4f7fb, accentColor = 0x2b6cb0) {
  const group = new THREE.Group();
  const length = 7.2;
  const width = 2.4;
  const depth = 1.15;

  const outline = new THREE.Shape();
  outline.moveTo(-length * 0.48, -width * 0.45);
  outline.lineTo(length * 0.22, -width * 0.48);
  outline.quadraticCurveTo(length * 0.48, -width * 0.28, length * 0.52, 0);
  outline.quadraticCurveTo(length * 0.48, width * 0.28, length * 0.22, width * 0.48);
  outline.lineTo(-length * 0.48, width * 0.45);
  outline.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.18,
    bevelThickness: 0.2,
    bevelSegments: 2,
    curveSegments: 12,
  });
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.translate(0, depth * 0.45, 0);
  hullGeo.computeVertexNormals();

  group.add(new THREE.Mesh(hullGeo, standard(hullColor, { roughness: 0.4 })));

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.9, 0.2, width * 1.02),
    standard(accentColor, { roughness: 0.45 })
  );
  stripe.position.y = depth * 0.35;
  group.add(stripe);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(length * 0.78, 0.12, width * 0.78),
    standard(0xc4a574, { roughness: 0.8 })
  );
  deck.position.y = depth * 0.55 + 0.08;
  group.add(deck);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.05, width * 0.62),
    standard(0xeef2f6, { roughness: 0.35 })
  );
  cabin.position.set(-0.6, depth * 0.55 + 0.7, 0);
  group.add(cabin);

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.14, 0.4, width * 0.64),
    standard(0x16303f, { roughness: 0.1, metalness: 0.45 })
  );
  glass.position.set(-0.6, depth * 0.55 + 0.85, 0);
  group.add(glass);

  return {
    group,
    length,
    width,
    waterline: depth * 0.2,
    radius: length * 0.38,
  };
}

/** Patrol boat that circles a route and rides the surface. */
class NpcBoat {
  constructor(scene, { x, z, hullColor, accentColor, speed, radius, centerX, centerZ, phase }) {
    const craft = buildNpcBoat(hullColor, accentColor);
    craft.group.position.set(x, 0, z);
    scene.add(craft.group);

    this.object = craft.group;
    this.floater = new Floater(craft.group, {
      length: craft.length,
      width: craft.width,
      waterline: craft.waterline,
      response: 8,
      canJump: false,
    });
    this.floater.heading = Math.random() * Math.PI * 2;
    this.velocity = new THREE.Vector2(
      Math.cos(this.floater.heading) * speed * 0.4,
      -Math.sin(this.floater.heading) * speed * 0.4
    );
    this.radius = craft.radius;
    this.targetSpeed = speed;
    this.enginePower = 4.2 + Math.random() * 2.2;
    this.path = { centerX, centerZ, radius, phase };
    this.visible = true;
  }

  update(waveField, ocean, time, delta) {
    if (!this.visible) return;

    const path = this.path;
    const radialX = this.object.position.x - path.centerX;
    const radialZ = this.object.position.z - path.centerZ;
    const radialLength = Math.max(0.001, Math.hypot(radialX, radialZ));
    const nx = radialX / radialLength;
    const nz = radialZ / radialLength;
    const radialError = radialLength - path.radius;

    let desiredX = -nz - nx * radialError * 0.045;
    let desiredZ = nx - nz * radialError * 0.045;

    waveField.surfaceAt(this.object.position.x, this.object.position.z, time, _sample);
    desiredX += _sample.normal.x * 0.35;
    desiredZ += _sample.normal.z * 0.35;
    let speedMul = _sample.fold > 0.55 ? 0.82 : 1;

    if (waveField.params.tsunami) {
      const pulse = waveField.tsunamiAt(
        this.object.position.x,
        this.object.position.z,
        time
      );
      const threat = pulse.height / Math.max(1, waveField.params.tsunamiAmplitude);
      if (threat > 0.25) {
        desiredX = -waveField.tsunamiDir.y;
        desiredZ = waveField.tsunamiDir.x;
        speedMul = 1.35;
      }
    }

    const len = Math.hypot(desiredX, desiredZ) || 1;
    desiredX /= len;
    desiredZ /= len;

    const desiredHeading = Math.atan2(-desiredZ, desiredX);
    let headingError = desiredHeading - this.floater.heading;
    headingError = Math.atan2(Math.sin(headingError), Math.cos(headingError));
    const steer = THREE.MathUtils.clamp(-headingError * 2.1, -1, 1);

    const heading = this.floater.heading;
    const forwardX = Math.cos(heading);
    const forwardZ = -Math.sin(heading);
    const sideX = -forwardZ;
    const sideZ = forwardX;
    const forwardSpeed =
      this.velocity.x * forwardX + this.velocity.y * forwardZ;
    const lateralSpeed = this.velocity.x * sideX + this.velocity.y * sideZ;
    const wantSpeed = this.targetSpeed * speedMul;
    const throttle = THREE.MathUtils.clamp((wantSpeed - forwardSpeed) * 0.55, -0.25, 1);

    this.velocity.x += forwardX * throttle * this.enginePower * delta;
    this.velocity.y += forwardZ * throttle * this.enginePower * delta;

    const speed = this.velocity.length();
    this.velocity.multiplyScalar(Math.exp(-(0.025 + speed * 0.008) * delta));
    this.velocity.x -= sideX * lateralSpeed * Math.min(1, delta * 1.8);
    this.velocity.y -= sideZ * lateralSpeed * Math.min(1, delta * 1.8);

    this.velocity.x += _sample.normal.x * 0.5 * delta;
    this.velocity.y += _sample.normal.z * 0.5 * delta;

    const steeringAuthority =
      (0.18 + Math.min(Math.abs(forwardSpeed), 14) * 0.06) *
      THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 0.5, 0, 1);
    this.floater.heading -= steer * steeringAuthority * delta;

    this.object.position.x += this.velocity.x * delta;
    this.object.position.z += this.velocity.y * delta;

    this.floater.update(waveField, ocean, time, delta, speed, false);
  }

  setVisible(visible) {
    this.visible = visible;
    this.object.visible = visible;
  }
}

function buildBuoy(color = 0xd94f36) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.9, 16), standard(color));
  body.position.y = 0.15;
  group.add(body);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.5, 16), standard(color, { roughness: 0.7 }));
  skirt.position.y = -1.35;
  skirt.rotation.x = Math.PI;
  group.add(skirt);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.16, 8, 20), standard(0xf5f7fa));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.05;
  group.add(collar);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), standard(0xcfd6dd, { metalness: 0.5 }));
  pole.position.y = 2.3;
  group.add(pole);

  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffc24d, emissiveIntensity: 3 })
  );
  light.position.y = 3.7;
  group.add(light);

  return { group, waterline: 0.15 };
}

function buildCrate(size, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), standard(color, { roughness: 0.85 }));
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(size * 1.02, size * 0.14, size * 1.02),
    standard(0x7a5a34, { roughness: 0.9 })
  );
  const group = new THREE.Group();
  group.add(mesh, trim);
  return { group, waterline: -size * 0.22 };
}

/**
 * A fixed graduated pole at the origin with a disc that tracks the surface,
 * so wave height can be read off directly instead of guessed.
 */
// Tall enough to stay readable in the heaviest presets, where crests run
// well past 20 m above the trough.
function buildGauge(height = 48) {
  const group = new THREE.Group();

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, height, 12),
    standard(0x1d2a35, { roughness: 0.5, metalness: 0.3 })
  );
  group.add(post);

  const bandGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 12);
  const bandMat = standard(0xffd34d, { roughness: 0.55 });
  for (let y = -height / 2 + 1; y < height / 2; y += 2) {
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = y;
    group.add(band);
  }

  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.14, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x57d7ff, emissive: 0x2aa8d8, emissiveIntensity: 1.8 })
  );
  marker.rotation.x = Math.PI / 2;
  group.add(marker);

  return { group, marker };
}

/**
 * Short-lived water spray for hull landings. Particles are recycled from a
 * fixed pool so a hard landing never allocates mid-frame.
 */
class LandingSplash {
  constructor(scene, capacity = 160) {
    this.capacity = capacity;
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.velocity = new Float32Array(capacity * 3);

    const positions = new Float32Array(capacity * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    this.material = new THREE.PointsMaterial({
      color: 0xdff6ff,
      size: 0.55,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this.positions = positions;
  }

  burst(origin, heading, impact, planarSpeed) {
    const strength = THREE.MathUtils.clamp(impact / 8, 0.25, 1.6);
    const count = Math.floor(28 + strength * 55 + Math.min(planarSpeed, 12) * 2);
    const forwardX = Math.cos(heading);
    const forwardZ = -Math.sin(heading);
    const sideX = -forwardZ;
    const sideZ = forwardX;

    let spawned = 0;
    for (let i = 0; i < this.capacity && spawned < count; i++) {
      if (this.life[i] > 0) continue;

      const side = (Math.random() - 0.5) * 2;
      const forward = Math.random() * 0.7 - 0.15;
      const speed = 2.5 + strength * 7 + Math.random() * 4;

      this.positions[i * 3] = origin.x + sideX * side * 1.4 + forwardX * forward * 2.2;
      this.positions[i * 3 + 1] = origin.y + 0.2 + Math.random() * 0.4;
      this.positions[i * 3 + 2] = origin.z + sideZ * side * 1.4 + forwardZ * forward * 2.2;

      this.velocity[i * 3] =
        sideX * side * speed * 0.85 + forwardX * (2 + planarSpeed * 0.35 + Math.random() * 2);
      this.velocity[i * 3 + 1] = 3.5 + strength * 6 + Math.random() * 5;
      this.velocity[i * 3 + 2] =
        sideZ * side * speed * 0.85 + forwardZ * (2 + planarSpeed * 0.35 + Math.random() * 2);

      this.maxLife[i] = 0.35 + Math.random() * 0.55 + strength * 0.2;
      this.life[i] = this.maxLife[i];
      spawned++;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
  }

  update(delta, waveField, ocean, time) {
    let write = 0;
    let lifeSum = 0;

    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;

      this.life[i] -= delta;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        continue;
      }

      const ix = i * 3;
      this.velocity[ix + 1] -= GRAVITY * 1.35 * delta;
      this.positions[ix] += this.velocity[ix] * delta;
      this.positions[ix + 1] += this.velocity[ix + 1] * delta;
      this.positions[ix + 2] += this.velocity[ix + 2] * delta;

      const surface = sampleSurface(
        waveField,
        ocean,
        this.positions[ix],
        this.positions[ix + 2],
        time,
        true
      ).height;
      if (this.positions[ix + 1] < surface - 0.15) {
        this.life[i] = 0;
        continue;
      }

      // Compact live droplets so dead slots are not drawn at stale positions.
      if (write !== i) {
        const wx = write * 3;
        this.positions[wx] = this.positions[ix];
        this.positions[wx + 1] = this.positions[ix + 1];
        this.positions[wx + 2] = this.positions[ix + 2];
        this.velocity[wx] = this.velocity[ix];
        this.velocity[wx + 1] = this.velocity[ix + 1];
        this.velocity[wx + 2] = this.velocity[ix + 2];
        this.life[write] = this.life[i];
        this.maxLife[write] = this.maxLife[i];
        this.life[i] = 0;
      }

      lifeSum += this.life[write] / this.maxLife[write];
      write++;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.setDrawRange(0, write);
    this.material.opacity = write ? Math.min(0.95, (lifeSum / write) * 0.95) : 0;
    this.material.size = 0.45 + Math.min(0.7, write * 0.005);
    this.points.visible = write > 0;
  }
}

export class FloatingFleet {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.floaters = [];
    this.drifters = [];
    this.settings = {
      autoDrive: false,
      boatSpeed: 58,
      enginePower: 38,
      jumpBoost: 1.1,
      showNpcs: true,
    };
    this.boatPath = {
      centerX: 12,
      centerZ: 10,
      radius: 42,
    };
    this.input = { throttle: 0, steer: 0 };
    this.boatVelocity = new THREE.Vector2(0, -this.settings.boatSpeed);
    this.splash = new LandingSplash(scene);
    this.npcs = [];

    const craft = buildJetSki();
    craft.group.position.set(-16, 0, 10);
    craft.group.rotation.y = Math.PI / 2;
    this.group.add(craft.group);
    this.boat = craft.group;
    this.sternOffset = craft.sternOffset;
    this.cameraSeat = craft.cameraSeat;
    this.cameraLook = craft.cameraLook;
    this.boatFloater = new Floater(craft.group, {
      length: craft.length,
      width: craft.width,
      waterline: craft.waterline,
      response: 11,
      canJump: true,
    });
    this.floaters.push(this.boatFloater);

    const npcSpecs = [
      { x: 40, z: -30, hull: 0xf7f9fc, accent: 0xc4342c, speed: 9.5, radius: 55, cx: 10, cz: -5, phase: 0.2 },
      { x: -45, z: 35, hull: 0xfff4e0, accent: 0x1f7a4c, speed: 8.2, radius: 48, cx: -15, cz: 20, phase: 1.7 },
      { x: 55, z: 40, hull: 0xe8f4ff, accent: 0x2b6cb0, speed: 10.4, radius: 62, cx: 25, cz: 25, phase: 3.1 },
      { x: -30, z: -50, hull: 0xf5f0e8, accent: 0xd97706, speed: 7.8, radius: 50, cx: -20, cz: -25, phase: 4.4 },
      { x: 20, z: 60, hull: 0xf0f7f4, accent: 0x7c3aed, speed: 9.0, radius: 58, cx: 5, cz: 40, phase: 5.5 },
    ];
    for (const spec of npcSpecs) {
      const npc = new NpcBoat(this.group, {
        x: spec.x,
        z: spec.z,
        hullColor: spec.hull,
        accentColor: spec.accent,
        speed: spec.speed,
        radius: spec.radius,
        centerX: spec.cx,
        centerZ: spec.cz,
        phase: spec.phase,
      });
      this.npcs.push(npc);
    }

    const buoyPlacements = [
      { x: 22, z: -14, color: 0xd94f36 },
      { x: 34, z: 26, color: 0x2fbf71 },
      { x: -34, z: -28, color: 0xf0a92b },
    ];
    for (const spot of buoyPlacements) {
      const buoy = buildBuoy(spot.color);
      buoy.group.position.set(spot.x, 0, spot.z);
      this.group.add(buoy.group);
      const floater = new PointFloater(buoy.group, {
        waterline: buoy.waterline,
        response: 6.5,
        radius: 1.1,
        drift: 0.42,
      });
      this.floaters.push(floater);
      this.drifters.push(floater);
    }

    const cratePlacements = [
      { x: 8, z: -22, size: 1.8, color: 0xa9793f },
      { x: 12, z: -25.5, size: 1.4, color: 0x8f6533 },
      { x: -8, z: 30, size: 2.1, color: 0xb3854a },
    ];
    for (const spot of cratePlacements) {
      const crate = buildCrate(spot.size, spot.color);
      crate.group.position.set(spot.x, 0, spot.z);
      crate.group.rotation.y = Math.random() * Math.PI;
      this.group.add(crate.group);
      const floater = new PointFloater(crate.group, {
        waterline: crate.waterline,
        response: 8,
        tilt: 1,
        radius: spot.size * 0.72,
        drift: 0.78,
      });
      this.floaters.push(floater);
      this.drifters.push(floater);
    }

    const gauge = buildGauge();
    this.group.add(gauge.group);
    this.gaugeMarker = gauge.marker;
  }

  updateBoatPhysics(waveField, time, delta) {
    let throttle = this.input.throttle;
    let steer = this.input.steer;

    if (this.settings.autoDrive) {
      const path = this.boatPath;
      const radialX = this.boat.position.x - path.centerX;
      const radialZ = this.boat.position.z - path.centerZ;
      const radialLength = Math.max(0.001, Math.hypot(radialX, radialZ));
      const nx = radialX / radialLength;
      const nz = radialZ / radialLength;
      const radialError = radialLength - path.radius;

      // Tangent direction plus a proportional correction back toward the route.
      const desiredX = -nz - nx * radialError * 0.055;
      const desiredZ = nx - nz * radialError * 0.055;
      const desiredHeading = Math.atan2(-desiredZ, desiredX);
      let headingError = desiredHeading - this.boatFloater.heading;
      headingError = Math.atan2(Math.sin(headingError), Math.cos(headingError));
      // Positive steer means starboard, which decreases heading.
      steer = THREE.MathUtils.clamp(-headingError * 2.1, -1, 1);

      const forwardX = Math.cos(this.boatFloater.heading);
      const forwardZ = -Math.sin(this.boatFloater.heading);
      const forwardSpeed =
        this.boatVelocity.x * forwardX + this.boatVelocity.y * forwardZ;
      throttle = THREE.MathUtils.clamp(
        (this.settings.boatSpeed - forwardSpeed) * 0.55,
        -0.35,
        1
      );
    }

    const heading = this.boatFloater.heading;
    const forwardX = Math.cos(heading);
    const forwardZ = -Math.sin(heading);
    const sideX = -forwardZ;
    const sideZ = forwardX;
    const speed = this.boatVelocity.length();
    const forwardSpeed =
      this.boatVelocity.x * forwardX + this.boatVelocity.y * forwardZ;
    const lateralSpeed =
      this.boatVelocity.x * sideX + this.boatVelocity.y * sideZ;
    const airborne = this.boatFloater.airborne;

    // Jet thrust is snappy; less hull drag so top speed stays high.
    const thrustScale = airborne ? 0.35 : 1;
    this.boatVelocity.x +=
      forwardX * throttle * this.settings.enginePower * thrustScale * delta;
    this.boatVelocity.y +=
      forwardZ * throttle * this.settings.enginePower * thrustScale * delta;

    if (!airborne) {
      const drag = Math.exp(-(0.002 + speed * 0.0007) * delta);
      this.boatVelocity.multiplyScalar(drag);
      this.boatVelocity.x -= sideX * lateralSpeed * Math.min(1, delta * 2.4);
      this.boatVelocity.y -= sideZ * lateralSpeed * Math.min(1, delta * 2.4);
    } else {
      this.boatVelocity.multiplyScalar(Math.exp(-0.03 * delta));
    }

    // Large wave slopes shove the hull sideways and make storm handling harder.
    waveField.surfaceAt(
      this.boat.position.x,
      this.boat.position.z,
      time,
      _sample
    );
    if (!airborne) {
      this.boatVelocity.x += _sample.normal.x * 0.7 * delta;
      this.boatVelocity.y += _sample.normal.z * 0.7 * delta;

      // Crashing crests shove you, but do not auto-launch on every whitecap.
      if (_sample.fold > 0.7) {
        const crash = THREE.MathUtils.smoothstep(_sample.fold, 0.7, 1.15);
        const kick = crash * Math.max(0.4, waveField.params.breakStrength) * this.settings.jumpBoost;
        this.boatVelocity.x += _sample.normal.x * kick * 10 * delta;
        this.boatVelocity.y += _sample.normal.z * kick * 10 * delta;
        this.boatFloater.verticalVelocity += kick * 12 * delta;
      }

      // Only steep faces build jump load.
      const pitchClimb = Math.max(0, this.boatFloater.target.pitch - 0.12);
      this.boatFloater.verticalVelocity += pitchClimb * Math.max(0, forwardSpeed) * 0.55 * delta;
    }

    const steeringAuthority =
      airborne
        ? 0.22
        : (0.28 + Math.min(Math.abs(forwardSpeed), 24) * 0.04) *
          THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 0.5, 0, 1);
    // The bow points along (cos h, -sin h), so turning starboard reduces heading.
    this.boatFloater.heading -= steer * steeringAuthority * delta;

    this.boat.position.x += this.boatVelocity.x * delta;
    this.boat.position.z += this.boatVelocity.y * delta;
  }

  resolveCollisions() {
    for (let i = 0; i < this.drifters.length; i++) {
      const a = this.drifters[i];

      // The boat has much greater mass, so collisions mostly push debris away.
      let dx = a.object.position.x - this.boat.position.x;
      let dz = a.object.position.z - this.boat.position.z;
      let distance = Math.hypot(dx, dz);
      const boatContact = a.radius + 1.4;
      if (distance < boatContact && distance > 0.0001) {
        dx /= distance;
        dz /= distance;
        const overlap = boatContact - distance;
        a.object.position.x += dx * overlap;
        a.object.position.z += dz * overlap;
        const impact =
          Math.max(
            0,
            this.boatVelocity.x * dx +
              this.boatVelocity.y * dz -
              a.velocity.x * dx -
              a.velocity.y * dz
          ) + 0.6;
        a.velocity.x += dx * impact * 0.8;
        a.velocity.y += dz * impact * 0.8;
        this.boatVelocity.x -= dx * impact * 0.025;
        this.boatVelocity.y -= dz * impact * 0.025;
      }

      for (let j = i + 1; j < this.drifters.length; j++) {
        const b = this.drifters[j];
        dx = b.object.position.x - a.object.position.x;
        dz = b.object.position.z - a.object.position.z;
        distance = Math.hypot(dx, dz);
        const contact = a.radius + b.radius;
        if (distance >= contact || distance <= 0.0001) continue;

        dx /= distance;
        dz /= distance;
        const overlap = (contact - distance) * 0.5;
        a.object.position.x -= dx * overlap;
        a.object.position.z -= dz * overlap;
        b.object.position.x += dx * overlap;
        b.object.position.z += dz * overlap;

        const relative =
          (b.velocity.x - a.velocity.x) * dx +
          (b.velocity.y - a.velocity.y) * dz;
        if (relative < 0) {
          const impulse = -relative * 0.42;
          a.velocity.x -= dx * impulse;
          a.velocity.y -= dz * impulse;
          b.velocity.x += dx * impulse;
          b.velocity.y += dz * impulse;
        }
      }
    }

    if (!this.settings.showNpcs) return;

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      let dx = npc.object.position.x - this.boat.position.x;
      let dz = npc.object.position.z - this.boat.position.z;
      let distance = Math.hypot(dx, dz);
      const contact = npc.radius + 1.5;
      if (distance < contact && distance > 0.0001) {
        dx /= distance;
        dz /= distance;
        const overlap = contact - distance;
        npc.object.position.x += dx * overlap * 0.75;
        npc.object.position.z += dz * overlap * 0.75;
        this.boat.position.x -= dx * overlap * 0.25;
        this.boat.position.z -= dz * overlap * 0.25;

        const relative =
          this.boatVelocity.x * dx +
          this.boatVelocity.y * dz -
          npc.velocity.x * dx -
          npc.velocity.y * dz;
        if (relative > 0) {
          const impulse = relative * 0.55;
          this.boatVelocity.x -= dx * impulse * 0.55;
          this.boatVelocity.y -= dz * impulse * 0.55;
          npc.velocity.x += dx * impulse * 0.45;
          npc.velocity.y += dz * impulse * 0.45;
        }
      }

      for (let j = i + 1; j < this.npcs.length; j++) {
        const other = this.npcs[j];
        dx = other.object.position.x - npc.object.position.x;
        dz = other.object.position.z - npc.object.position.z;
        distance = Math.hypot(dx, dz);
        const hullContact = npc.radius + other.radius;
        if (distance >= hullContact || distance <= 0.0001) continue;
        dx /= distance;
        dz /= distance;
        const overlap = (hullContact - distance) * 0.5;
        npc.object.position.x -= dx * overlap;
        npc.object.position.z -= dz * overlap;
        other.object.position.x += dx * overlap;
        other.object.position.z += dz * overlap;
      }
    }
  }

  update(waveField, ocean, time, delta, jumpPressed = false) {
    this.updateBoatPhysics(waveField, time, delta);
    const boatSpeed = this.boatVelocity.length();
    for (const floater of this.floaters) {
      const speed = floater === this.boatFloater ? boatSpeed : 0;
      const jumping = floater === this.boatFloater ? jumpPressed : false;
      floater.update(waveField, ocean, time, delta, speed, jumping);
    }

    if (this.settings.showNpcs) {
      for (const npc of this.npcs) {
        npc.update(waveField, ocean, time, delta);
      }
    }

    const impact = this.boatFloater.landedImpact;
    if (impact > 0.8) {
      // Keep most forward speed on touchdown — water should feel slippery, not sticky.
      const keep = THREE.MathUtils.clamp(1 - impact * 0.018, 0.82, 0.97);
      this.boatVelocity.multiplyScalar(keep);
      this.splash.burst(
        this.boat.position,
        this.boatFloater.heading,
        impact,
        boatSpeed
      );
    }

    this.splash.update(delta, waveField, ocean, time);
    this.resolveCollisions();
    this.gaugeMarker.position.y = waveField.surfaceAt(0, 0, time, _sample).height;
  }

  setInput(throttle, steer) {
    this.input.throttle = THREE.MathUtils.clamp(throttle, -1, 1);
    this.input.steer = THREE.MathUtils.clamp(steer, -1, 1);
  }

  getWakeState() {
    const airborne = this.boatFloater.airborne;
    return {
      position: this.boat.position,
      heading: this.boatFloater.heading,
      speed: airborne ? 0 : this.boatVelocity.length(),
      sternOffset: this.sternOffset,
    };
  }

  setVisible(visible) {
    this.group.visible = visible;
    this.splash.points.visible = visible && this.splash.material.opacity > 0;
    for (const npc of this.npcs) npc.setVisible(visible && this.settings.showNpcs);
  }

  setNpcsVisible(visible) {
    this.settings.showNpcs = visible;
    for (const npc of this.npcs) npc.setVisible(visible && this.group.visible);
  }
}
