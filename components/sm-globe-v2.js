/* sm-globe-v2 — reworked high-fidelity chromatic night-Earth for the SpaceMarkets hero.
   Ported from the "Planet 3D asset rework" design project; changes from the design
   version: three.js resolves from the bundled dependency (not the CDN), the texture
   loads from /earth-night.jpg, and rendering pauses while scrolled offscreen.
   Dawn-terminator crescent, spectral (chromatic) atmosphere rim, city-light bloom,
   faint star field + film grain. Drag to spin; annotated satellites kept from v1.
   Attributes: dawn (0–2), bloom (0–2), limb (0–1, scales the bright rim line
   at the planet's edge), stars/grain/labels/rings (true/false),
   framing (ball|horizon), zoom, label-inset, sats (0–3), orbit-scale. */
(function () {
  if (typeof window === 'undefined') return;
  if (customElements.get('sm-globe-v2')) return;
  const TEX_URLS = ['/earth-night.jpg'];
  const MONO = "'JetBrains Mono', monospace";

  const EARTH_VERT = `
    varying vec3 vN; varying vec2 vUv; varying vec3 vPos;
    void main(){
      vN = normalize(normalMatrix * normal);
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vPos = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;

  const EARTH_FRAG = `
    uniform sampler2D map;
    uniform vec3 sunDir;
    uniform float dawn;
    uniform float bloom;
    uniform float limb;
    varying vec3 vN; varying vec2 vUv; varying vec3 vPos;
    void main(){
      vec3 base = texture2D(map, vUv).rgb;
      // cheap 4-tap halo for city-light bloom
      vec3 halo = texture2D(map, vUv + vec2( 0.0045, 0.0)).rgb
                + texture2D(map, vUv + vec2(-0.0045, 0.0)).rgb
                + texture2D(map, vUv + vec2(0.0,  0.009)).rgb
                + texture2D(map, vUv + vec2(0.0, -0.009)).rgb;
      halo *= 0.25;
      float warmth   = max(base.r - base.b, 0.0);
      float haloWarm = max(halo.r - halo.b, 0.0);
      vec3 col = base * vec3(1.18, 1.25, 1.45);
      col += vec3(1.0, 0.62, 0.28) * haloWarm * (1.6 * bloom);
      col += vec3(1.0, 0.80, 0.50) * pow(warmth, 0.85) * (1.5 * bloom);
      vec3 N = normalize(vN);
      vec3 V = normalize(-vPos);
      vec3 S = normalize(sunDir);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
      float sun = dot(N, S);
      // tight ember arc hugging the terminator at the limb
      float band = exp(-pow((sun - 0.12) / 0.18, 2.0));
      col += vec3(1.0, 0.48, 0.20) * band * fres * (1.5 * dawn);
      // steel-blue day limb beyond the terminator
      col += vec3(0.45, 0.75, 1.0) * smoothstep(0.3, 0.9, sun) * fres * (0.8 * dawn * limb);
      // faint airglow on the whole limb
      col += vec3(0.5, 0.85, 1.0) * fres * (0.05 * limb);
      // broad ocean glint toward the sun
      float spec = pow(max(dot(reflect(-S, N), V), 0.0), 7.0);
      col += vec3(0.35, 0.55, 0.9) * spec * 0.10 * dawn;
      // filmic rolloff
      col = 1.0 - exp(-col * 1.6);
      gl_FragColor = vec4(col, 1.0);
    }`;

  const ATM_VERT = `
    varying vec3 vN;
    void main(){
      vN = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  // Spectral rim: per-channel falloff exponents split the glow into a chromatic fringe
  const ATM_FRAG = `
    varying vec3 vN;
    uniform vec3 sunDir;
    uniform float dawn;
    void main(){
      vec3 N = normalize(vN);
      float f = max(0.72 - dot(N, vec3(0.0, 0.0, 1.0)), 0.0);
      vec3 spectral = vec3(pow(f, 5.2), pow(f, 4.6), pow(f, 4.0));
      float sun = max(dot(N, normalize(sunDir)), 0.0);
      vec3 tint = mix(vec3(0.30, 0.55, 1.0), vec3(0.65, 0.85, 1.0), clamp(f * 1.8, 0.0, 1.0));
      tint = mix(tint, vec3(1.0, 0.55, 0.25), pow(sun, 2.0) * 0.45 * dawn);
      float daymod = 0.35 + 0.65 * smoothstep(-0.3, 0.6, dot(N, normalize(sunDir)));
      gl_FragColor = vec4(tint * spectral * 1.6 * daymod, 1.0);
    }`;

  class SmGlobeV2 extends HTMLElement {
    static get observedAttributes() { return ['dawn', 'bloom', 'limb', 'stars', 'grain', 'framing', 'zoom', 'label-inset', 'sats', 'labels', 'orbit-scale', 'rings']; }

    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.display = 'block';
      this.style.position = 'relative';
      if (!this.style.width) this.style.width = '100%';
      if (!this.style.height) this.style.height = '100%';
      this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._readAttrs();
      this._boot().catch((e) => console.warn('sm-globe-v2 failed', e));
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      this._ro && this._ro.disconnect();
      this._vio && this._vio.disconnect();
      this._renderer && this._renderer.dispose();
    }
    attributeChangedCallback() {
      if (!this._init) return;
      this._readAttrs();
      this._apply();
    }
    _readAttrs() {
      const num = (n, d) => { const v = parseFloat(this.getAttribute(n)); return isNaN(v) ? d : v; };
      const bool = (n, d) => { const v = this.getAttribute(n); return v == null ? d : v !== 'false' && v !== '0'; };
      this._p = { dawn: num('dawn', 1), bloom: num('bloom', 1), limb: num('limb', 1), stars: bool('stars', true), grain: bool('grain', true), framing: this.getAttribute('framing') || 'horizon', zoom: num('zoom', 1), labelInset: num('label-inset', 0), sats: num('sats', 2), labels: bool('labels', true), orbitScale: num('orbit-scale', 1), rings: bool('rings', true) };
    }
    _apply() {
      const p = this._p;
      if (this._earthU) { this._earthU.dawn.value = p.dawn; this._earthU.bloom.value = p.bloom; this._earthU.limb.value = p.limb; }
      if (this._atmU) this._atmU.dawn.value = p.dawn;
      if (this._stars) this._stars.visible = p.stars;
      if (this._grain) this._grain.style.display = p.grain ? 'block' : 'none';
      if (this._root3) {
        if (p.framing === 'ball') { this._root3.scale.setScalar(1 * p.zoom); this._root3.position.set(0, 0, 0); }
        else { this._root3.scale.setScalar(2.75 * p.zoom); this._root3.position.set(2.0, -2.35, 0); }
        this._autoPhase();
      }
      if (this._reduced && this._renderer) this._renderFrame(0);
    }

    async _boot() {
      const THREE = await import('three');
      this._THREE = THREE;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(renderer.domElement);
      this._renderer = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
      camera.position.set(0, 0, 5.5);
      this._scene = scene; this._camera = camera;

      const sunDir = new THREE.Vector3(0.9, 0.42, 0.3).normalize();
      // lights for the satellite meshes (earth/atmosphere use custom shaders)
      scene.add(new THREE.AmbientLight(0x46567a, 1.1));
      const sunLight = new THREE.DirectionalLight(0xfff1dd, 2.4);
      sunLight.position.copy(sunDir).multiplyScalar(10);
      scene.add(sunLight);

      const tex = await this._loadTexture(THREE);
      if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
      this._earthU = {
        map: { value: tex },
        sunDir: { value: sunDir },
        dawn: { value: this._p.dawn },
        bloom: { value: this._p.bloom },
        limb: { value: this._p.limb },
      };
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(1, 128, 128),
        tex
          ? new THREE.ShaderMaterial({ uniforms: this._earthU, vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG })
          : new THREE.MeshBasicMaterial({ color: 0x071421 })
      );
      const globe = new THREE.Group();
      globe.add(earth);
      globe.rotation.z = 0.12;
      globe.rotation.x = 0.18;
      const root = new THREE.Group();
      root.add(globe);
      scene.add(root);
      this._root3 = root;
      this._globe = globe;

      this._atmU = { sunDir: { value: sunDir }, dawn: { value: this._p.dawn } };
      const atm = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 96, 96),
        new THREE.ShaderMaterial({
          uniforms: this._atmU, vertexShader: ATM_VERT, fragmentShader: ATM_FRAG,
          side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
        })
      );
      root.add(atm);

      this._stars = this._makeStars(THREE, scene);
      this._stars.visible = this._p.stars;

      // orbit-scale compresses each orbit's altitude above the surface (r=1),
      // not the absolute radius — a straight multiply would put sub-1 products
      // inside the planet (mobile uses orbit-scale 0.82: 1.08×0.82 = 0.886).
      const orbitR = (r) => 1 + (r - 1) * this._p.orbitScale;
      const satCfgs = [
        { r: orbitR(1.26), tiltX: 0.42, tiltZ: -0.25, speed: 0.03, phase: 4.6, color: 0x20d9ff, label: 'STARLINK-5482', sub: 'COMMS LEASE · 8.2K USDC/MO' },
        { r: orbitR(1.08), tiltX: -0.5, tiltZ: 0.35, speed: 0.05, phase: 2.6, color: 0xff9d3b, label: 'ISS · BARTOLOMEO', sub: 'PAYLOAD SLOT · SETTLING' },
        { r: orbitR(1.17), tiltX: 0.12, tiltZ: 0.62, speed: 0.04, phase: 0.9, color: 0x20d9ff, label: 'KUIPER-1140', sub: '' },
      ];
      this._sats = satCfgs.slice(0, Math.max(0, Math.min(3, this._p.sats))).map((c) => this._makeSat(THREE, root, c));
      this._apply();
      if (this._p.labels) for (const s of this._sats) {
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;font-family:${MONO};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#F5F8FF;white-space:nowrap;text-align:center;text-shadow:0 1px 8px rgba(3,7,11,0.9)`;
        el.innerHTML = s.label +
          (s.sub ? `<div style="margin-top:5px;color:#8E99AA;letter-spacing:0.18em">${s.sub}</div>` : '') +
          `<div style="width:1px;height:12px;background:rgba(245,248,255,0.35);margin:6px auto 0"></div>`;
        this.appendChild(el);
        s.el = el;
      }

      // film grain overlay
      const grain = document.createElement('div');
      grain.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0.05;mix-blend-mode:overlay;background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22/></svg>')";
      grain.style.display = this._p.grain ? 'block' : 'none';
      this.appendChild(grain);
      this._grain = grain;

      // Drag to spin
      let dragging = false, px = 0, py = 0;
      this._vel = 0;
      this.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; this.setPointerCapture(e.pointerId); this.style.cursor = 'grabbing'; });
      this.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
        globe.rotation.y += dx * 0.005;
        globe.rotation.x = Math.max(-0.6, Math.min(0.6, globe.rotation.x + dy * 0.003));
        this._vel = dx * 0.005;
      });
      const end = () => { dragging = false; this.style.cursor = 'grab'; };
      this.addEventListener('pointerup', end);
      this.addEventListener('pointercancel', end);
      this.style.cursor = 'grab';
      this.style.touchAction = 'pan-y';

      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(this);
      this._resize();
      this._autoPhase();

      // Skip rendering while scrolled offscreen (battery, esp. mobile)
      this._visible = true;
      this._vio = new IntersectionObserver((entries) => { this._visible = entries[0].isIntersecting; });
      this._vio.observe(this);

      if (this._reduced) { this._renderFrame(0.016); }
      else {
        let last = performance.now();
        const tick = (now) => {
          const dt = Math.min((now - last) / 1000, 0.05); last = now;
          if (!document.hidden && this._visible) {
            if (!dragging) {
              this._vel *= 0.95;
              globe.rotation.y += 0.018 * dt + this._vel;
            }
            this._stars.rotation.y = globe.rotation.y * 0.05;
            this._renderFrame(dt);
          }
          this._raf = requestAnimationFrame(tick);
        };
        this._raf = requestAnimationFrame(tick);
      }
    }

    _autoPhase() {
      const THREE = this._THREE;
      if (!THREE || !this._sats || !this._camera) return;
      if (!this._p.labels) { this._sats.forEach((s) => { s.win = null; }); return; }
      this._scene.updateMatrixWorld(true);
      const targets = [[0.78, 0.24], [0.56, 0.68], [0.3, 0.32]];
      const C = this._camera.position, S = this._root3.position, R = this._root3.scale.x * 1.03;
      this._sats.forEach((s, i) => {
        const t = targets[i % targets.length];
        const N = 256, step = Math.PI * 2 / N;
        const valid = new Array(N).fill(false);
        let bestK = -1, bestD = Infinity;
        const v = new THREE.Vector3(), dir = new THREE.Vector3(), oc = new THREE.Vector3();
        for (let k = 0; k < N; k++) {
          const a = k * step;
          v.set(Math.cos(a) * s.r, 0, Math.sin(a) * s.r).applyMatrix4(s.group.matrixWorld);
          dir.copy(v).sub(C); const L = dir.length(); dir.normalize();
          oc.copy(S).sub(C);
          const tca = oc.dot(dir), d2 = oc.lengthSq() - tca * tca;
          if (d2 < R * R) {
            const t0 = tca - Math.sqrt(R * R - d2);
            if (t0 > 0 && t0 < L - 0.01) continue;
          }
          const p = v.project(this._camera);
          if (p.z > 1) continue;
          const x = p.x * 0.5 + 0.5, y = -p.y * 0.5 + 0.5;
          if (x < 0.48 || x > 0.92 || y < 0.08 || y > 0.9) continue;
          valid[k] = true;
          const d = Math.hypot(x - t[0], y - t[1]);
          if (d < bestD) { bestD = d; bestK = k; }
        }
        if (bestK < 0) { s.win = null; return; }
        let left = 0, right = 0;
        while (left < N - 1 && valid[(bestK - left - 1 + N) % N]) left++;
        while (right < N - 1 && valid[(bestK + right + 1) % N]) right++;
        if (left + right >= N - 1) { s.win = null; s.angle = bestK * step; return; }
        const start = ((bestK - left + N) % N) * step, end = ((bestK + right) % N) * step;
        s.win = [start, end];
        s.angle = bestK * step;
      });
    }

    _makeStars(THREE, scene) {
      const group = new THREE.Group();
      const mk = (count, size, opacity, spread) => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
            .normalize().multiplyScalar(spread + Math.random() * 8);
          if (v.z > -4) v.z = -4 - Math.random() * 12;
          pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return new THREE.Points(g, new THREE.PointsMaterial({
          color: 0xcfe0ff, size, transparent: true, opacity, sizeAttenuation: false, depthWrite: false,
        }));
      };
      group.add(mk(420, 1.1, 0.5, 16), mk(130, 1.9, 0.75, 13));
      scene.add(group);
      return group;
    }

    _makeSat(THREE, parent, cfg) {
      const g = new THREE.Group();
      g.rotation.x = cfg.tiltX; g.rotation.z = cfg.tiltZ;
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * cfg.r, 0, Math.sin(a) * cfg.r));
      }
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
      );
      if (this._p.rings) g.add(ring);
      // satellite model: bus + foil wrap + gimballed solar wings + dish + antennae
      const sat = new THREE.Group();
      const busMat = new THREE.MeshStandardMaterial({ color: 0xb9c4d4, roughness: 0.5, metalness: 0.65 });
      const busDarkMat = new THREE.MeshStandardMaterial({ color: 0x6a7688, roughness: 0.6, metalness: 0.5 });
      const foilMat = new THREE.MeshStandardMaterial({ color: 0xa8792f, roughness: 0.28, metalness: 0.9 });
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x0e2350, roughness: 0.22, metalness: 0.45, emissive: cfg.color, emissiveIntensity: 0.14 });
      const panelEdgeMat = new THREE.MeshStandardMaterial({ color: 0x8e99aa, roughness: 0.5, metalness: 0.7 });
      // main bus with beveled proportions
      const bus = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.56), busMat);
      sat.add(bus);
      // gold MLI foil wrapping the aft two-thirds of the bus
      const foil = new THREE.Mesh(new THREE.BoxGeometry(0.315, 0.315, 0.34), foilMat);
      foil.position.z = 0.09; sat.add(foil);
      // radiator panel on one face
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.4), busDarkMat);
      radiator.position.set(0.165, 0, -0.02); sat.add(radiator);
      // solar wings: yoke + 3 segmented panels each, slight gimbal cant
      const mkWing = (dir) => {
        const wing = new THREE.Group();
        const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 8), busMat);
        yoke.rotation.z = Math.PI / 2; yoke.position.x = dir * 0.27; wing.add(yoke);
        for (let i = 0; i < 3; i++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.016, 0.42), panelMat);
          seg.position.x = dir * (0.57 + i * 0.365); wing.add(seg);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.024), panelEdgeMat);
          rail.position.set(dir * (0.57 + i * 0.365), 0, 0.21); wing.add(rail);
        }
        wing.rotation.x = dir * 0.12;
        return wing;
      };
      sat.add(mkWing(1), mkWing(-1));
      // comm dish on a short boom, aimed off-axis
      const dishG = new THREE.Group();
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), busMat);
      dish.rotation.x = -Math.PI / 2; dishG.add(dish);
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), busDarkMat);
      feed.position.y = 0.05; dishG.add(feed);
      dishG.position.set(0, 0.21, 0.1); dishG.rotation.x = 0.45; sat.add(dishG);
      // whip antennae aft
      const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.003, 0.3, 6), busDarkMat);
      ant1.position.set(0.08, -0.18, 0.22); ant1.rotation.z = 0.25; sat.add(ant1);
      const ant2 = ant1.clone(); ant2.position.x = -0.08; ant2.rotation.z = -0.25; sat.add(ant2);
      // thruster nozzle aft
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.1, 16, 1, true), busDarkMat);
      nozzle.rotation.x = Math.PI / 2; nozzle.position.z = 0.33; sat.add(nozzle);
      sat.scale.setScalar(0.1);
      sat.rotation.set(0.5, 0.9, 0.12);
      const sprite = sat;
      g.add(sprite);
      parent.add(g);
      return { group: g, sprite, ...cfg, angle: cfg.phase };
    }

    _resize() {
      const w = this.clientWidth || 600, h = this.clientHeight || 600;
      this._renderer.setSize(w, h);
      this._camera.aspect = w / h;
      this._camera.updateProjectionMatrix();
      this._renderFrame(0);
    }

    _renderFrame(dt) {
      const THREE = this._THREE;
      const TWO_PI = Math.PI * 2;
      for (const s of this._sats || []) {
        if (!this._reduced) { s.angle += s.speed * dt; s.sprite.rotation.y += dt * 0.25; }
        if (s.win) {
          const na = ((s.angle % TWO_PI) + TWO_PI) % TWO_PI;
          const [w0, w1] = s.win;
          const inWin = w0 <= w1 ? (na >= w0 && na <= w1) : (na >= w0 || na <= w1);
          if (!inWin) s.angle = w0;
        }
        s.sprite.position.set(Math.cos(s.angle) * s.r, 0, Math.sin(s.angle) * s.r);
      }
      this._scene.updateMatrixWorld(true);
      this._renderer.render(this._scene, this._camera);
      const W = this.clientWidth, H = this.clientHeight;
      for (const s of this._sats || []) {
        if (s.el) {
          const v = new THREE.Vector3();
          s.sprite.getWorldPosition(v);
          v.project(this._camera);
          const x = (v.x * 0.5 + 0.5) * W;
          const y = (-v.y * 0.5 + 0.5) * H;
          const labelW = s.el.offsetWidth || 200;
          const labelH = s.el.offsetHeight || 20;
          let lx = x - labelW / 2;
          const inset = 8 + (this._p.labelInset || 0);
          lx = Math.max(inset, Math.min(W - labelW - inset, lx));
          const ly = y - labelH - 12;
          const hidden = v.z > 1 || ly < 4 || y < 0 || y > H;
          s.el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
          s.el.style.opacity = hidden ? '0' : '1';
        }
      }
    }

    _loadTexture(THREE) {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const tryUrl = (i) => new Promise((res) => {
        if (i >= TEX_URLS.length) return res(null);
        loader.load(TEX_URLS[i], (t) => res(t), undefined, () => tryUrl(i + 1).then(res));
      });
      return tryUrl(0);
    }
  }
  customElements.define('sm-globe-v2', SmGlobeV2);
})();

export {};
