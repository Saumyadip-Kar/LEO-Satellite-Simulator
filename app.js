import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { TextGeometry } from 'jsm/geometries/TextGeometry.js';
import { FontLoader } from 'jsm/loaders/FontLoader.js';
import { DecalGeometry } from "jsm/geometries/DecalGeometry.js";
import * as TableUtils from "./tableutils.js"
// // import { max } from "d3";


// import * as THREE from "three";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
// import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
// import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

// import * as TableUtils from "./tableutils.js";

// Parameters
var surfaceImagePath = "./Texture/ColorMap.jpg"; // Provide a valid image path, I'm using an equilateral / spherical projection of earth
var WorldMap = "./Texture/ColorMap.jpg"
var rotationSpeed = 500;
var rotationSmootheningFactor = 0.000001; 
var zoomSmootheningFactor = 0.001
var earthRadius = 5;
var earthDetail = 256;
var extraElevation = .5; // A bias defined for better simulation, increases satellite height, to get original make it 0
var delta = 0
var now = new Date();
var areaMask = new THREE.Mesh();
var simulationSpeed = document.getElementById("simulation-speed").value;
//var modes = ["simulation", "default", "scheduling"];
var currentMode = "default";
var comDist = 100; //In KM Changable
var fps = 60; //Maximum range depends on the system, I am setting it 60
//var trackInterval = 60; //The time interval in miliseconds after which the next collection and communication opportunity wil be tracked, reducing its value will increase computation if the no of satellites, GS and subregions are more
// The actual rotation speed would be rotationSpeed * rotationSmootheningFactor
var precision = 3;
var tess_grid_size = 20;

const gridInput = document.getElementById("grid-size");

gridInput.addEventListener("input", () => {
    // parse the value and clamp it to min/max just in case
    const value = parseInt(gridInput.value);
    const min = parseInt(gridInput.min);
    const max = parseInt(gridInput.max);

    tess_grid_size = Math.min(Math.max(value, min), max);

    addLog("Updated grid size: "+tess_grid_size);
});

const panelsContainer = document.getElementById('panels-container');
// Initial dimensions
let leftPanelWidth = panelsContainer.clientWidth / 2 - 5;
let rightPanelWidth = panelsContainer.clientWidth / 2 - 5;
let panelHeight = panelsContainer.clientHeight;

// Three.js setup for the left panel (3D view)
const leftPanelScene = new THREE.Scene();
const leftPanelCamera = new THREE.PerspectiveCamera(75, leftPanelWidth / panelHeight, 0.1, 1000);
const leftPanelRenderer = new THREE.WebGLRenderer({ antialias: true });
leftPanelRenderer.setSize(leftPanelWidth, panelHeight);
document.getElementById('left-panel').appendChild(leftPanelRenderer.domElement);


leftPanelRenderer.toneMapping = THREE.ACESFilmicToneMapping;
leftPanelRenderer.outputColorSpace = THREE.LinearSRGBColorSpace;

var orbitControls = new OrbitControls(leftPanelCamera, leftPanelRenderer.domElement);
orbitControls.minDistance = 5.1;
orbitControls.zoomSpeed = 1; //Need to add user customization

//To resize the left panel scene

function resizeLeft() {
    const leftPanel = document.getElementById('left-panel');
    if (leftPanelRenderer && leftPanelCamera) {
        leftPanelCamera.aspect = leftPanel.offsetWidth / leftPanel.offsetHeight;
        leftPanelCamera.updateProjectionMatrix();
        leftPanelRenderer.setSize(leftPanel.offsetWidth, leftPanel.offsetHeight);
    }
}

//Initial setup
window.onload = () => {
    //initThreeJS();
    resizeLeft();
};

//Resize event
window.addEventListener('resize', resizeLeft);


//Adding earth
const earthObjects = new THREE.Group();
leftPanelScene.add(earthObjects);

const earthGeometry = new THREE.SphereGeometry(earthRadius, earthDetail, earthDetail);

const loader = new THREE.TextureLoader();
const earthMaterial  = new THREE.MeshPhongMaterial({
    map: loader.load("./Texture/ColorMap.jpg"),
    specularMap: loader.load("./Texture/earthspec1k.jpg"),
    bumpMap: loader.load("./Texture/earthbump1k.jpg"),
    bumpScale: 0.1,
    displacementMap: loader.load("./Texture/earthbump1k.jpg"),
    displacementScale: 0 //Setting it non-zero will remove the night lights
  }); 
earthMaterial.map.colorSpace = THREE.SRGBColorSpace;

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earthObjects.add(earth);

earthObjects.add(areaMask);

const sunLight = new THREE.DirectionalLight(0xffffff, 10);
sunLight.target = earth
sunLight.position.set(-2,0.5,1.5)
leftPanelScene.add(sunLight);

leftPanelCamera.position.z = 10;


const raycaster = new THREE.Raycaster();


function isMeshLitBySun(mesh, earth, sunLight) {
    //Light direction: from Earth toward sunLight
    const lightDir = new THREE.Vector3().subVectors(sunLight.position, sunLight.target.position).normalize();

    //Cast ray from mesh towards the Sun
    const origin = mesh.getWorldPosition(new THREE.Vector3());
    // console.log("Origin: ", origin)
    raycaster.set(origin, lightDir);

    //Check if ray hits Earth before reaching the Sun
    const intersects = raycaster.intersectObject(earth, true);
    //If intersection exists, the object is in Earth's shadow
    return intersects.length === 0;
}


//Additional Details for earth

//Night Lights
const nightLightsMaterial = new THREE.MeshBasicMaterial({
    map: loader.load("./Texture/earthlights1k.jpg"),
    blending: THREE.AdditiveBlending
});

const nightLights = new THREE.Mesh(earthGeometry, nightLightsMaterial);
earthObjects.add(nightLights);

//Clouds
const cloudMatertial = new THREE.MeshStandardMaterial({
    map: loader.load("./Texture/earthcloudmap.jpg"),
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    alphaMap: loader.load('./Texture/earthcloudmaptransparent.jpg'),
});

const clouds = new THREE.Mesh(earthGeometry, cloudMatertial);
clouds.scale.setScalar(1.01);
earthObjects.add(clouds);


//To let the user tweak the visuals
clouds.visible = true;
nightLights.visible = true;
sunLight.intensity = 10;


// Helper function to convert degrees to radians
function toRadians(angle) {
    return angle * (Math.PI / 180);
}

// Divider dragging functionality
// const divider = document.getElementById('divider');
// let isDraggingDivider = false;

