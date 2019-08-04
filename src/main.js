/*
The MIT License (MIT)
Copyright (c) 2014 Chris Wilson
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = true;
var mediaStreamSource = null;
var count =0;
var i = 0;
var j = 0;
var array = [];
var stdarray = [];
var meanarray = [];
var F0buffer = [];
var counter_sustain = 0;
var vowel_array = [];
var t = 0;
var p = 0;
var mean;
var std ;
var flag_bajo = true;
var flag_alto = true;
var pitch;

window.onload = function() {
	audioContext = new AudioContext();
	MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/44000));	// corresponds to a 5kHz signal
	
	
	toggleLiveInput()

}


function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia = 
        	navigator.getUserMedia ||
        	navigator.webkitGetUserMedia ||
        	navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
	mediaStreamSource.connect( analyser );
	
    updatePitch();
}

function toggleLiveInput() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
		if (!window.cancelAnimationFrame)
			window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
    }
    getUserMedia(
    	{
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream);
}



var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array( buflen );

function autoCorrelate( buf, sampleRate ) {
	// Implements the ACF2+ algorithm
	var SIZE = buf.length;
	var rms = 0;

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var r1=0, r2=SIZE-1, thres=0.2;
	for (var i=0; i<SIZE/2; i++)
		if (Math.abs(buf[i])<thres) { r1=i; break; }
	for (var i=1; i<SIZE/2; i++)
		if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

	buf = buf.slice(r1,r2);
	SIZE = buf.length;

	var c = new Array(SIZE).fill(0);
	for (var i=0; i<SIZE; i++)
		for (var j=0; j<SIZE-i; j++)
			c[i] = c[i] + buf[j]*buf[j+i];

	var d=0; while (c[d]>c[d+1]) d++;
	var maxval=-1, maxpos=-1;
	for (var i=d; i<SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	var T0 = maxpos;

	var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
	a = (x1 + x3 - 2*x2)/2;
	b = (x3 - x1)/2;
	if (a) T0 = T0 - b/(2*a);

	return sampleRate/T0;
}

function updatePitch(time) {
	var cycles = new Array;
	analyser.getFloatTimeDomainData( buf );
	//console.log(buf)
	var ac = autoCorrelate( buf, audioContext.sampleRate );
	// TODO: Paint confidence meter on canvasElem here.

 	if (ac == -1) {
		
 	} else {
	 	
		pitch = Math.round(ac);

	}
}

exportToCsv = function() {
	var CsvString = "";
	array.forEach(function(RowItem, RowIndex) {

		CsvString += RowItem + ',';
	});
	CsvString
	CsvString = "data:application/csv," + encodeURIComponent(CsvString);
   var x = document.createElement("A");
   x.setAttribute("href", CsvString );
   x.setAttribute("download","somedata.csv");
   document.body.appendChild(x);
   x.click();
  }

window.setInterval(function(){
checkSustain();

}, 500/60);
  
function checkSustain(){
    if (counter_sustain < 1){
        updatePitch();
        F0buffer[counter_sustain] = pitch;
        counter_sustain += 1;
       
    }
    else{  
		mean = averagefun(F0buffer);
		//console.log(F0buffer)
		if (mean<65){
			p+=1;
			mean = "-------------";
			t = 0;	
			if (p==2){
					
				//console.clear();
				console.log(mean)
				
			}
			
		}
		else{
			
			if(t>61){
				std = averagefun(meanarray);

				p = 0;
				console.log(std)
				if (mean <std && flag_bajo){
					console.log("Bajo", mean);
					flag_bajo = false;
					flag_alto = true;
				}
				else if(mean>std && flag_alto){
					console.log("Alto", mean);
					flag_bajo = true;
					flag_alto = false;
				}
				
			}
			else{
				if (t>39){ 
					meanarray[t-40] = mean;
				}
			
			}
			t+=1;
			

			//console.log(t)
		}
        counter_sustain = 0;
        F0buffer = [];
        
    }
}











function standardDeviation(values){
	var avg = averagefun(values);
	
	var squareDiffs = values.map(function(value){
	  var diff = value - avg;
	  var sqrDiff = diff * diff;
	  return sqrDiff;
	});
	
	var avgSquareDiff = averagefun(squareDiffs);
  
	var stdDev = Math.sqrt(avgSquareDiff);
	return stdDev;
}
  
function averagefun(data){
var sum = data.reduce(function(sum, value){
	return sum + value;
}, 0);

var avg = sum / data.length;
return avg;
}

