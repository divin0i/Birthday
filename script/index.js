// Asset Preloader
let loadedAssets = 0;
const totalAssets = 2; // 1 image + 1 audio

function updateProgress() {
  loadedAssets++;
  const progress = (loadedAssets / totalAssets) * 100;
  document.getElementById("loadingProgress").style.width = progress + "%";
  document.getElementById("loadingText").textContent = `Loading... ${Math.round(
    progress
  )}%`;

  if (loadedAssets === totalAssets) {
    setTimeout(() => {
      document.getElementById("preloader").classList.add("loaded");
      document.getElementById("cardOverlay").classList.add("visible");
    }, 500);
  }
}

// Preload image
const img = new Image();
img.onload = updateProgress;
img.onerror = updateProgress;
img.src = "./img/1.jpg";

// Preload audio
const audio = document.getElementById("bgMusic");
audio.addEventListener("canplaythrough", updateProgress, { once: true });
audio.addEventListener("error", updateProgress, { once: true });
audio.load();

// Main variables
const card = document.getElementById("birthdayCard");
const cardOverlay = document.getElementById("cardOverlay");
const openBtn = document.getElementById("openBtn");
const timelineContainer = document.getElementById("timelineContainer");
const musicControl = document.getElementById("musicControl");
const musicIcon = document.getElementById("musicIcon");
const bgMusic = audio;
const blowInstruction = document.getElementById("blowInstruction");
const blownMessage = document.getElementById("blownMessage");
const cakeElement = document.getElementById("cake");

let musicPlaying = false;
let candlesBlown = false;
let candles = [];
let audioContext, analyser, microphone;

// Card flip animation
card.addEventListener("click", function () {
  if (!card.classList.contains("opened")) {
    card.classList.add("opened");
  }
});

// Open button - start the experience
openBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  cardOverlay.classList.add("hidden");

  setTimeout(() => {
    timelineContainer.classList.add("active");
    musicControl.style.display = "flex";

    // Reset and play music
    bgMusic.currentTime = 0;
    bgMusic
      .play()
      .then(() => {
        musicPlaying = true;
        musicIcon.textContent = "🔊";
      })
      .catch(() => {
        console.log("Music autoplay prevented");
      });

    startBalloons();
    startConfetti();
    startFireworks();
    animationTimeline();
  }, 800);
});

// Music control
musicControl.addEventListener("click", function () {
  if (musicPlaying) {
    bgMusic.pause();
    musicIcon.textContent = "🔇";
    musicPlaying = false;
  } else {
    bgMusic.play();
    musicIcon.textContent = "🔊";
    musicPlaying = true;
  }
});

// Create candles on cake
function createCandles() {
  const positions = [
    { left: 80, top: -20 },
    { left: 125, top: -20 },
    { left: 170, top: -20 },
  ];

  positions.forEach((pos) => {
    const candle = document.createElement("div");
    candle.className = "candle";
    candle.style.left = pos.left + "px";
    candle.style.top = pos.top + "px";

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    cakeElement.appendChild(candle);
    candles.push(candle);
  });
}

