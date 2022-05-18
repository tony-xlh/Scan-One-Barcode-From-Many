var barcodeReader;
var cameraEnhancer;
var interval;
var decoding = false;
var currentMode;
var EnumBarcodeFormat = Dynamsoft.DBR.EnumBarcodeFormat;
var mapFormat = new Map([
  [ "aztec", EnumBarcodeFormat.BF_AZTEC ],
  [ "codabar", EnumBarcodeFormat.BF_CODABAR],
  [ "code_11", EnumBarcodeFormat.BF_CODE_11 ],
  [ "code_39", EnumBarcodeFormat.BF_CODE_39 ],
  [ "code_93", EnumBarcodeFormat.BF_CODE_93 ],
  [ "code_128", EnumBarcodeFormat.BF_CODE_128 ],
  [ "data_matrix", EnumBarcodeFormat.BF_DATAMATRIX],
  [ "ean_8", EnumBarcodeFormat.BF_EAN_8 ],
  [ "ean_13", EnumBarcodeFormat.BF_EAN_13 ],
  [ "itf", EnumBarcodeFormat.BF_ITF ],
  [ "pdf417", EnumBarcodeFormat.BF_PDF417 ],
  [ "qr_code", EnumBarcodeFormat.BF_QR_CODE ],
  [ "micro_qr_code", EnumBarcodeFormat.BF_MICRO_QR ],
  [ "gs1_composite", EnumBarcodeFormat.BF_GS1_COMPOSITE],
  [ "gs1_databar", EnumBarcodeFormat.BF_GS1_DATABAR],
  [ "gs1_databar_expanded", EnumBarcodeFormat.BF_GS1_DATABAR_EXPANDED],
  [ "gs1_databar_expanded_stacked", EnumBarcodeFormat.BF_GS1_DATABAR_EXPANDED_STACKED],
  [ "gs1_databar_limited", EnumBarcodeFormat.BF_GS1_DATABAR_LIMITED],
  [ "gs1_databar_omnidirectional", EnumBarcodeFormat.BF_GS1_DATABAR_OMNIDIRECTIONAL],
  [ "gs1_databar_stacked", EnumBarcodeFormat.BF_GS1_DATABAR_STACKED],
  [ "gs1_databar_stacked_omnidirectional", EnumBarcodeFormat.BF_GS1_DATABAR_STACKED_OMNIDIRECTIONAL],
  [ "gs1_databar_truncated", EnumBarcodeFormat.BF_GS1_DATABAR_TRUNCATED],
  [ "maxi_code", EnumBarcodeFormat.BF_MAXICODE ],
  [ "upc_a", EnumBarcodeFormat.BF_UPC_A ],
  [ "upc_e", EnumBarcodeFormat.BF_UPC_E ]]
);

var mapFormatInv = new Map(
  Array.from(mapFormat).map(([key, val]) => [val, key])
);

var formatSelect = document.getElementById("barcodeFormat");
mapFormatInv.forEach(element => {
  var option = new Option();
  option.innerText = element;
  formatSelect.appendChild(option);
});

var modeSelect = document.getElementById("modeSelect");
modeSelect.onchange = function(e){
  console.log(e);
}

var svgOverlay = document.getElementsByTagName("svg")[0];
var startButton = document.getElementById("startButton");
startButton.onclick = async function() {
  svgOverlay.innerHTML = "";
  document.getElementsByClassName("home")[0].style.display = "none";
  setMode(modeSelect.selectedIndex);
  showSVG();
  await cameraEnhancer.open(true);
};



init();

async function init(){
  Dynamsoft.DBR.BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
  
  barcodeReader = await Dynamsoft.DBR.BarcodeReader.createInstance();

  cameraEnhancer = await Dynamsoft.DCE.CameraEnhancer.createInstance();
  //await cameraEnhancer.setUIElement("https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@2.3.1/dist/dce.ui.html");
  await cameraEnhancer.setUIElement(document.getElementById("cameraContainer"));
  cameraEnhancer.on("played", function (playCallBackInfo) {
    updateSVGViewBoxBasedOnVideoSize(playCallBackInfo.width,playCallBackInfo.height);
    startDecoding();  
  });
  cameraEnhancer.on("cameraClose", function() {
    stopDecoding();
    document.getElementsByClassName("home")[0].style.display = "";
  });
  
  document.getElementById("status").innerHTML = "";
  startButton.disabled = "";
  modeSelect.disabled = "";
}

function updateSVGViewBoxBasedOnVideoSize(width,height){
  svgOverlay.setAttribute("viewBox","0 0 "+width+" "+height);
}

function showSVG() {
  svgOverlay.style.display = "";
  //svgOverlay = document.createElement("svg");
  //svgOverlay.classList.add("overlay");
  //svgOverlay.classList.add("fullscreen");
  //document.getElementsByClassName("dce-video-container")[0].appendChild(svgOverlay);
}


function startDecoding() {
  if (interval) {
    clearInterval(interval);
  }
  decoding = false;
  interval = setInterval(captureFrameAndDecode,100);
}

