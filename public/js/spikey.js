var LOVE = LOVE || {};

LOVE.AudioTHREE = LOVE.AudioTHREE || (function() {

	var SAMPLE_RATE = 40;
	var NUM_FREQ = 32;
	var WIDTH = 800;
	var HEIGHT = 600;
	var DEG_TO_RAD = Math.PI / 180;
	var RAD_TO_DEG = 180 / Math.PI;
	var RADIUS = 80;

	var $container;
	var player;
	var sphereContainer;
	var numVertices;
	var sample;
	var spectrum;
	var squares = [];
	var squareContainers = [];
	var pointsOnSphere;
	var bigSphere;
	var lowMat;
	var midMat;
	var highMat;
	var bigSphereMat;

	// set some camera attributes
	var VIEW_ANGLE = 45,
	    ASPECT = WIDTH / HEIGHT,
	    NEAR = 0.1,
	    FAR = 10000;

	var renderer, camera, scene;


	// http://www.softimageblog.com/archives/115
	// http://stackoverflow.com/questions/5531827/random-point-on-a-given-sphere
	// http://raksy.dyndns.org/randompoints.html

	function initTHREE() {

		// get dom element
		$container = $("#vis1");

		// init renderer / camera / scene
		renderer = new THREE.WebGLRenderer({antialias:true});
		camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
		scene = new THREE.Scene();

		// set start z position
		camera.position.z = 300;
		renderer.setSize(WIDTH, HEIGHT);
		$container.append(renderer.domElement);

		
		
		/*
			Init materials
		*/
		var strokeFillMat = [new THREE.MeshLambertMaterial({ color: 0xffffff, shading: THREE.FlatShading, opacity:0.3, vertexColors: THREE.VertexColors }), 
		new THREE.MeshBasicMaterial({ color: 0x7d7d7d, shading: THREE.FlatShading, wireframe: true, wireframeLinewidth:1, opacity:0.3, transparent: true })];
		
		lowMat = new THREE.MeshBasicMaterial({ color: 0xc2c2c2, wireframe:true, wireframeLinewidth:1, opacity:0.4, vertexColors:THREE.FaceColors});
		midMat = new THREE.MeshBasicMaterial({ color: 0xc2c2c2, wireframe:true, wireframeLinewidth:1.2, opacity:0.7, vertexColors:THREE.FaceColors});
		highMat = new THREE.MeshBasicMaterial({ color: 0x7d7d7d, shading: THREE.FlatShading, opacity:1, vertexColors: THREE.VertexColors });


		/*
			Init Objects
		*/

		// sphere container
		sphereContainer = new THREE.Object3D();

		// init central sphere geom
		var bigSphereGeom = new THREE.SphereGeometry(RADIUS*.8, 30, 30);

		// create the central sphere as a multi material object
		var bigSphere = THREE.SceneUtils.createMultiMaterialObject(bigSphereGeom, strokeFillMat);
		

		// define seg's ring's for small spheres
		var segments = 7, rings = 7;
		var s = 0;

		// get points around a sphere
		pointsOnSphere = getPointsOnSphere(NUM_FREQ);
		
		// Create a vector for rectangles to 'look' at.
		var ZERO = new THREE.Vector3();
		
		for(s; s < NUM_FREQ; ++s)
		{
			// add a new square
			addSquare(lowMat, s);

			// set initial position
			squareContainers[s].position.x = pointsOnSphere[s].x*RADIUS;
			squareContainers[s].position.y = pointsOnSphere[s].y*RADIUS;
			squareContainers[s].position.z = pointsOnSphere[s].z*RADIUS;

			// look at ZERO
			squareContainers[s].lookAt(ZERO);
		}

		// add stuff to scene
		scene.add(sphereContainer);
		sphereContainer.add(bigSphere);
		scene.add(camera);

		/*
			Create lights
		*/
		var light = new THREE.PointLight(0xffffff);

		// set light position
		light.position.x = 10;
		light.position.y = 50;
		light.position.z = 130;

		scene.add(light);
	}

	function addSquare(mat, i) {
		cube = new THREE.Mesh(new THREE.CubeGeometry(3,3,5,1,1,1), mat);
		cube.position.z = -2.5;

		var nullObj = new THREE.Object3D();
		nullObj.add(cube);

		squareContainers[i] = nullObj;
		squares[i] = cube;

		sphereContainer.add(nullObj);
	}

	// get points on sphere
	function getPointsOnSphere(n) {
		
    	var pts = [];
    	var inc = Math.PI * (3- Math.sqrt(5));
    	var off = 2/ n;
    	var y;
    	var r;
    	var phi;

    	for(var k=0; k < n; ++k) {
			y = k * off - 1 + (off / 2);
        	r = Math.sqrt(1 - y*y);
        	phi = k * inc;
        	pts[k] = {x:Math.cos(phi)*r, y:y, z:Math.sin(phi)*r};
    	}

    	return pts;
	}

	function updateGeometry() {

		var i = 0;
		var power = 0;

		for (i; i< NUM_FREQ; ++i) {

			var power = spectrum[i]/100;
			//var zTranslation = (power*100)-prevsquaresZ[i];
			//squares[i].translateZ( -zTranslation );

			if(power < 0.1) {
				squares[i].material = lowMat;

			} else if(power == 0.1 && power < 0.5) {
				squares[i].material = midMat;

			} else {
				squares[i].material = highMat;
			}

			squareContainers[i].scale.z = 1+(6*(power*2));
		}

	}

	function initAudio() {
		player = document.getElementById("track");
		player.play();
	}

	function render() {
		sample = getSampleAt(player.currentTime);
		spectrum = sample.d.split(",");

		var peakAvg = (sample.p.l + sample.p.r)/2;
		var topEnd = (spectrum[14]+spectrum[15]+spectrum[16])/3;

		updateGeometry();

		sphereContainer.rotation.y += (0.01*peakAvg)*DEG_TO_RAD;
		sphereContainer.rotation.x += (Math.min(0.002*topEnd, 10))*DEG_TO_RAD;
		

		var targScale = 1-(peakAvg/400);
		TweenMax.to(sphereContainer.scale, 0.01, {x:targScale, y:targScale, z:targScale, overwrite:2});

		renderer.render(scene, camera);
	}

	function animloop() {
		requestAnimFrame(animloop);
		render();
	};

	function getSampleAt(secs) {

		var i = 0;
		var b = 0;
		i = ((secs * 1000)/SAMPLE_RATE)	 >> 0;
		
		for(b; b < 10; ++b)
		{
			if(music[i]) return music[i];			
			i++;
		}
		
		return null;
	}

	var methods = {
		init:function() {

			$(".play").bind("click", (function(){
				
				initTHREE();
				initAudio();
				animloop();

				$container.hide();
				$(".play").fadeOut("slow");
				$container.fadeIn("slow");

			}));
		}
	};

	return methods;
})();