// divider.addEventListener('mousedown', (event) => {
//     isDraggingDivider = true;
// });

// document.addEventListener('mousemove', (event) => {
//     if (isDraggingDivider) {
//         const newLeftPanelWidth = event.clientX - divider.offsetWidth / 2;
//         // const newRightPanelWidth = panelsContainer.clientWidth - newLeftPanelWidth - divider.offsetWidth;

//         if (newLeftPanelWidth > 0 && newRightPanelWidth > 0) {
//             leftPanelWidth = newLeftPanelWidth;
//             // rightPanelWidth = newRightPanelWidth;

//             document.getElementById('left-panel').style.width = `${leftPanelWidth}px`;
//             document.getElementById('right-panel').style.width = `${rightPanelWidth}px`;

//             leftPanelRenderer.setSize(leftPanelWidth, panelHeight);
//             leftPanelCamera.aspect = leftPanelWidth / panelHeight;
//             leftPanelCamera.updateProjectionMatrix();

//             // rightPanelRenderer.setSize(rightPanelWidth, panelHeight);
//             // rightPanelCamera.left = -rightPanelWidth / 2;
//             // rightPanelCamera.right = rightPanelWidth / 2;
//             // rightPanelCamera.updateProjectionMatrix();
//         }
//     }
// });

// document.addEventListener('mouseup', () => {
//     isDraggingDivider = false;
// });









//Controls

document.getElementById('rotation-speed').addEventListener('input', function(event) {
    rotationSpeed = event.target.value;
});

document.getElementById('extra-elevation').addEventListener('input', function(event) {
    extraElevation = event.target.value / 100;
});

document.getElementById('sunlight-intensity').addEventListener('input', function(event) {
    sunLight.intensity = event.target.value / 50;
});

document.getElementById('show-clouds').addEventListener('change', function() {
    if (this.checked) {
        clouds.visible = true;
        document.getElementById('clouds-height').disabled = false;
        document.getElementById('clouds-opacity').disabled = false;
    }
    else {
        clouds.visible = false;
        document.getElementById('clouds-height').disabled = true;
        document.getElementById('clouds-opacity').disabled = true;
    }
});


document.getElementById('clouds-opacity').addEventListener('input', function(event) {
    cloudMatertial.opacity = event.target.value / 100;
});

document.getElementById('clouds-height').addEventListener('input', function(event) {
    clouds.scale.setScalar(1 + event.target.value / 1000);
});

document.getElementById('night-lights').addEventListener('change', function() {
    if (this.checked) nightLights.visible = true;
    else nightLights.visible = false;
});


let clock = new THREE.Clock();

// Rendering loop for both panels
function animate() {
    requestAnimationFrame(animate);
    animateSatellite();
    updateGSproperties();
    updateRegionproperties();


    updateDateTime();
    
    //console.log(deltaTime);
    // Rotate the Earth continuously
    earthObjects.rotation.y += rotationSpeed * rotationSmootheningFactor;

    // Update satellite positions
    //updateSatellite();

    // Render the left panel (3D view)
    leftPanelRenderer.render(leftPanelScene, leftPanelCamera);
    if(currentMode == "simulation"){ 
        trackCommunication();
        trackCollection();
    }
}


//setInterval(() => { }, trackInterval); //To do certain things, after each trackInterval miliseconds

function updateDateTime(){
    let deltaTime = clock.getDelta();
    delta += deltaTime * simulationSpeed;
    if(delta >= 1){
        now.setSeconds(now.getSeconds()+delta);
        delta = 0;
    }
    document.getElementById("datetime").textContent = String(now);
}

document.getElementById("simulation-speed").addEventListener("input", (event) =>{
    simulationSpeed = event.target.value;
    document.getElementById("simulation-speed-label").textContent = simulationSpeed+"x";
});



//For Right Panel Canvas

const colors = [];

// Generate random colors for each face
// console.log(earth.geometry.attributes.position.array); //Vertex Positions
// console.log(earth.geometry.index); //Triangular Positions


//var newWindow = window.open();
//newWindow.document.write('<div id="canvasContainer"> <canvas id="drawingCanvas"></canvas></div>');
//newWindow.document.title = "World Map";


const canvasNewTab = document.getElementById("canvasNewTab")
canvasNewTab.addEventListener("click",(event)=>{
    // newWindow = window.open();

    // // Get the data URL of the canvas
    // const dataUrl = canvas.toDataURL();

    // // Set the content of the new window
    // newWindow.document.write('<div id="canvasContainer"> <canvas id="drawingCanvas"></canvas></div>');
    // newWindow.document.title = "World Map";
    // canvas = newWindow.document.getElementById('drawingCanvas');
    // context = canvas.getContext('2d');

    // // Optionally, you can pass a reference to the original canvas
    // //newWindow.originalCanvas = canvas;
});

var canvas = document.getElementById('drawingCanvas');
var context = canvas.getContext('2d');
const updateAreaButton = document.getElementById('applyCanvas');

let drawing = false;
let currentPolygon = [];
let polygons = [];
let tessellatedPolygons = [];

    // Start drawing a polygon
canvas.addEventListener('mousedown', (event) => {
    if(canvasMode != "AreaSelection") return;
    if (!drawing) {
        drawing = true;
        currentPolygon = [];
        addLog("Press Left Mouse Button to add vertices and at the Final Vertex press Right Mouse Button")
    }
    const x = event.offsetX;
    const y = event.offsetY;
    currentPolygon.push({x,y});
    redraw();
});

    // Finish drawing the current polygon on right click
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (drawing) {
    polygons.push(currentPolygon);
    drawing = false;
    currentPolygon = [];
    redraw();
    addLog("New Area Created");
    }
});

    // Redraw the polygons
function redraw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.lineWidth = 2;
    context.strokeStyle = '#000000';
    context.fillStyle = 'rgba(255, 0, 0, 0.5)';
    
    polygons.forEach(polygon => {
        drawPolygon(polygon);
    });

    if (currentPolygon.length > 0) {
        drawPolygon(currentPolygon);
    }
}

    // Draw a single polygon
function drawPolygon(polygon) {
    if (polygon.length < 2) return;

    context.beginPath();
    context.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) {
        context.lineTo(polygon[i].x, polygon[i].y);
    }
    context.closePath();
    context.fill();
    context.stroke();
}




//For tessellation

const ctx = canvas.getContext('2d');
// Array to store center points of the subregions
var centerPoints = [];

