import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.183.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.183.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.183.0/examples/jsm/loaders/GLTFLoader.js';

/**
 * 1. Base Setup
 */
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#1a1a1a');

const sizes = { width: window.innerWidth, height: window.innerHeight };

/**
 * 2. Loaders (For your custom files)
 */
const gltfLoader = new GLTFLoader();
const audioLoader = new THREE.AudioLoader();
let machineMixer = null;
let machineAction = null;

/**
 * 3. Architecture & Statistical Night Lighting
 */
const relationalLights = []; 
const relationalWindows = []; 
const baseColor = '#b3b3b3'; 

// Edge Material to prevent visual collapse
const edgeMat = new THREE.LineBasicMaterial({ color: '#111111', transparent: true, opacity: 0.5 });

const matNorth = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9, side: THREE.DoubleSide });
const matSouth = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9, side: THREE.DoubleSide });
const matAbstract = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9, side: THREE.DoubleSide });

// Ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: '#0a0a0a' }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.receiveShadow = true;
scene.add(ground);

// Architecture Parameters
const bWidth = 12;      
const bDepth = 5;       
const bGap = 0.5;       
const alleyWidth = 2.0; 
const overhangExtension = 0.5; 

const numBuildingsPerSide = 4;
const blockStrideX = bWidth + bGap; 
const blockWidth = numBuildingsPerSide * blockStrideX; 
const zStride = (bDepth * 2) + alleyWidth + 0.5; 

const numRows = 2;
const numCols = 3;

// --- PRE-CALCULATE THE 3 TEXTILE FACTORIES ---
const totalBuildings = numRows * numCols * numBuildingsPerSide * 2; 
const textileFactoryIndices = [];
while (textileFactoryIndices.length < 3) {
    const randomIdx = Math.floor(Math.random() * totalBuildings);
    if (!textileFactoryIndices.includes(randomIdx)) {
        textileFactoryIndices.push(randomIdx);
    }
}

function buildCity() {
    let buildingCounter = 0; 
    const totalBuildings = numRows * numCols * numBuildingsPerSide * 2; // 48

    // 1. CREATE THE EXACT DECK OF CARDS FOR GROUND FLOORS
    // We need exactly 38 lit rooms (19 Textile, 19 Care) and 10 Dark rooms.
    // Because 3 slots are reserved for the "Full Factories" (which must be Textile),
    // we put the remaining quantities into a deck: 16 Textile, 19 Care, 10 Dark.
    const groundDeck = [];
    for(let i = 0; i < 16; i++) groundDeck.push('textile');
    for(let i = 0; i < 19; i++) groundDeck.push('care');
    for(let i = 0; i < 10; i++) groundDeck.push('dark');

    // Shuffle the deck
    groundDeck.sort(() => Math.random() - 0.5);

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            
            const blockStartX = -(row * blockWidth); 
            const complexCenterZ = (1 - col) * zStride; 
            const isFocalComplex = (row === 0 && col === 1); 

            for (let i = 0; i < numBuildingsPerSide; i++) {
                const currentX = blockStartX - (i * blockStrideX) - (bWidth / 2);
                
                // South Building
                const isSouthFactory = textileFactoryIndices.includes(buildingCounter);
                const southCategory = isSouthFactory ? 'textile' : groundDeck.pop();
                buildIndividualStructure(currentX, complexCenterZ + (bDepth/2 + alleyWidth/2), isFocalComplex ? matSouth : matAbstract, -1, isSouthFactory, southCategory);
                buildingCounter++;

                // North Building
                const isNorthFactory = textileFactoryIndices.includes(buildingCounter);
                const northCategory = isNorthFactory ? 'textile' : groundDeck.pop();
                buildIndividualStructure(currentX, complexCenterZ - (bDepth/2 + alleyWidth/2), isFocalComplex ? matNorth : matAbstract, 1, isNorthFactory, northCategory);
                buildingCounter++;
            }
        }
    }
}