// Main GSAP Animation Timeline
function animationTimeline() {
  const textBoxChars = document.querySelector(".hbd-chatbox");
  const hbd = document.querySelector(".wish-hbd");

  if (textBoxChars) {
    textBoxChars.innerHTML = `<span>${textBoxChars.innerHTML
      .split("")
      .join("</span><span>")}</span>`;
  }

  if (hbd) {
    hbd.innerHTML = `<span>${hbd.innerHTML
      .split("")
      .join("</span><span>")}</span>`;
  }

  const ideaTextTrans = {
    opacity: 0,
    y: -20,
    rotationX: 5,
    skewX: "15deg",
  };

  const ideaTextTransLeave = {
    opacity: 0,
    y: 20,
    rotationY: 5,
    skewX: "-15deg",
  };

  tl = gsap.timeline();

  tl.to(".timeline-container", 0.6, { visibility: "visible" })
    .from(".section-one", 0.7, { opacity: 0, y: 10 })
    .from(".section-two", 0.4, { opacity: 0, y: 10 })
    .to(".section-one", 0.7, { opacity: 0, y: 10 }, "+=3")
    .to(".section-two", 0.7, { opacity: 0, y: 10 }, "-=1")
    .from(".section-three", 0.7, { opacity: 0, y: 10 })
    .to(".section-three", 0.7, { opacity: 0, y: 10 }, "+=2.5")
    .from(".section-four", 0.7, { scale: 0.2, opacity: 0 })
    .from(".fake-btn", 0.3, { scale: 1, opacity: 1 })
    .staggerTo(".hbd-chatbox span", 1.5, { visibility: "visible" }, 0.05)
    .to(
      ".fake-btn",
      0.1,
      {
        background: "linear-gradient(135deg, #FFD54F 0%, #FF4DA6 100%)",
        scale: 0.95,
        y: 2,
        boxShadow: "0 2px 5px rgba(255, 77, 166, 0.4)",
        ease: "power2.inOut",
      },
      "+=3.5"
    )
    .to(
      ".fake-btn",
      0.2,
      {
        scale: 1,
        y: 0,
        boxShadow: "0 5px 15px rgba(255, 77, 166, 0.4)",
        ease: "back.out(1.7)",
      },
      "+=0.1"
    )
    .to(".section-four", 0.5, { scale: 0.2, opacity: 0, y: -150 }, "+=1")
    .from(".idea-1", 0.7, ideaTextTrans)
    .to(".idea-1", 0.7, ideaTextTransLeave, "+=2")
    .from(".idea-2", 0.7, ideaTextTrans)
    .to(".idea-2", 0.7, ideaTextTransLeave, "+=2")
    .from(".idea-3", 0.7, ideaTextTrans)
    .to(".idea-3 strong", 0.5, {
      scale: 1.2,
      x: 10,
      boxShadow: "0 10px 30px rgba(255, 77, 166, 0.5)",
    })
    .to(".idea-3", 0.7, ideaTextTransLeave, "+=2")
    .from(".idea-4", 0.7, ideaTextTrans)
    .to(".idea-4", 0.7, ideaTextTransLeave, "+=2")
    .from(
      ".idea-5",
      0.7,
      {
        rotationX: 15,
        rotationZ: -10,
        skewY: "-5deg",
        y: 50,
        z: 10,
        opacity: 0,
      },
      "+=1"
    )
    .to(".idea-5", 0.7, { scale: 0.2, opacity: 0 }, "+=2")
    .staggerFrom(
      ".idea-6 span",
      0.8,
      {
        scale: 3,
        opacity: 0,
        rotation: 15,
      },
      0.2
    )
    .staggerTo(
      ".idea-6 span",
      0.8,
      {
        scale: 3,
        opacity: 0,
        rotation: -15,
      },
      0.2,
      "+=1.5"
    )
    .from(".section-six .profile-picture", 0.5, {
      scale: 3.5,
      opacity: 0,
      x: 25,
      y: -25,
      rotationZ: -45,
    })
    .from(".hat", 0.5, {
      x: -100,
      y: 350,
      rotation: -180,
      opacity: 0,
    })
    .staggerFrom(
      ".wish-hbd span",
      0.7,
      {
        opacity: 0,
        y: -50,
        rotation: 150,
        skewX: "30deg",
      },
      0.1
    )
    .staggerFromTo(
      ".wish-hbd span",
      0.7,
      {
        scale: 1.4,
        rotationY: 150,
      },
      {
        scale: 1,
        rotationY: 0,
        color: "#FF4DA6",
      },
      0.1,
      "party"
    )
    .from(
      ".wish h5",
      0.5,
      {
        opacity: 0,
        y: 10,
        skewX: "-15deg",
      },
      "party"
    )
    .to(".section-six", 0.5, { opacity: 0, y: 30 }, "+=2")
    .from(".section-cake", 0.7, { opacity: 0, scale: 0.5 })
    .add(() => {
      createCandles();
      startMicrophoneDetection();
    })
    .to(".section-cake", 0.5, { opacity: 0 }, "+=8")
    .to(".section-nine", 0.7, { opacity: 1 })
    .from(".section-nine p", 0.7, {
      opacity: 0,
      y: 20,
      scale: 0.5,
      stagger: { amount: 1, from: "start" },
      clearProps: "all",
    });

  document.getElementById("replay").addEventListener("click", () => {
    candlesBlown = false;
    candles.forEach((c) => c.classList.remove("out"));
    blowInstruction.style.display = "block";
    blownMessage.classList.remove("show");

    // Reset and play music again
    bgMusic.currentTime = 0;
    bgMusic
      .play()
      .then(() => {
        musicPlaying = true;
        musicIcon.textContent = "🔊";
      })
      .catch(() => {
        console.log("Music autoplay prevented");
      });

    tl.restart();
  });
}

// Microphone detection for blowing candles
let micStream = null;
let isListening = false;
let tl = null; // Will store the timeline reference

function stopMicrophoneDetection() {
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isListening = false;
}

// Check if we already have microphone permission
async function checkMicrophonePermission() {
  try {
    const permissions = await navigator.permissions.query({
      name: "microphone",
    });
    return permissions.state === "granted";
  } catch (err) {
    return false;
  }
}