// Function to draw grid
function drawGrid(ctx, width, height, gridSize) {
    ctx.strokeStyle = '#ff000000'; //Transparent
    for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

// Function to check if a point is inside a polygon
function isPointInPolygon(point, vertices) {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        let xi = vertices[i][0], yi = vertices[i][1];
        let xj = vertices[j][0], yj = vertices[j][1];
        let intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Function to get intersection of a grid cell with the polygon
function getGridCellPolygonIntersection(gridX, gridY, gridSize, vertices) {
    const cellVertices = [
        [gridX, gridY],
        [gridX + gridSize, gridY],
        [gridX + gridSize, gridY + gridSize],
        [gridX, gridY + gridSize]
    ];

    // A simple polygon clipping algorithm can be used here, like the Sutherland-Hodgman algorithm
    return polygonClip(cellVertices, vertices);
}

// Function to clip a polygon (Sutherland-Hodgman algorithm)
function polygonClip(subjectPolygon, clipPolygon) {
    let outputList = subjectPolygon;
    let cp1, cp2, s, e;
    for (let j = 0; j < clipPolygon.length; j++) {
        cp1 = clipPolygon[j];
        cp2 = clipPolygon[(j + 1) % clipPolygon.length];
        let inputList = outputList;
        outputList = [];
        s = inputList[inputList.length - 1];
        for (let i = 0; i < inputList.length; i++) {
            e = inputList[i];
            if (inside(e, cp1, cp2)) {
                if (!inside(s, cp1, cp2)) {
                    outputList.push(intersection(cp1, cp2, s, e));
                }
                outputList.push(e);
            } else if (inside(s, cp1, cp2)) {
                outputList.push(intersection(cp1, cp2, s, e));
            }
            s = e;
        }
    }
    return outputList;
}

function inside(p, cp1, cp2) {
    return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * (p[0] - cp1[0]);
}

function intersection(cp1, cp2, s, e) {
    const dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]];
    const dp = [s[0] - e[0], s[1] - e[1]];
    const n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0];
    const n2 = s[0] * e[1] - s[1] * e[0];
    const n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
    return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3];
}

// Function to calculate the centroid of a polygon
function calculateCentroid(vertices) {
    let x = 0, y = 0, area = 0;
    for (let i = 0; i < vertices.length; i++) {
        let j = (i + 1) % vertices.length;
        let factor = (vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1]);
        x += (vertices[i][0] + vertices[j][0]) * factor;
        y += (vertices[i][1] + vertices[j][1]) * factor;
        area += factor;
    }
    area /= 2;
    x /= (6 * area);
    y /= (6 * area);
    return [x,y];
}

// Function to get a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    color += "CC"; //opacity - 80%
    return color;
}



// Function to draw points at the center of the grid cells inside the polygon
function drawPointsInPolygon(ctx, vertices, gridSize) {
    ctx.fillStyle = 'blue';
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            let gridCellPolygon = getGridCellPolygonIntersection(x, y, gridSize, vertices);
            if (gridCellPolygon.length > 0) {
                let centroid = calculateCentroid(gridCellPolygon);
                centerPoints.push(centroid);

                // Fill the grid cell with a random color
                ctx.fillStyle = getRandomColor();
                ctx.beginPath();
                ctx.moveTo(gridCellPolygon[0][0], gridCellPolygon[0][1]);
                for (let i = 1; i < gridCellPolygon.length; i++) {
                    ctx.lineTo(gridCellPolygon[i][0], gridCellPolygon[i][1]);
                }
                ctx.closePath();
                ctx.fill();

                // Draw the center point
                ctx.fillStyle = 'blue';
                ctx.beginPath();
                ctx.arc(centroid[0], centroid[1], 1, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
}

document.getElementById("subdivide").addEventListener("click",()=>{
    drawGrid(ctx, canvas.width, canvas.height, tess_grid_size);

    centerPoints.splice(0,centerPoints.length);

    for(let p=0; p<polygons.length; p++){
        let vertices = [];
        for(let i=0; i<polygons[p].length; i++) vertices.push([polygons[p][i].x, polygons[p][i].y]);
        drawPointsInPolygon(ctx, vertices, tess_grid_size);
        
     }
});






    // Save the canvas as an image
updateAreaButton.addEventListener('click', () => {
    updateArea();
});

function updateArea(){
    console.log(subRegions);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    //link.download = 'new_mask.png';
    //link.click(); //For downloading the image

    
    // Create a new image object
    const image = new Image();
    image.src = link.href;

    image.onload = function() {
        // Create a Three.js texture using the image
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create a material with the texture
        let maskMat = new THREE.MeshBasicMaterial({
            map: texture,
            blending: THREE.AdditiveBlending
        });

        const mask1 = new THREE.Mesh(earthGeometry, maskMat);
        mask1.scale.setScalar(1.001);
        areaMask.removeFromParent();
        areaMask = mask1;
        earthObjects.add(areaMask);
    }
    if(centerPoints.length>0) {
        deleteSubregions();
        createSubRegions();
    }
    //else if(centerPoints.length==0 && subRegions.length>0) deleteSubregions();
}


    // Helper function to clear the context
function clearCanvas() {
    if(polygons.length>0){
    polygons.splice(0,polygons.length);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    }
}
    




// Initial clear
//clearCanvas();



document.getElementById("clearCanvasArea").addEventListener("click",()=>{
    if(drawing==true){
        addLog("The last polygon is not drawn, press Right Mouse Button on the final vertex to complete it");
        return;
    }
    clearCanvas();
    areaMask.removeFromParent();
    centerPoints.splice(0,centerPoints.length);
    deleteSubregions();
    
    
    addLog("⛔ Area Deleted");
});






class SubRegion{
    constructor(Name, Position = {x:0,y:0,z:0}, latitude, longitude)
    {
       this.name = Name;
       this.meshGroup = new THREE.Group();
       this.meshGroup.position.set(Position.x, Position.y, Position.z); //For plotting the locatin in the 3D earth
       this.latitude = latitude //Actual latitude for further use
       this.longitude = longitude //Actual longitude for further use
    }
    
    showMeshGroup(){
        loadName(this, this.name);
        earthObjects.add(this.meshGroup);
    }

    removeMeshGroup(){
        //earthObjects.remove(this.meshGroup);
        this.meshGroup.removeFromParent();
    }
}

var subRegions = [];

function add_area(R){
    R.showMeshGroup();
    subRegions.push(R);
}

//To create subregions from center points
function createSubRegions(area_id = "A-"){
    for(let i=0; i<centerPoints.length; i++){
        let lat_long =  pointToLatLng(centerPoints[i][0],centerPoints[i][1],canvas.offsetWidth,canvas.offsetHeight);
        let location3D = latLongTo3DPoint(lat_long.latitude, lat_long.longitude, earthRadius);
        let R = new SubRegion(area_id+"-"+(i+1), location3D, lat_long.latitude, lat_long.longitude);
        add_area(R);
    }
}

function deleteSubregions(){
    for(let i=0; i<subRegions.length; i++) subRegions[i].removeMeshGroup();
    subRegions.splice(0,subRegions.length);
}


function updateRegionproperties(){
    for(let i=0; i<subRegions.length; i++) subRegions[i].meshGroup.lookAt(leftPanelCamera.position);
}


/*
Latitude Range  -90 to 90
Longitude Range  -180 to 180
*/

var canvasMode ="AreaSelection";

updateGroundStations.addEventListener('click', () => {
    if(canvasMode == "AreaSelection"){
        canvasMode = "GroundStationSelection";
        canvas.style.cursor = "crosshair";
    }
    else{ 
        canvasMode = "AreaSelection";
        canvas.style.cursor = "default";
    }
});












//Defining a constellation of satellites

//Sample TLE, I will add these dynamically with APIs

var tle1 ={
    tleLine1: '1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992',
    tleLine2: '2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442'
};

var tle2 ={
    tleLine1: '1 20580U 90037B   20288.75272396  .00001330  00000-0  63117-4 0  9993',
    tleLine2: '2 20580  28.4698 138.6703 0002656  16.4153  94.1190 15.09187213 55689'
};


//The object must have meshGroup variable in it
function loadName(obj, name, fontSize = 0.08, textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })){
    const fontLoader = new FontLoader();
        fontLoader.load('https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new TextGeometry(name,{
            font: font, size: fontSize, depth: 0, curveSegments: 12, 
            bevelEnabled: false, bevelThickness: 0, bevelSize: 0,  bevelOffset: 0,  bevelSegments: 0});

        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(0.08, 0.08, 0.5); // Position the text
        obj.meshGroup.add(textMesh);
    });
}