// Added 'groundCategory' as the final parameter!
function buildIndividualStructure(x, z, material, overhangDir, isFullTextile, groundCategory) {
    const group = new THREE.Group();
    const totalFloors = Math.floor(Math.random() * 3) + 6; 
    const floorHeight = 3.0;

    // --- 1. GROUND FLOOR (Open Facade) ---
    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
    const groundMats = [material, material, material, material, material, material];
    if (overhangDir === 1) groundMats[4] = invisibleMat; 
    else groundMats[5] = invisibleMat; 

    const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(bWidth, floorHeight, bDepth), groundMats);
    groundMesh.position.set(x, floorHeight / 2, z);
    groundMesh.castShadow = true; 
    groundMesh.receiveShadow = true;
    
    // Add architectural edges
    const groundEdges = new THREE.LineSegments(new THREE.EdgesGeometry(groundMesh.geometry), edgeMat);
    groundMesh.add(groundEdges);

    group.add(groundMesh);

    // --- GROUND FLOOR LIGHTING (Using Exact Deck) ---
    let groundColor = null;
    if (groundCategory === 'textile') groundColor = '#ccffff';
    else if (groundCategory === 'care') groundColor = '#ffaa00';

    if (groundColor) {
        // THE BULLETPROOF GLOW PANEL (Massive ceiling fluorescent)
        // This guarantees the color is visible even if the browser kills the PointLight!
        const panelMat = new THREE.MeshBasicMaterial({ color: '#222222' }); 
        const panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(bWidth * 0.8, bDepth * 0.8), panelMat);
        panelMesh.position.set(x, floorHeight - 0.05, z); // On the ceiling
        panelMesh.rotation.x = Math.PI / 2; // Facing down
        group.add(panelMesh);

        const roomLight = new THREE.PointLight(groundColor, 12, 30, 1.5); 
        
        // Optional: Move the light slightly closer to the open street facade
        // (If overhangDir is 1, street is +Z. If -1, street is -Z)
        const streetOffset = (overhangDir === 1) ? 2.0 : -2.0;
        roomLight.position.set(x, floorHeight - 1.0, z + streetOffset); 
        
        roomLight.visible = false; 
        group.add(roomLight);

        relationalLights.push({
            light: roomLight,
            bulbMat: panelMat, // Controls the massive ceiling panel
            activeColor: groundColor,
            category: groundCategory,
            offset: (Math.random() - 0.5) * 1.0
        });
    }

    // --- 2. UPPER FLOORS ---
    const totalOverhangDepth = bDepth + overhangExtension; 
    const overhangZ = z + (overhangDir * (overhangExtension / 2));

    for (let f = 1; f < totalFloors; f++) {
        const currentFloorY = (floorHeight / 2) + (f * floorHeight);
        
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(bWidth, floorHeight, totalOverhangDepth), material);
        floorMesh.position.set(x, currentFloorY, overhangZ);
        floorMesh.castShadow = true;
        floorMesh.receiveShadow = true;

        const floorEdges = new THREE.LineSegments(new THREE.EdgesGeometry(floorMesh.geometry), edgeMat);
        floorMesh.add(floorEdges);

        group.add(floorMesh);

        // Upper Floor Lighting Logic (We leave this random because ~300 floors balances out nicely)
        let floorColor = null;
        let floorCategory = null;

        if (isFullTextile) {
            floorColor = '#ccffff'; 
            floorCategory = 'textile';
        } else if (Math.random() < 0.25) { 
            const isCare = Math.random() < 0.7; // 70/30 split
            floorColor = isCare ? '#ffaa00' : '#ccffff';
            floorCategory = isCare ? 'care' : 'textile';
        }

        if (floorColor) {
            const windowMat = new THREE.MeshBasicMaterial({ color: '#222222' }); 
            const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(bWidth * 0.8, floorHeight * 0.6), windowMat);
            
            const streetSideOffset = overhangDir === 1 ? (totalOverhangDepth / 2 + 0.02) : -(totalOverhangDepth / 2 + 0.02);
            windowMesh.position.set(x, currentFloorY, overhangZ + streetSideOffset);
            
            if (overhangDir === -1) windowMesh.rotation.y = Math.PI;
            group.add(windowMesh);

            relationalWindows.push({
                mat: windowMat,
                activeColor: floorColor,
                category: floorCategory,
                
            });
        }
    }

    scene.add(group);
}

buildCity();

/**
 * 4. Objects & Audio Setup
 */
const listener = new THREE.AudioListener();

// --- THE SOFA ---
const sweepingSound = new THREE.PositionalAudio(listener);
sweepingSound.setRefDistance(2); 

audioLoader.load('./sound/sweeping.wav', (buffer) => {
    sweepingSound.setBuffer(buffer);
    sweepingSound.setLoop(true);
    sweepingSound.setVolume(0); 
    sweepingSound.play(); 
});

const chattingSound = new THREE.PositionalAudio(listener);
chattingSound.setRefDistance(2);

