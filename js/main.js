const video = document.getElementById('video');
const isScreenSmall = window.matchMedia('(max-width: 700px)');
let predictedAges = [];

// Loading the model
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    faceapi.nets.ageGenderNet.loadFromUri("/models")
]).then(startVideo);

function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => (video.srcObject = stream),
        err => console.error(err)
    );
}

// fixing the video width based on screen size 
function screenResize(isScreenSmall) {
    if (isScreenSmall.matches) {
        video.style.width = '320px';
    } else {
        video.style.width = '500px';
    }
}

screenResize(isScreenSmall);
isScreenSmall.addEventListener('change', screenResize);

// set tracking of Face found
let lastFaceDetectionTime = Date.now();
let faceDetected = false;

// Event Listener for the video
video.addEventListener('playing', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    let container = document.querySelector('.video-container');
    container.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => { 
        const detections = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender();

        if (detections) {
            if (!faceDetected) {
                console.log("Face detected!");
                faceDetected = true; // Update state
            }
            lastFaceDetectionTime = Date.now();

            let resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // Drawing the detection box and landmarks on canvas
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

            // Setting Values to the DOM
            if (resizedDetections && Object.keys(resizedDetections).length > 0) {
                const age = resizedDetections.age;
                const interpolatedAge = interpolatedAgePredictions(age);
                const gender = resizedDetections.gender;
                const expressions = resizedDetections.expressions;
                const maxValue = Math.max(...Object.values(expressions));
                const emotion = Object.keys(expressions).find(item => expressions[item] === maxValue);
    
                document.getElementById('age').innerText = `Age - ${interpolatedAge}`;
                document.getElementById('gender').innerText = `Gender - ${gender}`;
                document.getElementById('emotion').innerText = `Emotion - ${emotion}`;
            } 
        }
        
        const currentTime = Date.now();
        if (currentTime - lastFaceDetectionTime > 5000) {
            if (faceDetected) {
                console.log('No Face Detected for 5 seconds');
                faceDetected = false; // Update state
            }
        }
    }, 100);
});

// function to get age predictions
function interpolatedAgePredictions(age) {
    predictedAges = [age].concat(predictedAges).slice(0, 30);
    const avgPredictedAge = predictedAges.reduce((total , a) => total + a) / predictedAges.length;
    return avgPredictedAge;
}