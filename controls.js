
var sat_list_visible = false;
var GS_list_visible = false;

document.getElementById('toggle-button').addEventListener('click', function() {
    var sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('visible');

    //Just adding for future styling
    //var toggle_button = document.getElementById('toggle-button');
    //toggle_button.classList.toggle('glow')
});


document.getElementById('updateGroundStations').addEventListener('click', function() {
    var groundStationsList = document.getElementById('GroundStationsList');
    groundStationsList.classList.toggle('visible');
});

document.getElementById('updateSat').addEventListener('click', function() {
    var sL = document.getElementById('satelliteList');
    sL.classList.toggle('visible');


    //Just for the visuals
    if(sat_list_visible==false){
        sat_list_visible = true;
        //document.getElementById("updateSat").style.backgroundColor = "Yellow";
    }
    else{
        sat_list_visible = false;
        //document.getElementById("updateSat").style.backgroundColor = "Default";
    }
});

document.getElementById('satDB').addEventListener('click', function() {
    var groundStationsList = document.getElementById('satelliteDB');
    groundStationsList.classList.toggle('visible');
});


const clearLogs = document.getElementById("clearLogs");
const outputList = document.getElementById("outputList");

clearLogs.addEventListener('click',(event)=>{
    while (outputList.firstChild) {
        outputList.removeChild(outputList.firstChild);
    }
});

function resizeCanvas() {
    const rightPanel = document.getElementById('right-panel');
    const canvasContainer = document.getElementById('canvasContainer');
    const drawingCanvas = document.getElementById('drawingCanvas');
    
    const rightPanelWidth = rightPanel.offsetWidth;
    
    // Set the container width and height
    canvasContainer.style.width = rightPanelWidth + 'px';
    canvasContainer.style.height = (rightPanelWidth / 2) + 'px';
    
    // Set the canvas width and height
    drawingCanvas.width = rightPanelWidth;
    drawingCanvas.height = rightPanelWidth / 2;

    //document.getElementById("outputList").style.height = canvasContainer.style.height - 200;
}

// Initial resize
resizeCanvas();

// Resize when window is resized
window.addEventListener('resize', resizeCanvas);