audioLoader.load('./sound/chatting.wav', (buffer) => {
    chattingSound.setBuffer(buffer);
    chattingSound.setLoop(true);
    chattingSound.setVolume(0); 
    chattingSound.play(); 
});

function loadModel(url) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(url, resolve, undefined, reject);
    });
}

async function setupFurniture() {
    try {
        const [model1, model2, model3, model4] = await Promise.all([
            loadModel('./models/chair.glb'),
            loadModel('./models/office_chair.glb'),
            loadModel('./models/plastic_chair.glb'),
            loadModel('./models/woodchair.glb')
        ]);

        // --- SETUP CHAIR 1 (plastic chair) ---
        const chair1 = model1.scene;
        chair1.position.set(0.5, 0.0, 0.7);
        chair1.rotation.y =-Math.PI*2.75;
        chair1.scale.set(0.6, 0.6, 0.6);
        
        chair1.traverse((child) => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        
        scene.add(chair1);
        
        // Attach your audio to the Bamboo Sofa at the entrance
        chair1.add(sweepingSound);
        chair1.add(chattingSound);


        // --- SETUP CHAIR 2 (Office Chair) ---
        const chair2 = model2.scene;
        chair2.position.set(-1.5, 0.5, 0.3); // Deeper in the alley
        chair2.rotation.y = Math.PI / 3;
        chair2.scale.set(0.6, 0.6, 0.6);
        chair2.traverse((child) => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        
        scene.add(chair2);


        // --- SETUP CHAIR 3 (Plastic Stool) ---
        const chair3 = model3.scene;
        chair3.position.set(-1.0, 0.3, 0.7); // Near the cutting machine
        chair3.rotation.y = -Math.PI / 4;

        chair3.scale.set(0.1, 0.1, 0.1);
        
        chair3.traverse((child) => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        
        scene.add(chair3);

        // --- SETUP CHAIR 4 (wood chair) ---
        const chair4 = model4.scene;
        chair4.position.set(0.0, 0.0, 0.2); // Near the cutting machine
        chair4.rotation.y = -Math.PI / 4;

        chair4.scale.set(0.6, 0.6, 0.6);
        
        chair4.traverse((child) => {
            if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        
        scene.add(chair4);

    } catch (error) {
        console.error("Error loading a 3D model: ", error);
    }
}

setupFurniture();

// --- THE CUTTING MACHINE ---
const machineSound = new THREE.PositionalAudio(listener);
machineSound.setRefDistance(3);

audioLoader.load('./sound/machine.flac', (buffer) => {
    machineSound.setBuffer(buffer);
    machineSound.setLoop(true);
    machineSound.setVolume(0); 
    machineSound.play();
});

gltfLoader.load('./models/machine.glb', (gltf) => {
    const loadedMachine = gltf.scene;
    loadedMachine.position.set(-22, 0.6, -5); 
    loadedMachine.rotation.y = -Math.PI/2;
    loadedMachine.scale.set(0.6, 0.6, 0.6)
    scene.add(loadedMachine);
    loadedMachine.add(machineSound); 

    // --- ANIMATION SETUP ---
    if (gltf.animations && gltf.animations.length > 0) {
        machineMixer = new THREE.AnimationMixer(loadedMachine);
        machineAction = machineMixer.clipAction(gltf.animations[0]);
        machineAction.play(); 
        machineAction.paused = true; 
    }
});


/**
 * 5. Lighting (The Sun & Atmosphere)
 */
const hemiLight = new THREE.HemisphereLight('#1a2b4c', '#444444', 0.5); 
scene.add(hemiLight);

const sun = new THREE.DirectionalLight('#ffaa55', 0); 
sun.castShadow = true;

const shadowSize = 150; 
sun.shadow.camera.left = -shadowSize; 
sun.shadow.camera.right = shadowSize;
sun.shadow.camera.top = shadowSize; 
sun.shadow.camera.bottom = -shadowSize;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 300; 

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.bias = -0.0005;

scene.add(sun);

const colorDawn = new THREE.Color('#ffaa55'); 
const colorMidday = new THREE.Color('#ffffff'); 
const colorNightSky = new THREE.Color('#1a2b4c'); 
const colorDaySky = new THREE.Color('#87CEEB'); 


/**
 * 6. Time Logic & State Management
 */
let timeOfDay = 6.0; 
let isPlaying = false;

// --- CINEMATIC CAMERA STATE ---
// Declared here to avoid Temporal Dead Zone errors
let targetCameraPos = null;
let targetControlsLookAt = null;

// --- CUSTOM RELATIONAL LIGHTING SCHEDULES ---
const careLightStart = 18.0; 
const careLightEnd = 24.0;    

const textileLightStart = 18.0;
const textileLightEnd = 4.0;

// --- UPDATE: The Start Button Logic ---
document.getElementById('start-btn').addEventListener('click', () => {
    if (listener.context.state === 'suspended') {
        listener.context.resume();
    }
    document.getElementById('start-btn').style.display = 'none';
    
    // Show the dashboard and the new toggle button!
    document.getElementById('controls').style.display = 'flex';
    document.getElementById('toggle-ui-btn').style.display = 'block'; 
});


// --- NEW: The Dashboard Toggle Logic ---
const uiToggleBtn = document.getElementById('toggle-ui-btn');
const controlsDash = document.getElementById('controls');

uiToggleBtn.addEventListener('click', () => {
    // This adds/removes the 'collapsed' class we made in the CSS
    controlsDash.classList.toggle('collapsed');
    
    // Change the text based on whether it is hidden or showing
    if (controlsDash.classList.contains('collapsed')) {
        uiToggleBtn.innerText = 'Show Dashboard';
    } else {
        uiToggleBtn.innerText = 'Hide Dashboard';
    }
});

const slider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
const playBtn = document.getElementById('play-pause-btn');

slider.value = timeOfDay;

slider.addEventListener('input', (e) => { timeOfDay = parseFloat(e.target.value); });
playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playBtn.innerText = isPlaying ? "Pause" : "Play";
});

const keys = { w: false, a: false, s: false, d: false, up: false, down: false, left: false, right: false };

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') keys.w = true;
    if (key === 's' || key === 'arrowdown') keys.s = true;
    if (key === 'a' || key === 'arrowleft') keys.a = true;
    if (key === 'd' || key === 'arrowright') keys.d = true;
});

window.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') keys.w = false;
    if (key === 's' || key === 'arrowdown') keys.s = false;
    if (key === 'a' || key === 'arrowleft') keys.a = false;
    if (key === 'd' || key === 'arrowright') keys.d = false;
});