class LEO_Satellite{
    constructor(Name, TLE, Geometry = new THREE.BoxGeometry(.1, .1, .1), 
    Material = new THREE.MeshBasicMaterial({ color: 0xff0000 }))
    {
       this.name = Name;
       this.tleLine1 = TLE.tleLine1;
       this.tleLine2 = TLE.tleLine2; 
       this.mesh = new THREE.Mesh(Geometry, Material);
       this.meshGroup = new THREE.Group();
       this.meshGroup.add(this.mesh);
    }
    
    showMeshGroup(){
        loadName(this, this.name);
        earthObjects.add(this.meshGroup);
    }

    removeMeshGroup(){
        earthObjects.remove(this.meshGroup);
    }
}



//This is the complete data base of satellites

let satDataBase = [];
let satListControl = document.getElementById("satListControl")

// async function fetchData() {
//     try {
//        const response = await fetch('./celestrak_TLE_dataset.txt');
//         const data = await response.text();
//         let lines = data.split('\n');
//         for (let i = 0; i < lines.length; i += 3)
//             if (lines[i] && lines[i+1] && lines[i+2]) {
//                  satDataBase.push(new LEO_Satellite(lines[i].trim(), { tleLine1:lines[i+1].trim(), tleLine2: lines[i+2].trim()}));
//         }
//     } catch (error) {
//         console.error('Failed to fetch TLE data:', error);
//         return []; // Return an empty array to handle the errord
//     }
// }

var fetched = false;
var rawData = null;


async function fetchData(max = 20) {
    fetched = false;
    addLog("Fetching TLE data...");
    const localURL = './celestrak_TLE_dataset.txt';
        // console.warn('Celestrak unavailable, switching to local dataset...');
        //Fall back to local dataset
        try {
            const localResponse = await fetch(localURL);
            if (!localResponse.ok) throw new Error('Local fetch failed');
            
            const localData = await localResponse.text();
            rawData = localData;
            parseTLE(localData, max);
            console.log('Loaded from local dataset');
        } 
        catch (localErr) {
            console.error('Failed to load TLE data:', localErr);
}
}



function parseTLE(rawData, max = 20) {
    const lines = rawData.split('\n');
    const k = max; // ← set how many satellites you want to load, I am fetching only first 20 TLEs because there re too many, and not all can load
    let count = 0;

    for (let i = 0; i < lines.length && count < k; i += 3) {
        if (lines[i] && lines[i+1] && lines[i+2]) {
            satDataBase.push(new LEO_Satellite(
                lines[i].trim(),
                { tleLine1: lines[i+1].trim(), tleLine2: lines[i+2].trim() }
            ));
            count++;
        }
    }
    fetched = true;
    addLog("<Fetched TLE data>");
}


//Call the async function to fetch data (waits until data is fetched and satDataBase is updated)
fetchData(50).then(lines => {
    buildSatDBUI()
});

function buildSatDBUI(){
    let li = document.createElement('li');
    li.style.display = 'grid';
    let addAllButton = document.createElement('button');
    addAllButton.textContent = 'Add All';
    addAllButton.title = "Add all the satellites in the database to the current constellation"
    addAllButton.style.float = "left";
    addAllButton.style.padding = "0";
    addAllButton.style.width = "50px";
    addAllButton.onclick = function() {
        for(let i=0; i<satDataBase.length; i++) addNewSat(satDataBase[i].name, satDataBase[i].tleLine1, satDataBase[i].tleLine2);
    };

    // let refreshButton = document.createElement('button');
    // refreshButton.textContent = 'Refresh';
    // refreshButton.title = "Refetch the satellite data"
    // refreshButton.style.float = "left";
    // refreshButton.style.padding = "0";
    // refreshButton.style.width = "50px";
    // refreshButton.onclick = function(){
    //     //Delete all the added sats
    //     //Empty the satDataBase
    //     parseTLE(rawData, 4);
    //     buildSatDBUI();
    //     li.remove();
    // };

    li.appendChild(addAllButton);
    // li.appendChild(refreshButton);
    satListControl.appendChild(li);
    updateSatDB();
}