function stopDecoding() {
  if (interval) {
    clearInterval(interval);
  }
  decoding = false;
}


async function captureFrameAndDecode(){
  if (decoding == true) {
    return;
  }
  var frame = cameraEnhancer.getFrame();
  if (frame) {
    decoding = true;
    var results = await barcodeReader.decode(frame);
    decoding = false;

    var forceUserInteraction = document.getElementById("forceUserInteractionChk").checked;
    if (currentMode != 2) {
      drawOverlay(results, frame);
    }
    if (results.length>0) {
      if (currentMode === 0) {
        if (forceUserInteraction === false) {
          stopAndDisplayResult(results[0].barcodeText);
        }else{
          showSelection();
        }
      }else if (currentMode === 1) {
        if (forceUserInteraction === false) {
          stopAndDisplayResult(results[0].barcodeText);
        }else{
          showSelection();
        }
      }else if (currentMode === 2) {
        console.log("regular expression");
        var matched = checkWithRegex(results);
        drawOverlay(results,frame);
        if (matched) {
          if (forceUserInteraction){
            showSelection();
          }else{
            stopAndDisplayResult(results[0].barcodeText);
          }
        }
      }else if (currentMode === 3) {
        showSelection();
      }
    }
  }
}

function showSelection(){
  stopDecoding();
  cameraEnhancer.pause();
  Toastify({
    text: "Barcodes found. Please select a barcode.",
    duration: 2000,
    gravity: "bottom",
    position: "center"
  }).showToast();
}


function drawOverlay(results, frame){
  svgOverlay.innerHTML = "";
  for (var i=0;i<results.length;i++) {
    var result = results[i];
    if (frame.isCropped == true) {
      var sx = frame.sx;
      var sy = frame.sy;
      updateLocalizationResults(sx,sy,result);
    }

    var lr = result.localizationResult;
    var points = getPointsData(lr);
    var polygon = document.createElementNS("http://www.w3.org/2000/svg","polygon");
    polygon.setAttribute("points",points);

    if (result["unwanted"] === true) {
      polygon.setAttribute("class","barcode-polygon-unwanted");
    }else{
      polygon.setAttribute("class","barcode-polygon");
    }

    polygon.setAttribute("text",result.barcodeText);
    
    polygon.onclick = function(event){
      console.log(event.target);
      stopAndDisplayResult(event.target.getAttribute("text"));
    }

    var text = document.createElementNS("http://www.w3.org/2000/svg","text");
    text.innerHTML = result.barcodeText;
    text.setAttribute("x",lr.x1);
    text.setAttribute("y",lr.y1);
    text.setAttribute("fill","white");
    text.setAttribute("font-size","40");
    text.style.textShadow = "0px 0px 5px purple";
    svgOverlay.append(polygon);
    svgOverlay.append(text);
  }
}

function checkWithRegex(results) {
  var matched = false;
  var expression = document.getElementById("regex").value;
  for (let index = 0; index < results.length; index++) {
    let result = results[index];
    if (result.barcodeText.search(expression) === -1) {
      result["unwanted"] = true;
    }else{
      matched = true;
    }
  }
  return matched;
}

function getPointsData(lr){
  var pointsData = lr.x1+","+lr.y1 + " ";
  pointsData = pointsData+ lr.x2+","+lr.y2 + " ";
  pointsData = pointsData+ lr.x3+","+lr.y3 + " ";
  pointsData = pointsData+ lr.x4+","+lr.y4;
  return pointsData;
}

function updateLocalizationResults(sx,sy,result){
  var lr = result.localizationResult;
  for (var index = 1; index < 5; index++) {
    lr["x"+index] += sx; 
    lr["y"+index] += sy;
  }
}

function stopAndDisplayResult(barcodeText){
  stopDecoding();
  document.getElementById("result").innerText = barcodeText;
  this.cameraEnhancer.close();
  document.getElementById("cameraContainer").style.display = "none";
}



/*
* scan mode: 
* 0: scan region
* 1: specify barcode formats
* 2: regular expression
* 3: user interaction
*/
async function setMode(mode){
  currentMode = mode;
  await resetSettings();
  if (mode == 0){ //set scan region
    cameraEnhancer.setScanRegion({regionLeft:15,regionTop:25,regionRight:85,regionBottom:65,regionMeasuredByPercentage:1});
  }else if (mode == 1) { //use barcode formats
    var selectedBarcodeFormat = formatSelect.selectedOptions[0].value;
    var settings = await barcodeReader.getRuntimeSettings();
    settings.barcodeFormatIds = mapFormat.get(selectedBarcodeFormat);
    await barcodeReader.updateRuntimeSettings(settings);
  }
}

async function resetSettings(){
  cameraEnhancer.setScanRegion({regionLeft:0,regionTop:0,regionRight:100,regionBottom:100,regionMeasuredByPercentage:1});
  var settings = await barcodeReader.getRuntimeSettings();
  settings.barcodeFormatIds = EnumBarcodeFormat.BF_ALL;
  await barcodeReader.updateRuntimeSettings(settings);
}