function updateEnvironment() {
    const hours = Math.floor(timeOfDay);
    const mins = Math.floor((timeOfDay - hours) * 60);
    timeDisplay.innerText = `Time: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    const sunrise = 4.0;  
    const sunset = 20.5;  
    
    let sunAngle = 0;

    if (timeOfDay >= sunrise && timeOfDay <= sunset) {
        const daylightDuration = sunset - sunrise;
        sunAngle = ((timeOfDay - sunrise) / daylightDuration) * Math.PI;
    } else {
        sunAngle = -Math.PI / 2; 
    }
    
    const latitudeTilt = 23 * (Math.PI / 180); 
    const orbitRadius = 30;

    sun.position.x = Math.cos(sunAngle) * orbitRadius; 
    sun.position.y = Math.sin(sunAngle) * orbitRadius * Math.cos(latitudeTilt);
    sun.position.z = Math.sin(sunAngle) * orbitRadius * Math.sin(latitudeTilt); 

    const normalizedHeight = Math.max(0, Math.sin(sunAngle));
    if (normalizedHeight > 0) {
        sun.intensity = normalizedHeight * 7; 
        sun.color.lerpColors(colorDawn, colorMidday, normalizedHeight);
        
        const ambientCurve = Math.sqrt(normalizedHeight); 
        hemiLight.intensity = 0.5 + (ambientCurve * 2.5); 
        hemiLight.color.lerpColors(colorNightSky, colorDaySky, ambientCurve);
    } else {
        sun.intensity = 0; 
        hemiLight.intensity = 0.3; 
        hemiLight.color.copy(colorNightSky); 
    }

    const isSweeping = (timeOfDay >= 4 && timeOfDay < 8);
    if (sweepingSound.isPlaying) {
        const targetVol = isSweeping ? 1 : 0;
        sweepingSound.setVolume(THREE.MathUtils.lerp(sweepingSound.getVolume(), targetVol, 0.1));
    }

    const isChatting = (timeOfDay >= 6 && timeOfDay < 12) || 
                       (timeOfDay >= 14 && timeOfDay < 24);
    if (chattingSound.isPlaying) {
        const targetVol = isChatting ? 1 : 0;
        chattingSound.setVolume(THREE.MathUtils.lerp(chattingSound.getVolume(), targetVol, 0.1));
    }

    const machineActive = (timeOfDay >= 0 && timeOfDay < 4) ||  
                          (timeOfDay >= 9 && timeOfDay < 13) || 
                          (timeOfDay >= 14 && timeOfDay < 24);
                          
    if (machineSound.isPlaying) {
        const targetVol = machineActive ? 1 : 0;
        machineSound.setVolume(THREE.MathUtils.lerp(machineSound.getVolume(), targetVol, 0.1));
    }

    if (machineAction !== null) {
        machineAction.paused = false; 
        const currentVolume = machineSound.getVolume();
        machineAction.timeScale = currentVolume;

        if (currentVolume < 0.01) {
            machineAction.paused = true;
        }
    }

    const isCareTime = (timeOfDay >= careLightStart && timeOfDay < careLightEnd);
    const isTextileTime = (timeOfDay >= textileLightStart || timeOfDay < textileLightEnd);

    relationalLights.forEach(item => {
        let isOn = false;
        if (item.category === 'care') isOn = isCareTime;
        else if (item.category === 'textile') isOn = isTextileTime;

        if (isOn) {
            item.light.visible = true;
            item.bulbMat.color.set(item.activeColor); 
        } else {
            item.light.visible = false;
            item.bulbMat.color.set('#222222'); 
        }
    });

    relationalWindows.forEach(item => {
        let isOn = false;
        if (item.category === 'care') isOn = isCareTime;
        else if (item.category === 'textile') isOn = isTextileTime;

        if (isOn) {
            item.mat.color.set(item.activeColor); 
        } else {
            item.mat.color.set('#222222'); 
        }
    });
}

/**
 * 7. Camera & Renderer
 */
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.set(10, 1.6, 0); 
camera.add(listener); 
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(9.5, 1.6, 0.0);

const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/**
 * 8. Animation Loop
 */
const clock = new THREE.Clock();

const tick = () => {
    const deltaTime = clock.getDelta();

    if (machineMixer !== null) {
        machineMixer.update(deltaTime);
    }

    if (isPlaying) {
        timeOfDay += deltaTime * 0.5; 
        if (timeOfDay >= 24) timeOfDay = 0;
        slider.value = timeOfDay;
    }

    updateEnvironment();
    
    // --- Cinematic Camera Glide Logic ---
    if (targetCameraPos && targetControlsLookAt) {
        camera.position.lerp(targetCameraPos, 0.05);
        controls.target.lerp(targetControlsLookAt, 0.05);
        
        if (camera.position.distanceTo(targetCameraPos) < 0.1) {
            targetCameraPos = null; 
        }
    }

    // --- Walking Logic ---
    const walkSpeed = 4.0 * deltaTime; 
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; 
    direction.normalize(); 

    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(camera.up, direction).normalize();

    if (keys.w) {
        camera.position.addScaledVector(direction, walkSpeed);
        controls.target.addScaledVector(direction, walkSpeed);
    }
    if (keys.s) {
        camera.position.addScaledVector(direction, -walkSpeed);
        controls.target.addScaledVector(direction, -walkSpeed);
    }
    if (keys.a) {
        camera.position.addScaledVector(rightVector, walkSpeed);
        controls.target.addScaledVector(rightVector, walkSpeed);
    }
    if (keys.d) {
        camera.position.addScaledVector(rightVector, -walkSpeed);
        controls.target.addScaledVector(rightVector, -walkSpeed);
    }

    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
});

tick();

/**
 * 9. Cinematic Camera Controls
 */
// Grab the empty container we built in the HTML
const cameraPane = document.getElementById('camera-pane');

function createCamButton(text, camPos, lookAtPos) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.className = 'ui-btn'; // Attach the sleek CSS class we just made!
    
    btn.onclick = () => {
        targetCameraPos = new THREE.Vector3(...camPos);
        targetControlsLookAt = new THREE.Vector3(...lookAtPos);
    };
    
    // Inject it into the unified dashboard
    cameraPane.appendChild(btn);
}

// target shots: [Camera X, Y, Z], [LookAt X, Y, Z]
createCamButton('Textile Workshop', [-18, 1.6, 5.0], [-18, 1.6, -2.0]); 
createCamButton('Gathering Spot', [4.0, 1.6, 0.0], [0.5, 0.0, 1.5]);
createCamButton('Look Up (Skyline)', [-2, 0.5, 0.0], [-15.0, 5.0, 0.0]);
createCamButton('God View', [-15.0, 100.0, 0.0], [-15.0, 0.0, 0.0]);