function updateSatDB(){
    for(let i=0; i<satDataBase.length; i++) {

        let li = document.createElement('li');
        li.style.display = 'grid';
        li.style.gridTemplateColumns = '1fr 1fr 1fr 1fr 1fr auto';
        li.style.gap = '2px';  // Add some spacing between columns
        li.style.alignItems = 'center';  // Align vertically


        let name = document.createElement('input');
        name.readOnly = true;
        name.type = "text";
        name.style.fontSize = "12px";
        name.value = String(satDataBase[i].name);

        let labl = document.createElement('label');
        labl.style.fontSize = "12px";
        labl.textContent = "TLE";

        let line1 = document.createElement('input');
        line1.type = "text";
        line1.readOnly = true;
        line1.style.fontSize = "12px";
        line1.value = String(satDataBase[i].tleLine1);

        let line2 = document.createElement('input');
        line2.readOnly = true;
        line2.type = "text";
        line2.style.fontSize = "12px";
        line2.value = String(satDataBase[i].tleLine2);
        
        

        let addButton = document.createElement('button');
        addButton.textContent = 'Add';
        addButton.title = "Add this satellite to the current constellation"
        addButton.style.float = "right";
        addButton.style.padding = "0";

        addButton.onclick = function() {
        addNewSat(String(name.value), String(line1.value), String(line2.value)) 
        };

        let copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.title = "Copy the values to edit and add a new satellite"
        copyButton.style.float = "right";
        copyButton.style.padding = "0";

        copyButton.onclick = function() {
            document.getElementById("sat-name").value = String(name.value);
            document.getElementById("tle-l1").value = String(line1.value);
            document.getElementById("tle-l2").value = String(line2.value);
        };

    // Append label and button to the li element
    li.appendChild(addButton);
    li.appendChild(copyButton);
    li.appendChild(name);
    li.appendChild(labl);
    li.appendChild(line1);
    li.appendChild(line2);
    

    satListControl.appendChild(li);
    }
}



//console.log(satDataBase); //This won't work as the data is not fetched as soon as page is loaded



// This is the current constellations

const Constellation = [
    //new LEO_Satellite("International Space Station", tle1),
    // new LEO_Satellite("Hubble Space Telescope", tle2),
    // new LEO_Satellite("NOAA 18", 
    //     {tleLine1: '1 28654U 05018A   20288.60832954  .00000161  00000-0  16979-4 0  9993',
    //     tleLine2: '2 28654  99.0976 101.7418 0012723  67.7765  38.7687 14.12446202680457'}),
    // new LEO_Satellite("COSMOS 2251 DEB", 
    //     {tleLine1: '1 35681U 93036A   20288.85227486  .00001352  00000-0  33291-3 0  9991',
    //     tleLine2: '2 35681  74.0438 187.9372 0022104  75.4643  48.6752 14.63062619670829'})
];

function add_to_orbit(sat){
    const index = Constellation.findIndex(_sat => _sat.name === sat.name);
    if(index == -1){
        sat.showMeshGroup();
        Constellation.push(sat);
        return true;
    }
    else{
        addLog("A satellite with the same name already exists");
        sat.meshGroup.removeFromParent();
        return false; //In case satellite with the same name already exits
    }
    
}

function remove_from_orbit(name = null, ind=-1){
    let index;
    if(ind !=-1 && typeof arr[index] !== 'undefined'){ 
        index = ind;
    } //Remove using index (Optional use)

    index = Constellation.findIndex(_sat => _sat.name === name);
    if(index != -1){  
        Constellation[index].removeMeshGroup();
        Constellation.splice(index, 1);
        return true;
    }
    return false; //In case satellite with the same name doesn't exist
}

function addNewSat(name, tle_line1, tle_line2){
    let added = add_to_orbit(new LEO_Satellite(name, {tleLine1: tle_line1, tleLine2: tle_line2}));
    if(added == false) return; //Already a Satellite Exist with the same name
    var li = document.createElement('li');
    li.style.display = 'grid';
    li.style.gridTemplateColumns = '3fr 1fr';
    li.style.gap = '2px';  // Add some spacing between columns
    li.style.alignItems = 'center';  // Align vertically
    var label = document.createElement('label');
    label.style.fontSize = "16px";
    label.textContent = String(name);

    var button = document.createElement('button');
    button.textContent = 'Remove';
    //button.style.float = "right";
    button.style.padding = "0";
    button.onclick = function() {
        let removed = remove_from_orbit(name);
        if(removed == false){
            return;//No Satellite with that name exist, it should never happen by my logic, still using it for debugging purpose if needed
        }
        li.remove();  // Remove the li element when the button is clicked
    };

    // Append label and button to the li element
    li.appendChild(label);
    li.appendChild(button);

    // Append the li element to the ul list
    var satList= document.getElementById('satList');
    satList.appendChild(li);
}

document.getElementById('add-sat').addEventListener("click",()=>{
    let name = document.getElementById("sat-name").value;
    let tleL1 = document.getElementById("tle-l1").value;
    let tleL2 = document.getElementById("tle-l2").value;
    addNewSat(name, tleL1, tleL2);
});

// document.getElementById('removeAll-sat').addEventListener("click",()=>{
//     for(let i=0; i<Constellation.length; i++) remove_from_orbit(ind=i);
// });

// add_to_orbit(new LEO_Satellite("International Space Station", tle1));

// add_to_orbit(new LEO_Satellite("Hubble Space Telescope", tle2));

// add_to_orbit(new LEO_Satellite("NOAA 18", 
//     {tleLine1: '1 28654U 05018A   20288.60832954  .00000161  00000-0  16979-4 0  9993',
//     tleLine2: '2 28654  99.0976 101.7418 0012723  67.7765  38.7687 14.12446202680457'}));

// add_to_orbit(new LEO_Satellite("COSMOS 2251 DEB", 
//     {tleLine1: '1 35681U 93036A   20288.85227486  .00001352  00000-0  33291-3 0  9991',
//     tleLine2: '2 35681  74.0438 187.9372 0022104  75.4643  48.6752 14.63062619670829'}));



console.log(Constellation);


//This is a function that returns the position (latitute, longitude [in degree],  height [in kilometer]) of the satellite from the given TLE
//Also returns the look angle if the position (lat, long in degree and height in KM) of the observer is provided
function findSatPos(tleLine1, tleLine2, observerPosition=null){
    var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    var positionAndVelocity = satellite.propagate(satrec, now);

    let positionEci = positionAndVelocity.position;
    
    if (positionEci){   
        let gmst = satellite.gstime(now);
        //console.log("GMST = ", gmst)
        let positionGd = satellite.eciToGeodetic(positionEci, gmst);
        let latitude = satellite.degreesLat(positionGd.latitude);
        let longitude = satellite.degreesLong(positionGd.longitude);
        let altitude = positionGd.height;
        let lookAngles = null;
        if(observerPosition !=null){
            var observerGd = {
                latitude: satellite.degreesToRadians(observerPosition.latitude),
                longitude: satellite.degreesToRadians(observerPosition.longitude),
                height: observerPosition.height
            };
            var positionEcf = satellite.eciToEcf(positionEci, gmst);
            lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
        }

        return {latitude:latitude, longitude:longitude, altitude:altitude, lookAngles:lookAngles};
    }
    else return null;
}