async function startMicrophoneDetection() {
  if (candlesBlown || isListening) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setupClickFallback();
    return;
  }

  const hasPermission = await checkMicrophonePermission();

  if (hasPermission) {
    // Already have permission - go straight to detection
    requestMicPermission();
  } else {
    // Need permission - pause everything and show instruction
    pauseExperience();
    showPermissionRequest();
  }
}

function pauseExperience() {
  // Pause timeline
  if (tl && !tl.paused()) {
    tl.pause();
  }
  // Pause music
  if (musicPlaying) {
    bgMusic.pause();
    musicIcon.textContent = "🔇";
  }
}

function resumeExperience() {
  // Resume timeline
  if (tl && tl.paused()) {
    tl.resume();
  }
  // Resume music
  if (musicPlaying) {
    bgMusic.play();
    musicIcon.textContent = "🔊";
  }
}

function showPermissionRequest() {
  blowInstruction.textContent = "🎤 Click here to enable microphone...";
  blowInstruction.style.animation = "pulse 2s infinite";
  blowInstruction.addEventListener("click", requestMicPermission, {
    once: true,
  });
}

function requestMicPermission() {
  blowInstruction.textContent = "🎤 Requesting microphone access...";

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      micStream = stream;
      setupAudioAnalysis(stream);
      resumeExperience();
    })
    .catch((err) => {
      console.error("Microphone access denied:", err);
      setupClickFallback();
      resumeExperience();
    });
}

function setupClickFallback() {
  blowInstruction.textContent = "💡 Click the cake to blow out candles! 💡";
  blowInstruction.style.animation = "pulse 2s infinite";
  cakeElement.addEventListener("click", blowCandles, { once: true });
}

function setupAudioAnalysis(stream) {
  blowInstruction.textContent =
    "🌬️ Blow into your mic to blow out the candles! 🌬️";
  blowInstruction.style.animation = "pulse 2s infinite";

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 512;
    microphone.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    isListening = true;

    function detectBlow() {
      if (!isListening || candlesBlown) {
        stopMicrophoneDetection();
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      if (average > 35) {
        stopMicrophoneDetection();
        blowCandles();
        return;
      }

      requestAnimationFrame(detectBlow);
    }

    detectBlow();
  } catch (err) {
    console.error("Audio setup error:", err);
    stopMicrophoneDetection();
    setupClickFallback();
  }
}

function blowCandles() {
  if (candlesBlown) return;
  candlesBlown = true;

  stopMicrophoneDetection();

  candles.forEach((candle, index) => {
    setTimeout(() => {
      candle.classList.add("out");
    }, index * 200);
  });

  setTimeout(() => {
    blowInstruction.style.display = "none";
    blownMessage.classList.add("show");

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * (window.innerHeight / 2);
        createFirework(x, y);
      }, i * 400);
    }
  }, 800);
}

// Balloons effect
function startBalloons() {
  setInterval(() => {
    const balloon = document.createElement("div");
    balloon.className = "balloon";
    const balloons = ["🎈", "🎈", "🎈"];
    balloon.textContent = balloons[Math.floor(Math.random() * balloons.length)];
    balloon.style.left = Math.random() * 100 + "%";
    balloon.style.animationDuration = 12 + Math.random() * 8 + "s";
    balloon.style.animationDelay = Math.random() * 3 + "s";
    document.body.appendChild(balloon);
    setTimeout(() => balloon.remove(), 15000);
  }, 1200);
}

// Confetti effect
function startConfetti() {
  const colors = ["#FF4DA6", "#FFD54F", "#00E5FF"];
  setInterval(() => {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * 100 + "%";
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = 3 + Math.random() * 2 + "s";
    confetti.style.animationDelay = Math.random() + "s";
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 6000);
  }, 150);
}

// Fireworks effect
function createFirework(x, y) {
  const colors = ["#FF4DA6", "#FFD54F", "#00E5FF"];
  for (let i = 0; i < 40; i++) {
    const firework = document.createElement("div");
    firework.className = "firework";
    firework.style.left = x + "px";
    firework.style.top = y + "px";
    firework.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    const angle = (Math.PI * 2 * i) / 40;
    const velocity = 2 + Math.random() * 3;
    document.body.appendChild(firework);

    let posX = x,
      posY = y;
    let velocityX = Math.cos(angle) * velocity;
    let velocityY = Math.sin(angle) * velocity;

    const animation = setInterval(() => {
      velocityY += 0.15;
      posX += velocityX;
      posY += velocityY;
      firework.style.left = posX + "px";
      firework.style.top = posY + "px";

      if (posY > window.innerHeight) {
        clearInterval(animation);
        firework.remove();
      }
    }, 16);
  }
}

function startFireworks() {
  setInterval(() => {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * (window.innerHeight / 2);
    createFirework(x, y);
  }, 2500);
}