// Function to update satellite position
function animateSatellite() {
    // Calculate satellite position using TLE data
    for(let i=0; i<Constellation.length; i++){
        var sat = Constellation[i];
        var tleLine1 = sat.tleLine1;
        var tleLine2 = sat.tleLine2;
        
        
        let satpos = findSatPos(tleLine1, tleLine2);
        
        if(satpos){
            //console.log(satpos);
            let latitude = satpos.latitude;
            let longitude = satpos.longitude;
            let altitude = satpos.altitude;

            ///.................For debugging..............
            // if (sat.name=="ISS (ZARYA)"){
            //     console.log("Lat, Long, height = ", latitude, " ", longitude, " ", altitude);
            //     console.log(now)
            // }
            ///............................................

            let height = extraElevation + earthRadius + altitude / 6371; // Earth radius is approximately 6371 km

            let position = latLongTo3DPoint(latitude,longitude,height)

            sat.meshGroup.position.x = position.x;
            sat.meshGroup.position.y = position.y;
            sat.meshGroup.position.z = position.z;

            sat.meshGroup.lookAt(leftPanelCamera.position);
        }
        else console.log("TLE of ",sat.name," is invalid. Update the TLE to the latest version."), addLog("TLE of ",sat.name," is invalid. Update the TLE to the latest version.");    
    }
}




























//Working with ground stations
function pointToLatLng(x, y, imgWidth, imgHeight) {
    const long = (x / imgWidth) * 360 - 180;
    const lat = 90 - (y / imgHeight) * 180;
    return { latitude: lat, longitude: long };
}

function latLongTo3DPoint(lat, long, height = earthRadius){
    const latRad = THREE.MathUtils.degToRad(lat);
    const lonRad = THREE.MathUtils.degToRad(-long);
    const X = height * Math.cos(latRad) * Math.cos(lonRad);
    const Y = height * Math.sin(latRad);
    const Z = height * Math.cos(latRad) * Math.sin(lonRad);
    return {x:X, y:Y, z:Z};
}

canvas.addEventListener('click', (event) => {
    if (canvasMode == "GroundStationSelection") {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        //console.log(`Mouse click at (${x}, ${y})`);
       
        const lat_long =  pointToLatLng(x,y,canvas.offsetWidth,canvas.offsetHeight);
        //console.log("Lat-Long - ", lat_long);

        document.getElementById("GSlat").value = lat_long.latitude.toFixed(3);
        document.getElementById("GSlong").value = lat_long.longitude.toFixed(3);
    }
});

document.getElementById("addNewGS").addEventListener('click', () =>{
    let lat = document.getElementById("GSlat").value;
    let long = document.getElementById("GSlong").value;
    let name = document.getElementById("GSName").value;
    if(name && lat && long){
        if(lat<-90) lat = -90;
        if(lat>90) lat = 90;
        if(long<-180) long = -180;
        if(long>180) long = 180;
        addNewGS(name, lat, long);
    }
});


function addNewGS(name, lat, long) {

    let added = setupGS(new GroundStation(name, latLongTo3DPoint(lat, long), {lat,long}));
    if(added = false){
        return; //Already a Ground Station Exist with the same name
    } 

    var li = document.createElement('li');
    li.style.display = 'grid';
    li.style.gridTemplateColumns = '3fr 1fr';
    li.style.gap = '2px';  // Add some spacing between columns
    li.style.alignItems = 'center';  // Align vertically


    var label = document.createElement('input');
    label.type = "text";
    label.readOnly = true;
    label.style.fontSize = "13px";
    label.value = String(name) + ": Positions("+String(lat)+","+String(long)+")";
    
    

    var button = document.createElement('button');
    button.textContent = 'Remove';
    button.style.padding = "0";
    button.onclick = function() {
        let removed = removeGS(name);
        if(removed == false){
            return;//No GS with that name exist, it should never happen by my logic, still using it for debugging purpose if needed
        }
        li.remove();  // Remove the li element when the button is clicked
    };

    // Append label and button to the li element
    li.appendChild(label);
    li.appendChild(button);

    // Append the li element to the ul list
    var GSList= document.getElementById('GSList');
    GSList.appendChild(li);
    
}



class GroundStation{
    constructor(Name, Position = {x:0,y:0,z:0}, Position2 = {lat:0, long:0}, Geometry = new THREE.SphereGeometry(0.1, 16, 16), 
    Material = new THREE.MeshBasicMaterial({ color: 0xffff00 }))
    {
       this.name = Name;
       this.mesh = new THREE.Mesh(Geometry, Material);
       this.meshGroup = new THREE.Group();
       this.meshGroup.add(this.mesh);
       this.meshGroup.position.set(Position.x, Position.y, Position.z)
       this.latitude = Position2.lat;
       this.longitude = Position2.long;
    }
    
    showMeshGroup(){
        loadName(this, this.name);
        earthObjects.add(this.meshGroup);
    }

    removeMeshGroup(){
        earthObjects.remove(this.meshGroup);
    }
}


const GroundStations = [];

function setupGS(GS){
    const index = GroundStations.findIndex(_GS => _GS.name === GS.name);

    if(index == -1){  
        GS.showMeshGroup();
        GroundStations.push(GS);
        return true;
    }
    else{
        addLog("A Ground Station with the name "+GS.name+" already exists");
        GS.removeFromParent();
        return false;
    }
}

function removeGS(name){
    const index = GroundStations.findIndex(_GS => _GS.name === name);
    if(index != -1){  
        GroundStations[index].removeMeshGroup();
        GroundStations.splice(index, 1);
        return true;
    }
    return false;
}

function updateGSproperties(){
    for(let i=0; i<GroundStations.length; i++) GroundStations[i].meshGroup.lookAt(leftPanelCamera.position);
}




//Testing

for (let i = 1; i <= 20; i++) {
    const lat = (Math.random() * 180 - 90).toFixed(3);
    const long = (Math.random() * 360 - 180).toFixed(3);
    addNewGS("G-"+i, lat, long);
}





//For Adding Logs
function addLog(message, background_color="Yellow", element=null) {

    const logs = document.getElementById("outputList");

    var li = document.createElement('li');
    li.style.padding = "2px";
    li.style.marginLeft = "10px";
    li.style.marginRight = "10px";
    li.style.marginTop = "5px";

    li.style.backgroundColor = background_color;

    var label = document.createElement('label');

    label.textContent = message;
    label.style.fontSize = "16px";

    var button = document.createElement('button');
    button.textContent = 'Clear';
    
    button.style.float = "right";
    button.style.alignSelf = "bottom"
    button.style.padding = "0";
    button.onclick = function() {
        li.remove();  // Remove the li element when the button is clicked
    };
    li.appendChild(label);
    li.appendChild(button);

    if(element != null) li.appendChild(element);
    

    logs.appendChild(li);
    
}





//For storing simulation experiments and results
var Experiments = [];
var exp_index = 0;
var curr_start_time;
var curr_end_time;


//Collection and Communication Opprtunities

var communication_opportunities = [];
function trackCommunication() {
    for(let i=0; i<GroundStations.length; i++){
        for(let j=0; j<Constellation.length; j++){
            let satPos = Constellation[j].meshGroup.position;
            let GSPos = GroundStations[i].meshGroup.position;
            
            const d = Math.sqrt(Math.pow(satPos.x-GSPos.x,2)+Math.pow(satPos.y-GSPos.y,2)+Math.pow(satPos.z-GSPos.z,2));
            

            if(d<comDist * (earthRadius / 6371)){
                //This is the time during a communication opprtunity
                let satpos2 = findSatPos(Constellation[j].tleLine1, Constellation[j].tleLine2, {latitude: GroundStations[i].latitude, longitude: GroundStations[i].longitude, height: 0});
                let lookAngles = satpos2.lookAngles;
                let azimuth = Math.round(satellite.radiansToDegrees(lookAngles.azimuth),precision);
                let elevation = Math.round(satellite.radiansToDegrees(lookAngles.elevation),precision);
                const isLit = isMeshLitBySun(Constellation[j].meshGroup, earth, sunLight); //To check whether the satellite falls in the lit or shaded region
                const com = {time: now.toISOString(), sat: Constellation[j].name, GS: GroundStations[i].name, azimuth: azimuth, elevation: elevation, shaded: !isLit};
                
                let len = communication_opportunities.length;
                if(len == 0){
                    communication_opportunities.push(com);
                    addLog("Communication Opportunity: \nTime: " + com.time + " \nGround Station: " + GroundStations[i].name + " \nSatellite: "+ Constellation[j].name  + "\nAzimuth: " + com.azimuth + "\nElevation: "+com.elevation + "\nShaded: "+!isLit);
                } 
                else{
                    let com2 = communication_opportunities[len-1];
                    if(com2.sat != com.sat || com2.GS != com.GS){
                        communication_opportunities.push(com);
                        addLog("Communication Opportunity: \nTime: " + com.time + " \nGround Station: " + GroundStations[i].name + " \nSatellite: "+ Constellation[j].name + "\nAzimuth: " + com.azimuth + "\nElevation: "+ com.elevation + "\nShaded: "+!isLit);
                    } 
                }
            }
        }
    }
}


var collection_opportunities = [];
function trackCollection(){
    for(let i=0; i<subRegions.length; i++){
        for(let j=0; j<Constellation.length; j++){
            let satPos = Constellation[j].meshGroup.position;
            let rPos = subRegions[i].meshGroup.position;
            
            const d = Math.sqrt(Math.pow(satPos.x-rPos.x,2)+Math.pow(satPos.y-rPos.y,2)+Math.pow(satPos.z-rPos.z,2));
            
            if(d<comDist * (earthRadius / 6371)){
                let satpos2 = findSatPos(Constellation[j].tleLine1, Constellation[j].tleLine2, {latitude: subRegions[i].latitude, longitude: subRegions[i].longitude, height: 0});
                let lookAngles = satpos2.lookAngles;
                let azimuth = Math.round(satellite.radiansToDegrees(lookAngles.azimuth),precision);
                let elevation = Math.round(satellite.radiansToDegrees(lookAngles.elevation),precision);
                const isLit = isMeshLitBySun(Constellation[j].meshGroup, earth, sunLight); //To check whether the satellite falls in the lit or shaded region

                const com = {time: now.toISOString(), sat: Constellation[j].name, subRegion: subRegions[i].name, azimuth: azimuth, elevation: elevation, shaded: !isLit};
                
                let len = collection_opportunities.length;
                if(len == 0){
                    collection_opportunities.push(com);
                    addLog("Collection Opportunity: \nTime: " + com.time + " \nSubregion: " + subRegions[i].name + " \nSatellite: " + Constellation[j].name +"\nAzimuth: " + com.azimuth + "\nElevation: "+com.elevation + "\nShaded: "+!isLit);
                } 
                else{
                    let com2 = collection_opportunities[len-1];
                    if(com2.sat != com.sat || com2.subRegion != com.subRegion){
                        collection_opportunities.push(com);
                        addLog("Collection Opportunity: \nTime: " + com.time + " \nSubregion: " + subRegions[i].name + " \nSatellite: " + Constellation[j].name +"\nAzimuth: " + com.azimuth + "\nElevation: "+com.elevation + "\nShaded: "+!isLit);
                    } 
                }
            }
        }
    }
}


document.getElementById("communication-range").addEventListener("input",(event)=>{
    comDist = event.target.value;
    document.getElementById("communication-range-label").textContent = comDist + " KM";
});


var simulationButton = document.getElementById("start-simulation");
var extra_elevation_input = document.getElementById("extra-elevation")

simulationButton.addEventListener("click",(event)=>{
    if(currentMode!="simulation"){
        //Starting the simulation
        currentMode="simulation";
        extraElevation = 0;
        simulationButton.textContent = "Stop Simulation"
        extra_elevation_input.disabled = true;
        addLog("Simulation Started at " + now, "#a3ffe5");
        curr_start_time = now.toString();
        console.log(curr_start_time);
    }
    else{
        //Stopping the simulation
        currentMode="dafault";
        simulationButton.textContent = "Start Simulation"
        extra_elevation_input.disabled = false;
        extraElevation = extra_elevation_input.value / 100;
        addLog("Simulation Completed at " + now, "#a3ffe5");
        curr_end_time = now.toString();

        //Deep Clone: don't use structured clone
        //The Arrays are passing only the references, to have to do deep copy
        //Still need to change curr_start_time = now as now just holds a reference to the current time
        Experiments.push({
            index: exp_index, 
            startT: curr_start_time, 
            endT: curr_end_time, 
            comList: [], 
            colList: [], 
            currConstellation: [], 
            currGSList: []});
        
        for(let j=0; j<communication_opportunities.length; j++) Experiments[exp_index].comList.push({time: communication_opportunities[j].time, sat: communication_opportunities[j].sat, GS: communication_opportunities[j].GS, azimuth: communication_opportunities[j].azimuth, elevation: communication_opportunities[j].elevation, shaded: communication_opportunities[j].shaded})
        for(let j=0; j<collection_opportunities.length; j++) Experiments[exp_index].colList.push({time: collection_opportunities[j].time, sat: collection_opportunities[j].sat, subRegion: collection_opportunities[j].subRegion, azimuth: collection_opportunities[j].azimuth, elevation: collection_opportunities[j].elevation, shaded: collection_opportunities[j].shaded})
        for(let j=0; j<Constellation.length; j++) Experiments[exp_index].currConstellation.push({Sat_Name: Constellation[j].name, TLE_Line1: Constellation[j].tleLine1, TLE_Line2: Constellation[j].tleLine2})
        for(let j=0; j<GroundStations.length; j++) Experiments[exp_index].currGSList.push({GS_Name: GroundStations[j].name, Latitude: GroundStations[j].latitude, Longitude: GroundStations[j].longitude}) 
        exp_index+=1;
        
        var com_table;
        var col_table;
        if(communication_opportunities.length!=0){
            com_table = createTable(communication_opportunities);
            addLog("The table for communication opportunities is given", "#F8F9F9");
            addLog("", "#D1F2EB", com_table);
        }
        
        if(collection_opportunities.length!=0){
            col_table = createTable(collection_opportunities);
            addLog("The table for collection opportunities is given", "#F8F9F9");
            addLog("", "#b5e0b1", col_table);
        }

        //const tables = document.querySelectorAll('table');
        //TableUtils.exportTablesToCSV([com_table, col_table], 'tables.csv');
        communication_opportunities.splice(0,communication_opportunities.length);
        collection_opportunities.splice(0,collection_opportunities.length);
        //Alternative way to empty the array
        //while(communication_opportunities.length>0)communication_opportunities.pop();
    }
});

document.getElementById("viewResults").addEventListener("click",()=>{
    showResult();
});

//Function to show the successive experiments and results in a new tab
function showResult() {
    // Create the exp_res element and generate the sat_database table
    addLog("Compiling the results");
    let exp_res = document.createElement("div");

    const exporter_csv = document.createElement("button");
    exporter_csv.textContent = "Export as CSV";
    exporter_csv.id = "exporter_csv";
    exporter_csv.style.margin = "50px";
    exp_res.appendChild(exporter_csv);

    const br = document.createElement("br"); //Tobe used anywhere


    const exporter_xls = document.createElement("button");
    exporter_xls.textContent = "Export as Spreadsheet";
    exporter_xls.id = "exporter_xls";
    exporter_csv.style.margin = "50px";
    exp_res.appendChild(exporter_xls);


    let label1 = document.createElement('h3');
    label1.textContent = "Satellite Database";
    exp_res.appendChild(label1);

    let satDB_modified = [];
    for(let i=0; i<satDataBase.length; i++) satDB_modified.push({Sat_Name: satDataBase[i].name, TLE_Line1: satDataBase[i].tleLine1, TLE_Line2: satDataBase[i].tleLine2});
    let sat_database = createTable(satDB_modified); // Creates an HTML table and returns the table as an HTML element
    sat_database.setAttribute('name', 'Satellite Database');
    exp_res.appendChild(sat_database); // Append the table to the div

    for(let i=0; i<exp_index; i++){
        //Trying to create a CSV exporter
        
        let label2 = document.createElement('h2');
        label2.textContent = "Experiment-"+String(i+1); 
        exp_res.appendChild(label2);

        let label2b1 = document.createElement('h4');
        label2b1.textContent = " Start Time: " + String(Experiments[i].startT); 
        exp_res.appendChild(label2b1);

        

        let label2b2 = document.createElement('h4');
        label2b2.textContent = " End Time: " + String(Experiments[i].endT); 
        exp_res.appendChild(label2b2);
        
        let label2c = document.createElement('h3');
        label2c.textContent = "Constellation";
        exp_res.appendChild(label2c);
        

        if(Experiments[i].currConstellation.length!=0){
            var temp_const = createTable(Experiments[i].currConstellation);
            temp_const.setAttribute('name', 'Exp-'+String(i+1)+' Constellation');
            exp_res.appendChild(temp_const);
        }

        let label2d = document.createElement('h3');
        label2d.textContent = "Ground Stations"; 
        exp_res.appendChild(label2d);
        

        if(Experiments[i].currGSList.length!=0){
            var temp_GSList = createTable(Experiments[i].currGSList);
            temp_GSList.setAttribute('name', 'Exp-'+String(i+1)+' Ground Stations');
            exp_res.appendChild(temp_GSList);
        }
    
        let label3 = document.createElement('h3');
        label3.textContent = "Collection Opportunities";
        exp_res.appendChild(label3);

        if(Experiments[i].colList.length!=0){
            var temp_colList = createTable(Experiments[i].colList);
            temp_colList.setAttribute('name', 'Exp-'+String(i+1)+' Collection Opportunities');
            exp_res.appendChild(temp_colList);
        }

        let label4 = document.createElement('h3');
        label4.textContent = "Communication Opportunities";
        exp_res.appendChild(label4);

        if(Experiments[i].comList.length!=0){
            var temp_comList = createTable(Experiments[i].comList);
            temp_comList.setAttribute('name', 'Exp-'+String(i+1)+' Communication Opportunities');
            exp_res.appendChild(temp_comList);
        }
    }
    
    //exp_res = createTable(Experiments);
    // Get the outerHTML of the exp_res element (which contains the table)
    const exp_res_html = exp_res.outerHTML;

    // Open a new window
    const newWindow = window.open("", "_blank");

    // Dynamic HTML page generation for the Experiments and the Results
    const htmlContent = `
    <html>
        <head>
            <title>Result Page</title>
            <link rel="stylesheet" href="table_styles.css">
        </head>
        <body>
            <h1>Experiments and Results</h1>
            <div id="ExpResContainer">
                ${exp_res_html} <!-- Insert the serialized HTML directly -->
            </div>
        <script src="table_utils_generaized.js"> </script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>
        </body>
    </html>
    `;
    
    // Write the content to the new window
    newWindow.document.write(htmlContent);
    newWindow.document.close();
}



function createTable(data) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    thead.style.textAlign = "left";
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '20px';
    table.style.borderColor = "black"
    table.style.borderWidth = 10;

    // Create table header
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create table body
    data.forEach(item => {
        const row = document.createElement('tr');
        Object.values(item).forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

// addLog("Zoom Out the Page to 90% in case of any problem with the layout");

animate();


